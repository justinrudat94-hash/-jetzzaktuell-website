import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessReportRequest {
  reportedEntityType: string;
  reportedEntityId: string;
  reportedUserId?: string;
  reasonCategory: string;
  reasonText?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, token);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const {
      reportedEntityType,
      reportedEntityId,
      reportedUserId,
      reasonCategory,
      reasonText,
    }: ProcessReportRequest = await req.json();

    if (!reportedEntityType || !reportedEntityId || !reasonCategory) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_entity_type', reportedEntityType)
      .eq('reported_entity_id', reportedEntityId)
      .maybeSingle();

    if (existingReport) {
      return new Response(
        JSON.stringify({ error: 'Du hast diesen Inhalt bereits gemeldet' }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: recentReports } = await supabase
      .from('reports')
      .select('created_at')
      .eq('reporter_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentReports && recentReports.length >= 10) {
      return new Response(
        JSON.stringify({ error: 'Tageslimit erreicht (10 Meldungen pro Tag)' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: lastReport } = await supabase
      .from('reports')
      .select('created_at')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastReport) {
      const timeSinceLastReport = Date.now() - new Date(lastReport.created_at).getTime();
      if (timeSinceLastReport < 30000) {
        return new Response(
          JSON.stringify({ error: 'Bitte warte 30 Sekunden zwischen Meldungen' }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    const aiPreChecked = false;
    const aiConfidence = null;
    const priorityScore = 50;

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_entity_type: reportedEntityType,
        reported_entity_id: reportedEntityId,
        reported_user_id: reportedUserId,
        reason_category: reasonCategory,
        reason_text: reasonText,
        ai_pre_checked: aiPreChecked,
        ai_confidence: aiConfidence,
        priority_score: priorityScore,
      })
      .select()
      .single();

    if (reportError) {
      if (reportError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'You have already reported this content' }),
          {
            status: 409,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      console.error('Error creating report:', reportError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen der Meldung', details: reportError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        report,
        message: 'Meldung erfolgreich erstellt',
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in process-report function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});