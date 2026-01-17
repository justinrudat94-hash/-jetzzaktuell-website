import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateTicketPaymentRequest {
  userId: string;
  eventId: string;
  ticketId: string;
  quantity: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const { userId, eventId, ticketId, quantity }: CreateTicketPaymentRequest = await req.json();

    if (!userId || !eventId || !ticketId || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ticket } = await supabase
      .from('event_tickets')
      .select('*, events(title, user_id)')
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .single();

    if (!ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ticket.available_quantity < quantity) {
      return new Response(
        JSON.stringify({ error: 'Not enough tickets available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalAmount = ticket.price * quantity;

    const { data: organizer } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', ticket.events.user_id)
      .single();

    if (!organizer) {
      return new Response(
        JSON.stringify({ error: 'Event organizer has not set up payment processing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platformFee = Math.round(totalAmount * 0.05);
    const stripeFee = Math.round((totalAmount * 0.029) + 30);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      application_fee_amount: platformFee + stripeFee,
      transfer_data: {
        destination: organizer.stripe_account_id,
      },
      metadata: {
        user_id: userId,
        event_id: eventId,
        ticket_id: ticketId,
        quantity: quantity.toString(),
        type: 'ticket_purchase',
      },
      description: `${quantity}x ${ticket.name} - ${ticket.events.title}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        platformFee: platformFee,
        stripeFee: stripeFee,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-ticket-payment:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
