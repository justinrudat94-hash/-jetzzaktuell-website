import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET') || 'auto-close-tickets-cron';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid cron secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ticketsToClose, error: fetchError } = await supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        subject,
        status,
        auto_close_scheduled_at,
        resolved_at,
        last_admin_reply_at,
        last_customer_reply_at
      `)
      .eq('status', 'resolved')
      .not('auto_close_scheduled_at', 'is', null)
      .lte('auto_close_scheduled_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching tickets to close:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Abrufen der Tickets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ticketsToClose || ticketsToClose.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Keine Tickets zum Schließen gefunden',
          closedCount: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let closedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];
    const skipped: any[] = [];

    for (const ticket of ticketsToClose) {
      try {
        // Validierung: Admin muss geantwortet haben
        if (!ticket.last_admin_reply_at) {
          console.log(`Skipping ticket ${ticket.id}: No admin reply`);
          skipped.push({
            ticketId: ticket.id,
            reason: 'Kein Admin-Reply vorhanden'
          });
          skippedCount++;
          continue;
        }

        // Validierung: Kunde hat NACH Admin nicht mehr geantwortet
        if (ticket.last_customer_reply_at && ticket.last_admin_reply_at) {
          const customerReplyTime = new Date(ticket.last_customer_reply_at).getTime();
          const adminReplyTime = new Date(ticket.last_admin_reply_at).getTime();

          if (customerReplyTime > adminReplyTime) {
            console.log(`Skipping ticket ${ticket.id}: Customer replied after admin`);
            skipped.push({
              ticketId: ticket.id,
              reason: 'Kunde hat nach Admin-Antwort geantwortet'
            });
            skippedCount++;
            continue;
          }
        }

        const { data: user } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', ticket.user_id)
          .single();

        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({
            status: 'closed',
            updated_at: new Date().toISOString(),
            auto_close_scheduled_at: null
          })
          .eq('id', ticket.id);

        if (updateError) {
          errors.push({ ticketId: ticket.id, error: updateError.message });
          continue;
        }

        await supabase
          .from('ticket_responses')
          .insert({
            ticket_id: ticket.id,
            user_id: ticket.user_id,
            is_admin_response: true,
            message: 'Dieses Ticket wurde automatisch geschlossen, da es 48 Stunden nach der Lösung keine weitere Antwort gab. Falls dein Problem weiterhin besteht, kannst du gerne ein neues Ticket erstellen.'
          });

        await supabase
          .from('in_app_notifications')
          .insert({
            user_id: ticket.user_id,
            notification_type: 'ticket_closed',
            title: 'Support-Ticket geschlossen',
            message: `Dein Ticket "${ticket.subject}" wurde automatisch geschlossen.`,
            data: { ticket_id: ticket.id },
            priority: 2
          });

        if (user?.email) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-ticket-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ticketId: ticket.id,
                type: 'auto_closed'
              })
            });
          } catch (emailError) {
            console.error('Failed to send email for ticket:', ticket.id, emailError);
          }
        }

        closedCount++;

      } catch (ticketError) {
        console.error('Error processing ticket:', ticket.id, ticketError);
        errors.push({ ticketId: ticket.id, error: ticketError.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${closedCount} Tickets automatisch geschlossen, ${skippedCount} übersprungen`,
        closedCount,
        skippedCount,
        totalProcessed: ticketsToClose.length,
        skipped: skipped.length > 0 ? skipped : undefined,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-close-tickets:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
