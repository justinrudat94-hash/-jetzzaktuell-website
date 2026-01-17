import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResendWebhookPayload {
  type: string;
  data: {
    to: string[];
    from: string;
    subject: string;
    html?: string;
    text?: string;
    reply_to?: string;
    headers?: Record<string, string>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET') || 'resend-webhook-secret';
    const signature = req.headers.get('X-Resend-Signature');

    if (signature !== webhookSecret) {
      console.warn('Invalid webhook signature');
    }

    const payload: ResendWebhookPayload = await req.json();

    if (payload.type !== 'email.received') {
      return new Response(
        JSON.stringify({ success: true, message: 'Event nicht relevant' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const replyToAddress = payload.data.reply_to || extractReplyTo(payload.data.to);
    if (!replyToAddress || !replyToAddress.includes('ticket+')) {
      return new Response(
        JSON.stringify({ success: true, message: 'Keine Ticket-Reply-Adresse' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ticketId = extractTicketId(replyToAddress);
    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Ticket-ID nicht gefunden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: emailTracking } = await supabase
      .from('ticket_email_tracking')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();

    if (!emailTracking) {
      return new Response(
        JSON.stringify({ error: 'Email-Tracking nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, user_id, status, reopened_count')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = payload.data.text || stripHTML(payload.data.html || '');
    const cleanedContent = cleanEmailContent(emailContent);

    if (ticket.status === 'closed') {
      const { error: reopenError } = await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          reopened_count: (ticket.reopened_count || 0) + 1,
          last_user_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (reopenError) {
        console.error('Error reopening ticket:', reopenError);
      }

      await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          user_id: ticket.user_id,
          is_admin_response: true,
          message: 'Ticket wurde automatisch wieder geöffnet, da der User geantwortet hat.'
        });
    } else {
      await supabase
        .from('support_tickets')
        .update({
          last_user_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          auto_close_scheduled_at: null
        })
        .eq('id', ticketId);
    }

    const { error: responseError } = await supabase
      .from('ticket_responses')
      .insert({
        ticket_id: ticketId,
        user_id: ticket.user_id,
        is_admin_response: false,
        message: cleanedContent
      });

    if (responseError) {
      console.error('Error creating ticket response:', responseError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Antwort' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('ticket_email_tracking')
      .update({
        email_count: emailTracking.email_count + 1,
        delivery_status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', emailTracking.id);

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(10);

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        notification_type: 'ticket_reply',
        title: 'Neue Ticket-Antwort',
        message: `User hat auf Ticket #${ticketId.slice(0, 8)} geantwortet`,
        data: { ticket_id: ticketId },
        priority: 3
      }));

      await supabase
        .from('in_app_notifications')
        .insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email-Antwort erfolgreich verarbeitet',
        ticketId,
        wasReopened: ticket.status === 'closed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-ticket-email-reply:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractReplyTo(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    if (addr.includes('ticket+')) {
      return addr;
    }
  }
  return null;
}

function extractTicketId(email: string): string | null {
  const match = email.match(/ticket\+([a-f0-9-]+)@/);
  return match ? match[1] : null;
}

function stripHTML(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEmailContent(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('On ') && trimmed.includes('wrote:')) break;
    if (trimmed.startsWith('Am ') && trimmed.includes('schrieb')) break;
    if (trimmed.includes('Diese Email wurde automatisch generiert')) break;

    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  }

  return cleanedLines.join('\n').trim();
}
