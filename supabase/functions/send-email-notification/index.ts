import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailNotification {
  id: string;
  user_id: string;
  notification_type: string;
  email_to: string;
  subject: string;
  data: Record<string, any>;
}

// Email templates
const EMAIL_TEMPLATES: Record<string, (data: any) => string> = {
  registration_success: (data) => `
    <h1>Willkommen bei JETZZ! 🎉</h1>
    <p>Hallo ${data.username || 'User'},</p>
    <p>Deine Registrierung war erfolgreich! Du kannst jetzt loslegen:</p>
    <ul>
      <li>Events entdecken</li>
      <li>Livestreams schauen</li>
      <li>Eigene Events erstellen</li>
    </ul>
    <p>Viel Spaß!</p>
  `,

  phone_verified: (data) => `
    <h1>Telefonnummer verifiziert ✅</h1>
    <p>Deine Telefonnummer wurde erfolgreich verifiziert!</p>
    <p>Du hast jetzt Zugriff auf alle Features von JETZZ.</p>
  `,

  payout_requested: (data) => `
    <h1>Auszahlung beantragt 💰</h1>
    <p>Deine Auszahlungsanfrage wurde eingereicht:</p>
    <ul>
      <li><strong>Betrag:</strong> ${data.amount_eur?.toFixed(2)} €</li>
      <li><strong>Netto (nach Gebühren):</strong> ${data.net_amount_eur?.toFixed(2)} €</li>
    </ul>
    <p>Wir prüfen deine Anfrage und melden uns in Kürze!</p>
  `,

  payout_completed: (data) => `
    <h1>Auszahlung abgeschlossen ✅</h1>
    <p>Gute Nachrichten! Deine Auszahlung wurde bearbeitet:</p>
    <ul>
      <li><strong>Betrag:</strong> ${data.amount_eur?.toFixed(2)} €</li>
    </ul>
    <p>Das Geld sollte in 2-5 Werktagen auf deinem Konto sein.</p>
  `,

  account_suspended: (data) => `
    <h1>⚠️ Account gesperrt</h1>
    <p>Dein JETZZ Account wurde vorübergehend gesperrt.</p>
    <p><strong>Grund:</strong> ${data.reason}</p>
    <p><strong>Dauer:</strong> ${data.duration_days} Tage (bis ${new Date(data.until).toLocaleDateString('de-DE')})</p>
    <p>Bei Fragen wende dich bitte an unseren Support.</p>
  `,

  profile_picture_rejected: (data) => `
    <h1>Profilbild wird geprüft</h1>
    <p>Dein ${data.image_type === 'profile_picture' ? 'Profilbild' : 'Banner'} wird von unserem Team geprüft.</p>
    <p><strong>Grund:</strong> ${data.reason || 'Automatische Überprüfung'}</p>
    <p>Wir melden uns in Kürze!</p>
  `,

  gdpr_export_ready: (data) => `
    <h1>Deine Daten sind bereit</h1>
    <p>Dein Daten-Export ist fertig!</p>
    <p><a href="${data.download_url}">Jetzt herunterladen</a></p>
    <p><strong>Hinweis:</strong> Der Link ist 7 Tage gültig.</p>
  `,

  suspicious_login: (data) => `
    <h1>🔒 Neuer Login von unbekanntem Gerät</h1>
    <p>Wir haben einen Login von einem unbekannten Gerät festgestellt:</p>
    <ul>
      <li><strong>Standort:</strong> ${data.city || 'Unbekannt'}, ${data.country || 'Unbekannt'}</li>
      <li><strong>Zeit:</strong> ${new Date(data.timestamp).toLocaleString('de-DE')}</li>
    </ul>
    <p>Warst du das? Falls nicht, ändere bitte sofort dein Passwort!</p>
  `,

  id_verification_required: (data) => `
    <h1>ID-Verifizierung erforderlich</h1>
    <p>Um Auszahlungen über ${data.threshold_eur} € zu erhalten, musst du deine Identität verifizieren.</p>
    <p><a href="${data.verification_url}">Jetzt verifizieren</a></p>
  `,
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Resend API key - REDEPLOYED TO LOAD SECRETS
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    // Get pending email notifications (limit to 10 at a time)
    const { data: notifications, error: fetchError } = await supabase
      .from('email_notifications_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Process each notification
    for (const notification of notifications as EmailNotification[]) {
      try {
        // Get email template
        const templateFn = EMAIL_TEMPLATES[notification.notification_type];
        if (!templateFn) {
          throw new Error(`Unknown notification type: ${notification.notification_type}`);
        }

        const emailBody = templateFn(notification.data);

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'JETZZ <noreply@jetzzapp.com>',
            to: [notification.email_to],
            subject: notification.subject,
            html: emailBody,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const emailData = await emailResponse.json();

        // Mark as sent
        await supabase
          .from('email_notifications_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        results.push({
          id: notification.id,
          status: 'sent',
          email_id: emailData.id,
        });
      } catch (error) {
        console.error(`Failed to send email ${notification.id}:`, error);

        // Increment retry count
        await supabase
          .from('email_notifications_queue')
          .update({
            retry_count: notification.data.retry_count + 1,
            failed_reason: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', notification.id);

        results.push({
          id: notification.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-email-notification:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});