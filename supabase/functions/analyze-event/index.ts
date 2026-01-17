import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventAnalysisRequest {
  eventId: string;
  title: string;
  description: string;
  location?: string;
  category?: string;
}

interface AnalysisResult {
  spam_score: number;
  fake_score: number;
  quality_score: number;
  content_scores: {
    hate_speech: number;
    harassment: number;
    threats: number;
    sexual_content: number;
    violence: number;
    discrimination: number;
    profanity: number;
    misinformation: number;
    self_harm: number;
  };
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  detected_patterns: string[];
  recommended_action: string;
  confidence: number;
}

function analyzeEventQuality(event: EventAnalysisRequest): AnalysisResult {
  const patterns: string[] = [];
  let spamScore = 0;
  let fakeScore = 0;
  let qualityScore = 1.0;

  const text = `${event.title} ${event.description}`.toLowerCase();

  // Spam-Patterns
  const spamKeywords = [
    'click here', 'buy now', 'limited offer', 'act now',
    'free money', 'make money fast', 'guaranteed',
    'visit website', 'follow link', 'discount code'
  ];
  
  spamKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      spamScore += 0.15;
      patterns.push(`spam_keyword: ${keyword}`);
    }
  });

  // Excessive URLs
  const urlMatches = text.match(/https?:\/\/[^\s]+/g);
  if (urlMatches && urlMatches.length > 3) {
    spamScore += 0.2;
    patterns.push('excessive_urls');
  }

  // Excessive capitalization
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    spamScore += 0.15;
    patterns.push('excessive_caps');
  }

  // Excessive punctuation
  const punctuationCount = (text.match(/[!?]{2,}/g) || []).length;
  if (punctuationCount > 3) {
    spamScore += 0.1;
    patterns.push('excessive_punctuation');
  }

  // Fake Event Indicators
  const fakePatterns = [
    'guaranteed win', 'free iphone', 'prize draw',
    'you won', 'congratulations you', 'claim your',
    'exclusive access', 'vip only', 'secret event'
  ];
  
  fakePatterns.forEach(keyword => {
    if (text.includes(keyword)) {
      fakeScore += 0.2;
      patterns.push(`fake_indicator: ${keyword}`);
    }
  });

  // Quality checks
  if (event.title.length < 10) {
    qualityScore -= 0.2;
    patterns.push('title_too_short');
  }
  
  if (event.description.length < 50) {
    qualityScore -= 0.3;
    patterns.push('description_too_short');
  }

  if (!event.location || event.location.length < 3) {
    qualityScore -= 0.15;
    patterns.push('missing_location');
  }

  // Repeated characters (aaaa, !!!!, etc.)
  const repeatedChars = text.match(/(.)\1{4,}/g);
  if (repeatedChars && repeatedChars.length > 0) {
    spamScore += 0.1;
    patterns.push('repeated_characters');
  }

  // Content Moderation - Hate Speech
  const contentScores = {
    hate_speech: 0,
    harassment: 0,
    threats: 0,
    sexual_content: 0,
    violence: 0,
    discrimination: 0,
    profanity: 0,
    misinformation: 0,
    self_harm: 0,
  };

  // Hate Speech Keywords
  const hateSpeechKeywords = [
    'nazi', 'hitler', 'heil', 'swastika', 'neger', 'kanake',
    'judensau', 'untermenschen', 'rasse', 'rassisch', 'racial purity'
  ];
  hateSpeechKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.hate_speech += 0.3;
      patterns.push(`hate_speech: ${keyword}`);
    }
  });

  // Harassment Keywords
  const harassmentKeywords = [
    'idiot', 'dumm', 'stupid', 'loser', 'versager', 'arschloch',
    'schlampe', 'fotze', 'wichser', 'bastard'
  ];
  harassmentKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.harassment += 0.15;
      patterns.push(`harassment: ${keyword}`);
    }
  });

  // Threats Keywords
  const threatsKeywords = [
    'kill', 't\u00f6ten', 'umbringen', 'erschie\u00dfen', 'abstechen',
    'mord', 'attack', 'angriff', 'bomb', 'bombe'
  ];
  threatsKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.threats += 0.35;
      patterns.push(`threat: ${keyword}`);
    }
  });

  // Sexual Content Keywords
  const sexualKeywords = [
    'sex', 'porn', 'nackt', 'nude', 'xxx', 'porno', 'fick',
    'erotic', 'adult only', 'nsfw'
  ];
  sexualKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.sexual_content += 0.15;
      patterns.push(`sexual_content: ${keyword}`);
    }
  });

  // Violence Keywords
  const violenceKeywords = [
    'blut', 'blood', 'tot', 'dead', 'leiche', 'corpse',
    'folter', 'torture', 'vergewaltigung', 'rape', 'massaker', 'massacre'
  ];
  violenceKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.violence += 0.2;
      patterns.push(`violence: ${keyword}`);
    }
  });

  // Discrimination Keywords
  const discriminationKeywords = [
    'muslim', 'jude', 'jew', 'ausl\u00e4nder', 'foreigner', 'fl\u00fcchtling',
    'schwul', 'gay', 'homo', 'lesbisch', 'lesbian', 'trans'
  ];
  const discriminationContext = ['alle', 'all', 'dreckig', 'dirty', 'zur\u00fcck', 'back', 'raus', 'out'];
  discriminationKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      discriminationContext.forEach(context => {
        if (text.includes(context)) {
          contentScores.discrimination += 0.25;
          patterns.push(`discrimination: ${keyword} + ${context}`);
        }
      });
    }
  });

  // Profanity Keywords
  const profanityKeywords = [
    'scheisse', 'shit', 'fuck', 'damn', 'verdammt', 'crap', 'bullshit'
  ];
  profanityKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.profanity += 0.1;
      patterns.push(`profanity: ${keyword}`);
    }
  });

  // Misinformation Keywords
  const misinfoKeywords = [
    'fake news', 'l\u00fcgenpresse', 'verschw\u00f6rung', 'conspiracy',
    'wahrheit verschwiegen', 'truth hidden', 'geheimplan', 'secret plan'
  ];
  misinfoKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.misinformation += 0.15;
      patterns.push(`misinformation: ${keyword}`);
    }
  });

  // Self-Harm Keywords
  const selfHarmKeywords = [
    'selbstmord', 'suicide', 'suizid', 'umbringen mich', 'kill myself',
    'sterben will', 'want to die', 'schluss machen', 'end it'
  ];
  selfHarmKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      contentScores.self_harm += 0.3;
      patterns.push(`self_harm: ${keyword}`);
    }
  });

  // Normalize all scores
  Object.keys(contentScores).forEach(key => {
    contentScores[key as keyof typeof contentScores] = Math.min(
      contentScores[key as keyof typeof contentScores],
      1.0
    );
  });

  spamScore = Math.min(spamScore, 1.0);
  fakeScore = Math.min(fakeScore, 1.0);
  qualityScore = Math.max(qualityScore, 0.0);

  // Calculate risk level including content scores
  const maxContentScore = Math.max(...Object.values(contentScores));
  const combinedRisk = Math.max(
    (spamScore + fakeScore) / 2,
    maxContentScore
  );
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  if (combinedRisk >= 0.7 || qualityScore < 0.3) {
    riskLevel = 'critical';
  } else if (combinedRisk >= 0.5 || qualityScore < 0.5) {
    riskLevel = 'high';
  } else if (combinedRisk >= 0.3 || qualityScore < 0.7) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Recommended action - stricter for content violations
  let recommendedAction: string;
  if (
    riskLevel === 'critical' ||
    contentScores.hate_speech > 0.5 ||
    contentScores.threats > 0.3 ||
    contentScores.violence > 0.5 ||
    contentScores.self_harm > 0.3
  ) {
    recommendedAction = 'reject';
  } else if (riskLevel === 'high' || maxContentScore > 0.4) {
    recommendedAction = 'needs_review';
  } else if (riskLevel === 'medium' || maxContentScore > 0.2) {
    recommendedAction = 'flag_for_monitoring';
  } else {
    recommendedAction = 'approve';
  }

  const confidence = 1 - (Math.abs(0.5 - combinedRisk) * 0.5);

  return {
    spam_score: Math.round(spamScore * 100) / 100,
    fake_score: Math.round(fakeScore * 100) / 100,
    quality_score: Math.round(qualityScore * 100) / 100,
    content_scores: {
      hate_speech: Math.round(contentScores.hate_speech * 100) / 100,
      harassment: Math.round(contentScores.harassment * 100) / 100,
      threats: Math.round(contentScores.threats * 100) / 100,
      sexual_content: Math.round(contentScores.sexual_content * 100) / 100,
      violence: Math.round(contentScores.violence * 100) / 100,
      discrimination: Math.round(contentScores.discrimination * 100) / 100,
      profanity: Math.round(contentScores.profanity * 100) / 100,
      misinformation: Math.round(contentScores.misinformation * 100) / 100,
      self_harm: Math.round(contentScores.self_harm * 100) / 100,
    },
    risk_level: riskLevel,
    detected_patterns: patterns,
    recommended_action: recommendedAction,
    confidence: Math.round(confidence * 100) / 100,
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

    const eventData: EventAnalysisRequest = await req.json();

    if (!eventData.eventId || !eventData.title || !eventData.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventId, title, description' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Analyze event quality
    const analysis = analyzeEventQuality(eventData);
    const processingTime = Date.now() - startTime;

    // Store analysis in database
    const { error: insertError } = await supabase
      .from('ai_content_analysis')
      .insert({
        content_type: 'event',
        content_id: eventData.eventId,
        spam_score: analysis.spam_score,
        toxicity_score: 0,
        fake_score: analysis.fake_score,
        quality_score: analysis.quality_score,
        detected_patterns: analysis.detected_patterns,
        risk_level: analysis.risk_level,
        recommended_action: analysis.recommended_action,
        analysis_details: {
          confidence: analysis.confidence,
          processing_time_ms: processingTime,
          patterns: analysis.detected_patterns,
        },
      });

    if (insertError) {
      console.error('Failed to store analysis:', insertError);
    }

    // Create admin alert for high-risk events
    if (analysis.risk_level === 'critical' || analysis.risk_level === 'high') {
      const alertSeverity = analysis.risk_level === 'critical' ? 5 : 4;
      const { error: alertError } = await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'critical',
          title: `Verdächtiges Event erkannt: ${eventData.title}`,
          message: `Event wurde als ${analysis.risk_level} eingestuft. Spam-Score: ${analysis.spam_score}, Fake-Score: ${analysis.fake_score}`,
          severity: alertSeverity,
          related_content_type: 'event',
          related_content_id: eventData.eventId,
          action_required: true,
        });

      if (alertError) {
        console.error('Failed to create alert:', alertError);
      }
    }

    // Log to edge function logs
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'analyze-event',
        execution_time_ms: processingTime,
        status: 'success',
        request_data: { eventId: eventData.eventId },
        response_data: analysis,
      });

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
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
    console.error('Error in analyze-event function:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'analyze-event',
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
