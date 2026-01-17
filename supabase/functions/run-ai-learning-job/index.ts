import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[AI Learning Job] Starting auto-learning process...");

    const results: any = {
      timestamp: new Date().toISOString(),
      steps: [],
    };

    // Step 1: Auto-learn from successful patterns
    console.log("[AI Learning Job] Step 1: Auto-learning from success patterns...");
    try {
      const { data: learnData, error: learnError } = await supabase.rpc(
        "auto_learn_from_success_pattern"
      );

      if (learnError) throw learnError;

      const learningResult = learnData?.[0] || { learned_count: 0, questions_processed: 0 };
      results.steps.push({
        step: "auto_learn_from_success_pattern",
        status: "success",
        learned_count: learningResult.learned_count,
        questions_processed: learningResult.questions_processed,
      });

      console.log(
        `[AI Learning Job] ✓ Auto-learned ${learningResult.learned_count} knowledge entries from ${learningResult.questions_processed} patterns`
      );
    } catch (error) {
      console.error("[AI Learning Job] Error in auto-learn step:", error);
      results.steps.push({
        step: "auto_learn_from_success_pattern",
        status: "error",
        error: error.message,
      });
    }

    // Step 2: Deactivate low-performing knowledge
    console.log("[AI Learning Job] Step 2: Deactivating low-performing knowledge...");
    try {
      const { data: deactivateData, error: deactivateError } = await supabase.rpc(
        "deactivate_low_performing_knowledge"
      );

      if (deactivateError) throw deactivateError;

      const deactivateResult = deactivateData?.[0] || { deactivated_count: 0, entries_checked: 0 };
      results.steps.push({
        step: "deactivate_low_performing_knowledge",
        status: "success",
        deactivated_count: deactivateResult.deactivated_count,
        entries_checked: deactivateResult.entries_checked,
      });

      console.log(
        `[AI Learning Job] ✓ Deactivated ${deactivateResult.deactivated_count} low-performing entries (checked ${deactivateResult.entries_checked})`
      );
    } catch (error) {
      console.error("[AI Learning Job] Error in deactivate step:", error);
      results.steps.push({
        step: "deactivate_low_performing_knowledge",
        status: "error",
        error: error.message,
      });
    }

    // Step 3: Get learning analytics
    console.log("[AI Learning Job] Step 3: Gathering analytics...");
    try {
      const { data: analyticsData, error: analyticsError } = await supabase.rpc(
        "get_learning_analytics",
        { p_days_back: 7 }
      );

      if (analyticsError) throw analyticsError;

      results.steps.push({
        step: "get_learning_analytics",
        status: "success",
        analytics: analyticsData,
      });

      console.log("[AI Learning Job] ✓ Analytics gathered successfully");
    } catch (error) {
      console.error("[AI Learning Job] Error in analytics step:", error);
      results.steps.push({
        step: "get_learning_analytics",
        status: "error",
        error: error.message,
      });
    }

    // Step 4: Check for pending learning queue items that need attention
    console.log("[AI Learning Job] Step 4: Checking learning queue...");
    try {
      const { data: queueData, error: queueError } = await supabase
        .from("chat_learning_queue")
        .select("status")
        .eq("status", "pending");

      if (queueError) throw queueError;

      results.steps.push({
        step: "check_learning_queue",
        status: "success",
        pending_items: queueData?.length || 0,
      });

      if (queueData && queueData.length > 10) {
        console.log(
          `[AI Learning Job] ⚠ Warning: ${queueData.length} items in learning queue waiting for review`
        );
      }
    } catch (error) {
      console.error("[AI Learning Job] Error checking queue:", error);
      results.steps.push({
        step: "check_learning_queue",
        status: "error",
        error: error.message,
      });
    }

    console.log("[AI Learning Job] ✓ Auto-learning job completed successfully");

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[AI Learning Job] Fatal error:", error);

    return new Response(
      JSON.stringify({
        error: "AI learning job failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
