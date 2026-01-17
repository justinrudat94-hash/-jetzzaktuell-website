import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DunningEmailData {
  firstName: string;
  lastName: string;
  invoiceNumber: string;
  amountDue: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  originalDueDate: string;
  dunningNumber: string;
  level: 1 | 2 | 3;
}

function getDunningEmailTemplate(level: 1 | 2 | 3, data: DunningEmailData) {
  const templates = {
    1: {
      subject: `1. Zahlungserinnerung - Rechnung ${data.invoiceNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Zahlungserinnerung</h1>
      <p style="margin: 5px 0 0 0; color: #666;">Mahnnummer: ${data.dunningNumber}</p>
    </div>
    <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>
    <p>wir haben festgestellt, dass die folgende Rechnung zum Fälligkeitsdatum noch nicht beglichen wurde:</p>
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr><td><strong>Rechnungsnummer:</strong></td><td>${data.invoiceNumber}</td></tr>
        <tr><td><strong>Offener Betrag:</strong></td><td>${(data.amountDue / 100).toFixed(2)} €</td></tr>
        <tr><td><strong>Mahngebühr:</strong></td><td>${(data.lateFee / 100).toFixed(2)} €</td></tr>
        <tr style="border-top: 2px solid #ddd;"><td><strong>Gesamtbetrag:</strong></td><td style="font-size: 24px; font-weight: bold; color: #ffc107;">${(data.totalAmount / 100).toFixed(2)} €</td></tr>
      </table>
    </div>
    <p><strong>Neue Zahlungsfrist: ${new Date(data.dueDate).toLocaleDateString('de-DE')}</strong></p>
    <center><a href="{{PAYMENT_LINK}}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Jetzt bezahlen</a></center>
    <p>Mit freundlichen Grüßen<br>Ihr Jetzz-Team</p>
  </div>
</body>
</html>`,
    },
    2: {
      subject: `2. Mahnung - Rechnung ${data.invoiceNumber} - Bitte umgehend begleichen`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ff9800; padding: 20px; border-radius: 8px; margin-bottom: 30px; color: white;">
      <h1 style="margin: 0;">2. Mahnung</h1>
      <p style="margin: 5px 0 0 0;">Mahnnummer: ${data.dunningNumber}</p>
    </div>
    <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>
    <p><strong>trotz unserer ersten Zahlungserinnerung ist bis heute kein Zahlungseingang erfolgt.</strong></p>
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr><td><strong>Rechnungsnummer:</strong></td><td>${data.invoiceNumber}</td></tr>
        <tr><td><strong>Ursprünglicher Betrag:</strong></td><td>${(data.amountDue / 100).toFixed(2)} €</td></tr>
        <tr><td><strong>Mahngebühren:</strong></td><td>${(data.lateFee / 100).toFixed(2)} €</td></tr>
        <tr style="border-top: 2px solid #ddd;"><td><strong>Gesamtforderung:</strong></td><td style="font-size: 24px; font-weight: bold; color: #ff9800;">${(data.totalAmount / 100).toFixed(2)} €</td></tr>
      </table>
    </div>
    <div style="background-color: #ff9800; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; font-weight: bold;">
      ⚠️ WICHTIG: Zahlungsfrist bis ${new Date(data.dueDate).toLocaleDateString('de-DE')}
    </div>
    <center><a href="{{PAYMENT_LINK}}" style="display: inline-block; padding: 12px 30px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">JETZT BEZAHLEN</a></center>
    <p>Mit freundlichen Grüßen<br>Ihr Jetzz-Team</p>
  </div>
</body>
</html>`,
    },
    3: {
      subject: `LETZTE MAHNUNG - Rechnung ${data.invoiceNumber} - Inkasso-Androhung`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f44336; padding: 20px; border-radius: 8px; margin-bottom: 30px; color: white;">
      <h1 style="margin: 0;">⚠️ LETZTE MAHNUNG</h1>
      <h2 style="margin: 10px 0 0 0; font-weight: normal;">Vor Inkasso-Übergabe</h2>
      <p style="margin: 5px 0 0 0;">Mahnnummer: ${data.dunningNumber}</p>
    </div>
    <p>Sehr geehrte/r ${data.firstName} ${data.lastName},</p>
    <p style="font-size: 16px;"><strong>Trotz mehrfacher Aufforderung ist die Zahlung ausgeblieben. Dies ist unsere letzte Mahnung vor Einschaltung eines Inkassobüros.</strong></p>
    <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #f44336;">
      <table style="width: 100%;">
        <tr><td><strong>Rechnungsnummer:</strong></td><td>${data.invoiceNumber}</td></tr>
        <tr><td><strong>Hauptforderung:</strong></td><td>${(data.amountDue / 100).toFixed(2)} €</td></tr>
        <tr><td><strong>Mahngebühren:</strong></td><td>${(data.lateFee / 100).toFixed(2)} €</td></tr>
        <tr style="border-top: 3px solid #f44336;"><td><strong style="font-size: 18px;">GESAMTFORDERUNG:</strong></td><td style="font-size: 28px; font-weight: bold; color: #f44336;">${(data.totalAmount / 100).toFixed(2)} €</td></tr>
      </table>
    </div>
    <div style="background-color: #f44336; color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0;">🚨 KRITISCHE ZAHLUNGSFRIST</h3>
      <p style="font-size: 18px; margin: 10px 0;"><strong>Bis spätestens: ${new Date(data.dueDate).toLocaleDateString('de-DE')}</strong></p>
      <p style="margin-bottom: 0;">Nach Ablauf dieser Frist übergeben wir den Fall ohne weitere Ankündigung an ein Inkassobüro!</p>
    </div>
    <center><a href="{{PAYMENT_LINK}}" style="display: inline-block; padding: 15px 40px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 18px;">SOFORT BEZAHLEN</a></center>
    <p style="font-weight: bold;">Mit freundlichen Grüßen<br>Ihr Jetzz-Team<br>Forderungsmanagement</p>
  </div>
</body>
</html>`,
    },
  };

  return templates[level];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { dunningCaseId, level } = await req.json();

    if (!dunningCaseId || !level) {
      return new Response(
        JSON.stringify({ error: "Missing dunningCaseId or level" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dunningCase, error: caseError } = await supabase
      .from("dunning_cases")
      .select(`
        *,
        premium_subscriptions!inner(
          stripe_subscription_id,
          plan,
          stripe_customer_id
        ),
        profiles!inner(
          email,
          first_name,
          last_name
        )
      `)
      .eq("id", dunningCaseId)
      .single();

    if (caseError || !dunningCase) {
      return new Response(
        JSON.stringify({ error: "Dunning case not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invoice } = await supabase
      .from("stripe_invoices")
      .select("hosted_invoice_url, invoice_number")
      .eq("subscription_id", dunningCase.subscription_id)
      .order("invoice_created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentDeadline = new Date();
    paymentDeadline.setDate(paymentDeadline.getDate() + 14);

    const lateFees = {
      1: 500,
      2: 1500,
      3: 3000,
    };

    const emailData: DunningEmailData = {
      firstName: dunningCase.profiles.first_name,
      lastName: dunningCase.profiles.last_name,
      invoiceNumber: invoice?.invoice_number || dunningCase.premium_subscriptions.stripe_subscription_id,
      amountDue: dunningCase.principal_amount,
      lateFee: lateFees[level as keyof typeof lateFees],
      totalAmount: dunningCase.principal_amount + lateFees[level as keyof typeof lateFees],
      dueDate: paymentDeadline.toISOString(),
      originalDueDate: dunningCase.created_at,
      dunningNumber: `MAHN-${dunningCase.id.substring(0, 8).toUpperCase()}`,
      level: level as 1 | 2 | 3,
    };

    const template = getDunningEmailTemplate(level, emailData);
    const paymentLink = invoice?.hosted_invoice_url || `${supabaseUrl}/payment-required`;
    template.html = template.html.replace(/\{\{PAYMENT_LINK\}\}/g, paymentLink);

    const { error: emailError } = await supabase.functions.invoke("send-email-notification", {
      body: {
        to: dunningCase.profiles.email,
        subject: template.subject,
        html: template.html,
      },
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
    }

    const { error: letterError } = await supabase.from("dunning_letters").insert({
      dunning_case_id: dunningCaseId,
      user_id: dunningCase.user_id,
      subscription_id: dunningCase.subscription_id,
      dunning_level: level,
      letter_number: emailData.dunningNumber,
      amount_claimed: emailData.totalAmount,
      late_fee: emailData.lateFee,
      interest_amount: 0,
      payment_deadline: paymentDeadline.toISOString(),
      sent_via: "email",
      email_delivered: !emailError,
      email_error: emailError ? JSON.stringify(emailError) : null,
    });

    if (letterError) {
      console.error("Failed to create letter record:", letterError);
    }

    const updates: any = {
      dunning_level: level,
      late_fees: emailData.lateFee,
      total_amount: emailData.totalAmount,
      next_action_date: level < 3 ? paymentDeadline.toISOString() : null,
    };

    if (level === 1) {
      updates.first_dunning_sent_at = new Date().toISOString();
    } else if (level === 2) {
      updates.second_dunning_sent_at = new Date().toISOString();
    } else if (level === 3) {
      updates.third_dunning_sent_at = new Date().toISOString();
    }

    await supabase.from("dunning_cases").update(updates).eq("id", dunningCaseId);

    return new Response(
      JSON.stringify({
        success: true,
        letterNumber: emailData.dunningNumber,
        emailSent: !emailError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating dunning letter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
