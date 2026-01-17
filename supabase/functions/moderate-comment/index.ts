import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CommentModerationRequest {
  commentId: string;
  userId: string;
  content: string;
  eventId?: string;
  parentCommentId?: string;
}

interface ModerationResult {
  allowed: boolean;
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  violations: string[];
  scores: {
    hate_speech: number;
    harassment: number;
    threats: number;
    sexual_content: number;
    violence: number;
    discrimination: number;
    spam: number;
    profanity: number;
    misinformation: number;
    self_harm: number;
  };
  auto_action: 'allow' | 'warn' | 'delete' | 'ban';
  violation_severity: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  confidence: number;
}

function analyzeComment(content: string, userHistory: any): ModerationResult {
  const violations: string[] = [];
  const scores = {
    hate_speech: 0,
    harassment: 0,
    threats: 0,
    sexual_content: 0,
    violence: 0,
    discrimination: 0,
    spam: 0,
    profanity: 0,
    misinformation: 0,
    self_harm: 0,
  };

  const text = content.toLowerCase();

  // Hate Speech & Hassrede
  const hateKeywords = [
    'nazi', 'hitler', 'holocaust', 'rassist', 'kanake',
    'schwuchtel', 'transe', 'abschaum', 'untermensch', 'terror',
    'jihad', 'sieg heil', 'kkk', 'white power'
  ];
  hateKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.hate_speech += 0.3;
      violations.push(`hate_speech: ${keyword}`);
    }
  });

  // Beleidigungen & Harassment
  const harassmentKeywords = [
    'idiot', 'schwachkopf', 'trottel', 'vollidiot', 'depp', 'dumm',
    'blöd', 'behindert', 'spast', 'mongo', 'opfer', 'loser',
    'versager', 'bastard', 'arschloch', 'wichser', 'fotze',
    'hurensohn', 'schlampe', 'nutte', 'hure'
  ];
  harassmentKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.harassment += 0.15;
      violations.push(`harassment: ${keyword}`);
    }
  });

  // Bedrohungen & Gewalt
  const threatKeywords = [
    'umbringen', 'ermorden', 'abstechen', 'erschießen', 'vergewaltigen',
    'töten', 'mord', 'lynch', 'hinrichten', 'schlagen', 'prügeln',
    'verletzen', 'foltern', 'kidnap', 'entführen', 'bomben', 'anschlag',
    'kill', 'die', 'death', 'attack'
  ];
  threatKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.threats += 0.35;
      violations.push(`threat: ${keyword}`);
    }
  });

  // Gewaltverherrlichung
  const violenceKeywords = [
    'blut', 'tot', 'leiche', 'folter', 'vergewaltigung', 'mord',
    'massaker', 'genozid', 'kriegsverbrechen'
  ];
  violenceKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.violence += 0.2;
      violations.push(`violence: ${keyword}`);
    }
  });

  // Sexueller Content
  const sexualKeywords = [
    'sex', 'porn', 'nackt', 'nude', 'xxx', 'porno', 'fick',
    'vögeln', 'bumsen', 'penis', 'vagina', 'anal', 'oral',
    'masturbation', 'orgasmus', 'erotik'
  ];
  sexualKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.sexual_content += 0.15;
      violations.push(`sexual_content: ${keyword}`);
    }
  });

  // Diskriminierung
  const discriminationKeywords = [
    'muslim', 'jude', 'ausländer', 'flüchtling', 'asyl', 'integration',
    'minderheit', 'behindert', 'schwul', 'lesbisch', 'trans', 'homo'
  ];
  const discriminationContext = ['alle', 'dreckig', 'zurück', 'raus', 'verbieten'];
  discriminationKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      discriminationContext.forEach(context => {
        if (text.includes(context)) {
          scores.discrimination += 0.25;
          violations.push(`discrimination: ${keyword} + ${context}`);
        }
      });
    }
  });

  // Spam
  const spamIndicators = [
    text.includes('http') && text.split('http').length > 3,
    text.includes('www.') && text.split('www.').length > 2,
    (text.match(/[!?]{3,}/g) || []).length > 2,
    (text.match(/[A-ZÄÖÜ]/g) || []).length / text.length > 0.5,
    text.length < 5 && text.match(/[a-z]/g)?.length === 0,
  ];
  const spamCount = spamIndicators.filter(Boolean).length;
  if (spamCount > 1) {
    scores.spam = spamCount * 0.2;
    violations.push(`spam_indicators: ${spamCount}`);
  }

  // Self-Harm Content
  const selfHarmKeywords = [
    'selbstmord', 'suizid', 'umbringen mich', 'sterben will',
    'nicht mehr leben', 'schluss machen', 'ritzen', 'selbstverletzung'
  ];
  selfHarmKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.self_harm += 0.3;
      violations.push(`self_harm: ${keyword}`);
    }
  });

  // Misinformation indicators
  const misinfoKeywords = [
    'fake news', 'lügenpresse', 'verschwörung', 'wahrheit verschwiegen',
    'geheimplan', 'sie wollen', 'kontrollieren', 'manipulation'
  ];
  misinfoKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      scores.misinformation += 0.15;
      violations.push(`misinformation: ${keyword}`);
    }
  });

  // User history impact
  if (userHistory.violation_count > 3) {
    scores.harassment += 0.2;
    violations.push('user_history: multiple_violations');
  }

  // Calculate overall risk
  const maxScore = Math.max(...Object.values(scores));
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';

  if (maxScore >= 0.8 || scores.threats > 0.3 || scores.hate_speech > 0.5) {
    riskLevel = 'critical';
  } else if (maxScore >= 0.6) {
    riskLevel = 'high';
  } else if (maxScore >= 0.4) {
    riskLevel = 'medium';
  } else if (maxScore >= 0.2) {
    riskLevel = 'low';
  } else {
    riskLevel = 'safe';
  }

  // Determine violation severity
  let violationSeverity: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  if (scores.threats > 0.3 || scores.hate_speech > 0.5 || scores.self_harm > 0.3) {
    violationSeverity = 'critical';
  } else if (maxScore >= 0.6) {
    violationSeverity = 'severe';
  } else if (maxScore >= 0.4) {
    violationSeverity = 'moderate';
  } else if (maxScore >= 0.2) {
    violationSeverity = 'minor';
  } else {
    violationSeverity = 'none';
  }

  // Determine auto action
  let autoAction: 'allow' | 'warn' | 'delete' | 'ban';
  if (violationSeverity === 'critical') {
    autoAction = 'ban';
  } else if (violationSeverity === 'severe') {
    autoAction = 'delete';
  } else if (violationSeverity === 'moderate') {
    autoAction = 'warn';
  } else {
    autoAction = 'allow';
  }

  const confidence = Math.min(1.0, maxScore + 0.2);

  return {
    allowed: violationSeverity === 'none' || violationSeverity === 'minor',
    risk_level: riskLevel,
    violations,
    scores,
    auto_action: autoAction,
    violation_severity: violationSeverity,
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

    const { commentId, userId, content, eventId, parentCommentId }: CommentModerationRequest = await req.json();

    if (!commentId || !userId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: commentId, userId, content' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get user history
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('violation_count, reports_received_count, is_suspended')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Failed to fetch user data:', userError);
    }

    const userHistory = {
      violation_count: userData?.violation_count || 0,
      reports_received_count: userData?.reports_received_count || 0,
      is_suspended: userData?.is_suspended || false,
    };

    // Analyze comment
    const moderationResult = analyzeComment(content, userHistory);
    const processingTime = Date.now() - startTime;

    // Store analysis
    const { error: analysisError } = await supabase
      .from('ai_content_analysis')
      .insert({
        content_type: 'comment',
        content_id: commentId,
        spam_score: moderationResult.scores.spam,
        toxicity_score: Math.max(
          moderationResult.scores.hate_speech,
          moderationResult.scores.harassment,
          moderationResult.scores.profanity
        ),
        fake_score: moderationResult.scores.misinformation,
        quality_score: moderationResult.allowed ? 0.8 : 0.2,
        detected_patterns: moderationResult.violations,
        risk_level: moderationResult.risk_level,
        recommended_action: moderationResult.auto_action,
        analysis_details: {
          scores: moderationResult.scores,
          violation_severity: moderationResult.violation_severity,
          confidence: moderationResult.confidence,
          processing_time_ms: processingTime,
        },
      });

    if (analysisError) {
      console.error('Failed to store analysis:', analysisError);
    }

    // Handle violations based on severity
    if (moderationResult.violation_severity === 'critical' || moderationResult.violation_severity === 'severe') {
      // Increment user violation count
      const incrementAmount = moderationResult.violation_severity === 'critical' ? 2 : 1;

      const { error: violationError } = await supabase
        .from('profiles')
        .update({
          violation_count: (userData?.violation_count || 0) + incrementAmount,
        })
        .eq('id', userId);

      if (violationError) {
        console.error('Failed to update violation count:', violationError);
      }

      // Check if user should be suspended (3+ violations)
      const newViolationCount = (userData?.violation_count || 0) + incrementAmount;
      if (newViolationCount >= 3 && !userData?.is_suspended) {
        // Suspend user
        await supabase
          .from('profiles')
          .update({
            is_suspended: true,
            suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            suspension_reason: `Automatische Sperrung nach ${newViolationCount} Verstößen`,
          })
          .eq('id', userId);

        console.log(`User ${userId} suspended for 7 days after ${newViolationCount} violations`);
      }
    }

    // Create admin alert for critical violations
    if (moderationResult.violation_severity === 'critical' || moderationResult.violation_severity === 'severe') {
      const severity = moderationResult.violation_severity === 'critical' ? 5 : 4;
      const violationTypes = Object.entries(moderationResult.scores)
        .filter(([_, score]) => score > 0.3)
        .map(([type, _]) => type)
        .join(', ');

      await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'critical',
          title: `${moderationResult.violation_severity === 'critical' ? 'Kritischer' : 'Schwerer'} Verstoß in Kommentar`,
          message: `Kommentar enthält: ${violationTypes}. User-ID: ${userId}. Verstöße gesamt: ${(userData?.violation_count || 0) + (moderationResult.violation_severity === 'critical' ? 2 : 1)}`,
          severity,
          related_content_type: 'comment',
          related_content_id: commentId,
          action_required: true,
        });
    }

    // Auto-delete comment if severe/critical
    if (moderationResult.auto_action === 'delete' || moderationResult.auto_action === 'ban') {
      await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      console.log(`Comment ${commentId} automatically deleted due to ${moderationResult.violation_severity} violation`);
    }

    // Log execution
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'moderate-comment',
        execution_time_ms: processingTime,
        status: 'success',
        request_data: { commentId, userId },
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
    console.error('Error in moderate-comment function:', error);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'moderate-comment',
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
