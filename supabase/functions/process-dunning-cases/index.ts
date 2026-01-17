import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      newCasesCreated: 0,
      casesEscalated: 0,
      casesForwardedToCollection: 0,
      errors: [] as string[],
    };

    const { data: pastDueSubscriptions, error: subError } = await supabase
      .from("premium_subscriptions")
      .select(`
        id,
        user_id,
        status,
        amount,
        current_period_end,
        profiles!inner(email, first_name, last_name)
      `)
      .eq("status", "past_due")
      .eq("is_paused", false);

    if (subError) throw subError;

    for (const subscription of pastDueSubscriptions || []) {
      const { data: existingCase } = await supabase
        .from("dunning_cases")
        .select("id")
        .eq("subscription_id", subscription.id)
        .eq("status", "open")
        .maybeSingle();

      if (!existingCase) {
        const interestStartDate = new Date();
        const nextActionDate = new Date();
        nextActionDate.setDate(nextActionDate.getDate() + 14);

        const { data: newCase, error: createError } = await supabase
          .from("dunning_cases")
          .insert({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            principal_amount: subscription.amount,
            total_amount: subscription.amount + 500,
            dunning_level: 0,
            interest_start_date: interestStartDate.toISOString(),
            next_action_date: nextActionDate.toISOString(),
          })
          .select()
          .single();

        if (createError) {
          results.errors.push(`Failed to create case for sub ${subscription.id}: ${createError.message}`);
          continue;
        }

        try {
          await supabase.functions.invoke("generate-dunning-letter", {
            body: {
              dunningCaseId: newCase.id,
              level: 1,
            },
          });
          results.newCasesCreated++;
        } catch (error) {
          results.errors.push(`Failed to send letter for case ${newCase.id}: ${error.message}`);
        }
      }
    }

    const { data: openCases, error: casesError } = await supabase
      .from("dunning_cases")
      .select("*")
      .eq("status", "open")
      .not("next_action_date", "is", null);

    if (casesError) throw casesError;

    const now = new Date();

    for (const dunningCase of openCases || []) {
      const nextActionDate = new Date(dunningCase.next_action_date);

      if (now < nextActionDate) {
        continue;
      }

      const currentLevel = dunningCase.dunning_level;

      if (currentLevel < 3) {
        const newLevel = currentLevel + 1;

        try {
          await supabase.functions.invoke("generate-dunning-letter", {
            body: {
              dunningCaseId: dunningCase.id,
              level: newLevel,
            },
          });
          results.casesEscalated++;
        } catch (error) {
          results.errors.push(`Failed to escalate case ${dunningCase.id}: ${error.message}`);
        }
      }

      if (currentLevel === 3 && dunningCase.third_dunning_sent_at) {
        const thirdDunningSent = new Date(dunningCase.third_dunning_sent_at);
        const daysSinceThird = Math.floor((now.getTime() - thirdDunningSent.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceThird >= 14) {
          const { error: forwardError } = await supabase
            .from("dunning_cases")
            .update({
              status: "forwarded_to_collection",
              next_action_date: null,
            })
            .eq("id", dunningCase.id);

          if (forwardError) {
            results.errors.push(`Failed to forward case ${dunningCase.id}: ${forwardError.message}`);
          } else {
            const lateFees = 500 + 1000 + 1500;
            const interestAmount = 0;

            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, street, house_number, postcode, city, billing_data_complete")
              .eq("id", dunningCase.user_id)
              .single();

            const missingData: string[] = [];
            if (!profile?.street) missingData.push("Straße");
            if (!profile?.house_number) missingData.push("Hausnummer");
            if (!profile?.postcode) missingData.push("PLZ");
            if (!profile?.city) missingData.push("Stadt");

            await supabase.from("collection_cases").insert({
              user_id: dunningCase.user_id,
              subscription_id: dunningCase.subscription_id,
              dunning_case_id: dunningCase.id,
              principal_amount: dunningCase.principal_amount,
              late_fees: lateFees,
              interest_amount: interestAmount,
              collection_fees: 0,
              total_amount: dunningCase.principal_amount + lateFees + interestAmount,
              data_complete: missingData.length === 0,
              missing_data: missingData,
            });

            results.casesForwardedToCollection++;
          }
        }
      }
    }

    console.log("Dunning cases processed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing dunning cases:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
