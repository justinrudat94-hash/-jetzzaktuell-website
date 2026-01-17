import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  ticketId: string;
  type: 'ticket_created' | 'admin_response' | 'ticket_closed' | 'status_update' | 'auto_closed' | 'reopen';
  customMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ticketId, type, customMessage }: EmailRequest = await req.json();

    // Hole Ticket mit access_token
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        subject,
        description,
        category,
        status,
        created_at,
        access_token,
        closing_message,
        closed_at,
        last_admin_reply_at,
        customer_email
      `)
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email-Adresse bestimmen (entweder vom Profil oder customer_email)
    let userEmail = ticket.customer_email;
    let username = 'User';

    if (ticket.user_id) {
      const { data: ticketUser } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', ticket.user_id)
        .single();

      if (ticketUser?.email) {
        userEmail = ticketUser.email;
        username = ticketUser.username || 'User';
      }
    }

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'Email-Adresse nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hole Resend API Key
    const { data: resendKey } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service', 'resend')
      .eq('is_active', true)
      .single();

    if (!resendKey?.api_key) {
      return new Response(
        JSON.stringify({ error: 'Resend API Key nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Magic Link URL mit access_token (use WEB_URL for ticket system)
    // WICHTIG: Dies ist die Next.js Web-URL, NICHT die React Native App URL!
    const webUrl = Deno.env.get('WEB_URL') || Deno.env.get('VERCEL_URL')
      ? `https://${Deno.env.get('VERCEL_URL')}`
      : 'https://web-git-main-justin-rudats-projects.vercel.app';
    const magicLinkUrl = `${webUrl}/ticket/${ticket.access_token}`;

    // Hole letzte Antworten für Ticket-Closure Email
    let recentResponses = null;
    if (type === 'ticket_closed') {
      const { data: responses } = await supabase
        .from('ticket_responses')
        .select('message, is_admin_response, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(5);

      recentResponses = responses;
    }

    const emailContent = buildEmailContent(type, ticket, username, magicLinkUrl, customMessage, recentResponses);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jetzz Support <support@jetzzapp.com>',
        to: [userEmail],
        subject: emailContent.subject,
        html: emailContent.html,
        headers: {
          'X-Ticket-ID': ticketId,
        }
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API Error:', errorText);

      return new Response(
        JSON.stringify({ error: 'Email-Versand fehlgeschlagen', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email erfolgreich versendet',
        emailId: resendData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-ticket-email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildEmailContent(
  type: string,
  ticket: any,
  username: string,
  magicLinkUrl: string,
  customMessage?: string,
  recentResponses?: any[]
): { subject: string; html: string } {
  let subject = '';
  let html = '';

  const header = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #4F46E5; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Jetzz Support</h1>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  `;

  const footer = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px;">
          <p>Diese Email wurde automatisch generiert vom Jetzz Support-Team.</p>
          <p style="margin-top: 10px; color: #999;">Ticket-ID: #${ticket.id.slice(0, 8)}</p>
        </div>
      </div>
    </div>
  `;

  const actionButton = (text: string, url: string) => `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;

  switch (type) {
    case 'ticket_created':
      subject = `[Ticket #${ticket.id.slice(0, 8)}] ${ticket.subject}`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">Danke für deine Anfrage! Wir haben dein Support-Ticket erhalten und werden uns schnellstmöglich darum kümmern.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;"><strong>Betreff:</strong> ${ticket.subject}</p>
          <p style="margin: 10px 0 0 0; color: #666;"><strong>Kategorie:</strong> ${ticket.category}</p>
          <p style="margin: 10px 0 0 0; color: #666;"><strong>Ticket-ID:</strong> #${ticket.id.slice(0, 8)}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">Zum Chat mit deinem Support:</p>
        ${actionButton('JETZZ Chat', magicLinkUrl)}
        <p style="color: #999; font-size: 14px; line-height: 1.6;">Du kannst unbegrenzt Nachrichten senden und wir halten dich über alle Updates auf dem Laufenden.</p>
      ` + footer;
      break;

    case 'admin_response':
      subject = `Re: [Ticket #${ticket.id.slice(0, 8)}] ${ticket.subject}`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">Unser Support-Team hat auf dein Ticket geantwortet:</p>
        <div style="background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${customMessage || 'Siehe Ticket für Details'}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">Zum Chat mit deinem Support:</p>
        ${actionButton('JETZZ Chat', magicLinkUrl)}
      ` + footer;
      break;

    case 'ticket_closed':
      const responseTime = ticket.closed_at && ticket.created_at
        ? calculateResponseTime(ticket.created_at, ticket.closed_at)
        : 'Unbekannt';

      subject = `[Ticket #${ticket.id.slice(0, 8)}] Ticket wurde geschlossen`;
      html = header + `
        <h2 style="color: #10B981; margin-bottom: 10px;">Ticket erfolgreich gelöst!</h2>
        <p style="color: #666; line-height: 1.6;">Hallo ${username}!</p>
        <p style="color: #666; line-height: 1.6;">Dein Support-Ticket wurde geschlossen. Wir hoffen, dass wir dir helfen konnten!</p>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;"><strong>Betreff:</strong> ${ticket.subject}</p>
          <p style="margin: 10px 0 0 0; color: #666;"><strong>Antwortzeit:</strong> ${responseTime}</p>
        </div>

        ${ticket.closing_message ? `
          <div style="background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #666;"><strong>Abschlussnachricht:</strong></p>
            <p style="margin: 10px 0 0 0; color: #333; white-space: pre-wrap;">${ticket.closing_message}</p>
          </div>
        ` : ''}

        ${recentResponses && recentResponses.length > 0 ? `
          <div style="margin: 20px 0;">
            <p style="color: #666; margin-bottom: 10px;"><strong>Zusammenfassung:</strong></p>
            ${recentResponses.slice(0, 3).map(r => `
              <div style="background-color: #f9fafb; padding: 10px; margin: 8px 0; border-radius: 6px; font-size: 14px;">
                <p style="margin: 0; color: #333;">${r.message}</p>
                <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">${r.is_admin_response ? 'Support-Team' : 'Du'} • ${new Date(r.created_at).toLocaleDateString('de-DE')}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <p style="color: #666; line-height: 1.6; margin-top: 20px;">Hier kannst du deinen Chat anschauen:</p>
        ${actionButton('JETZZ Chat', magicLinkUrl)}

        <div style="background-color: #FEF3C7; padding: 12px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px;">
            <strong>Wie zufrieden warst du mit unserem Support?</strong><br>
            <span style="font-size: 24px; margin-top: 8px; display: inline-block;">
              😞 😐 😊 😄 🎉
            </span>
          </p>
        </div>
      ` + footer;
      break;

    case 'status_update':
      subject = `[Ticket #${ticket.id.slice(0, 8)}] Status-Update: ${ticket.status}`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">Dein Ticket-Status wurde aktualisiert:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;"><strong>Neuer Status:</strong> ${getStatusLabel(ticket.status)}</p>
          <p style="margin: 10px 0 0 0; color: #666;"><strong>Betreff:</strong> ${ticket.subject}</p>
        </div>
        ${customMessage ? `<p style="color: #666; line-height: 1.6;">${customMessage}</p>` : ''}
        ${actionButton('Ticket öffnen', magicLinkUrl)}
      ` + footer;
      break;

    case 'auto_closed':
      subject = `[Ticket #${ticket.id.slice(0, 8)}] Ticket automatisch geschlossen`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">Dein Support-Ticket wurde automatisch geschlossen, da es 48 Stunden nach der Lösung keine weitere Antwort gab.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;"><strong>Betreff:</strong> ${ticket.subject}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">Hier kannst du deinen Chat anschauen:</p>
        ${actionButton('JETZZ Chat', magicLinkUrl)}
      ` + footer;
      break;

    case 'reopen':
      subject = `Re: [Ticket #${ticket.id.slice(0, 8)}] ${ticket.subject}`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">Dein Ticket wurde wieder geöffnet. Wir werden uns schnellstmöglich darum kümmern.</p>
        ${customMessage ? `<p style="color: #666; line-height: 1.6;">${customMessage}</p>` : ''}
        ${actionButton('Ticket öffnen', magicLinkUrl)}
      ` + footer;
      break;

    default:
      subject = `[Ticket #${ticket.id.slice(0, 8)}] ${ticket.subject}`;
      html = header + `
        <h2 style="color: #333; margin-bottom: 10px;">Hallo ${username}!</h2>
        <p style="color: #666; line-height: 1.6;">${customMessage || 'Update zu deinem Support-Ticket'}</p>
        ${actionButton('Ticket öffnen', magicLinkUrl)}
      ` + footer;
  }

  return { subject, html };
}

function calculateResponseTime(createdAt: string, closedAt: string): string {
  const created = new Date(createdAt);
  const closed = new Date(closedAt);
  const diffMs = closed.getTime() - created.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 1) {
    return `${minutes} Minuten`;
  } else if (hours < 24) {
    return `${hours} Stunden`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} Tag${days > 1 ? 'e' : ''}`;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'open': 'Offen',
    'in_progress': 'In Bearbeitung',
    'waiting': 'Wartet auf Antwort',
    'resolved': 'Gelöst',
    'closed': 'Geschlossen'
  };
  return labels[status] || status;
}