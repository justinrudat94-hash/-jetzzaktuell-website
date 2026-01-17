import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LivestreamModerationRequest {
  eventId: string;
  streamUrl?: string;
  checkType: 'start' | 'ongoing' | 'report';
  reportReason?: string;
}

interface ModerationResult {
  allowed: boolean;
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  auto_action?: 'allow' | 'warn' | 'pause' | 'terminate';
  confidence: number;
}

function analyzeLivestream(eventData: any, checkType: string): ModerationResult {
  const warnings: string[] = [];
  let riskScore = 0;

  // Check event metadata
  if (!eventData.title || eventData.title.length < 5) {
    warnings.push('Verdächtig kurzer Titel');
    riskScore += 0.2;
  }

  if (!eventData.description || eventData.description.length < 20) {
    warnings.push('Keine ausreichende Beschreibung');
    riskScore += 0.15;
  }

  // Check user history
  if (eventData.creator_violation_count > 2) {
    warnings.push('Nutzer hat mehrere Verstöße');
    riskScore += 0.3;
  }

  if (eventData.creator_reports_count > 5) {
    warnings.push('Nutzer wurde mehrfach gemeldet');
    riskScore += 0.25;
  }

  // Check event patterns
  const text = `${eventData.title} ${eventData.description}`.toLowerCase();
  
  const suspiciousKeywords = [
    'scam', 'free money', 'click now', 'subscribe now',
    'leaked', 'exclusive', 'secret', 'hack',
    '18+', 'adult content', 'nude', 'porn'
  ];

  suspiciousKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      warnings.push(`Verdächtiges Keyword: ${keyword}`);
      riskScore += 0.2;
    }
  });

  // Determine risk level
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 0.8) {
    riskLevel = 'critical';
  } else if (riskScore >= 0.6) {
    riskLevel = 'high';
  } else if (riskScore >= 0.4) {
    riskLevel = 'medium';
  } else if (riskScore >= 0.2) {
    riskLevel = 'low';
  } else {
    riskLevel = 'safe';
  }

  // Determine auto action
  let autoAction: 'allow' | 'warn' | 'pause' | 'terminate';
  if (riskLevel === 'critical') {
    autoAction = 'terminate';
  } else if (riskLevel === 'high') {
    autoAction = 'pause';
  } else if (riskLevel === 'medium') {
    autoAction = 'warn';
  } else {
    autoAction = 'allow';
  }

  const confidence = Math.min(1.0, riskScore + 0.3);

  return {
    allowed: riskLevel !== 'critical',
    risk_level: riskLevel,
    warnings,
    auto_action: autoAction,
    confidence,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, streamUrl, checkType, reportReason }: LivestreamModerationRequest = await req.json();

    if (!eventId || !checkType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventId, checkType' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get event data with creator info
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id (
          id,
          username,
          violation_count,
          reports_received_count
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Prepare data for analysis
    const analysisData = {
      title: eventData.title,
      description: eventData.description,
      creator_violation_count: eventData.profiles?.violation_count || 0,
      creator_reports_count: eventData.profiles?.reports_received_count || 0,
    };

    // Analyze livestream
    const moderationResult = analyzeLivestream(analysisData, checkType);
    const processingTime = Date.now() - startTime;

    // Store moderation log
    const { error: logError } = await supabase
      .from('ai_content_analysis')
      .insert({
        content_type: 'livestream',
        content_id: eventId,
        spam_score: 0,
        toxicity_score: moderationResult.risk_level === 'critical' ? 1.0 : moderationResult.risk_level === 'high' ? 0.8 : 0.4,
        fake_score: 0,
        quality_score: moderationResult.allowed ? 0.7 : 0.3,
        detected_patterns: moderationResult.warnings,
        risk_level: moderationResult.risk_level,
        recommended_action: moderationResult.auto_action,
        analysis_details: {
          check_type: checkType,
          confidence: moderationResult.confidence,
          processing_time_ms: processingTime,
          stream_url: streamUrl,
          report_reason: reportReason,
        },
      });

    if (logError) {
      console.error('Failed to store moderation log:', logError);
    }

    // Create alert for high-risk livestreams
    if (moderationResult.risk_level === 'critical' || moderationResult.risk_level === 'high') {
      const alertSeverity = moderationResult.risk_level === 'critical' ? 5 : 4;
      const { error: alertError } = await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'critical',
          title: `Riskanter Livestream erkannt: ${eventData.title}`,
          message: `Livestream wurde als ${moderationResult.risk_level} eingestuft. Warnungen: ${moderationResult.warnings.join(', ')}`,
          severity: alertSeverity,
          related_content_type: 'livestream',
          related_content_id: eventId,
          action_required: true,
        });

      if (alertError) {
        console.error('Failed to create alert:', alertError);
      }
    }

    // Auto-action: Terminate stream if critical
    if (moderationResult.auto_action === 'terminate') {
      await supabase
        .from('events')
        .update({
          is_live: false,
          stream_url: null,
        })
        .eq('id', eventId);

      console.log(`Stream ${eventId} automatically terminated due to critical risk`);
    }

    // Log to edge function logs
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'moderate-livestream',
        execution_time_ms: processingTime,
        status: 'success',
        request_data: { eventId, checkType },
        response_data: moderationResult,
      });

    return new Response(
      JSON.stringify({
        success: true,
        moderation: moderationResult,
        processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in moderate-livestream function:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'moderate-livestream',
        execution_time_ms: 0,
        status: 'error',
        error_message: error.message,
        request_data: {},
      });

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
