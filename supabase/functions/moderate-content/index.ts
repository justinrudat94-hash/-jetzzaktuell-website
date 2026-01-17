import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ModerationRequest {
  content: string;
  contentType: string;
  contentId: string;
}

interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      hate: boolean;
      'hate/threatening': boolean;
      harassment: boolean;
      'harassment/threatening': boolean;
      'self-harm': boolean;
      'self-harm/intent': boolean;
      'self-harm/instructions': boolean;
      sexual: boolean;
      'sexual/minors': boolean;
      violence: boolean;
      'violence/graphic': boolean;
    };
    category_scores: {
      hate: number;
      'hate/threatening': number;
      harassment: number;
      'harassment/threatening': number;
      'self-harm': number;
      'self-harm/intent': number;
      'self-harm/instructions': number;
      sexual: number;
      'sexual/minors': number;
      violence: number;
      'violence/graphic': number;
    };
  }>;
}

function calculateRiskLevel(result: OpenAIModerationResponse['results'][0]): string {
  if (!result.flagged) {
    return 'safe';
  }

  const scores = result.category_scores;
  const maxScore = Math.max(...Object.values(scores));

  if (maxScore >= 0.9) return 'critical';
  if (maxScore >= 0.7) return 'high';
  if (maxScore >= 0.5) return 'medium';
  return 'low';
}

function determineAction(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'blocked';
    case 'high':
      return 'needs_review';
    case 'medium':
      return 'needs_review';
    default:
      return 'approved';
  }
}

function getFlaggedCategories(result: OpenAIModerationResponse['results'][0]): string[] {
  const categories: string[] = [];
  for (const [key, value] of Object.entries(result.categories)) {
    if (value) {
      categories.push(key);
    }
  }
  return categories;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const { content, contentType, contentId }: ModerationRequest = await req.json();

    if (!content || !contentType || !contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content, contentType, contentId' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service', 'openai')
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      console.error('Failed to fetch OpenAI API key from database:', apiKeyError);
      
      await supabase.rpc('log_api_usage', {
        p_service: 'openai',
        p_function_name: 'moderate-content',
        p_endpoint: '/v1/moderations',
        p_execution_time_ms: Date.now() - startTime,
        p_status: 'error',
        p_error_message: 'API key not configured',
      });

      return new Response(
        JSON.stringify({
          flagged: false,
          riskLevel: 'safe',
          autoAction: 'approved',
          note: 'Moderation skipped - API key not configured'
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const openaiApiKey = apiKeyData.api_key;

    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content }),
    });

    const executionTime = Date.now() - startTime;

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('OpenAI API error:', errorText);
      
      await supabase.rpc('log_api_usage', {
        p_service: 'openai',
        p_function_name: 'moderate-content',
        p_endpoint: '/v1/moderations',
        p_execution_time_ms: executionTime,
        p_status: 'error',
        p_error_message: `API error: ${errorText}`,
        p_metadata: {
          content_type: contentType,
          content_id: contentId,
        },
      });

      return new Response(
        JSON.stringify({
          flagged: false,
          riskLevel: 'safe',
          autoAction: 'approved',
          note: 'Moderation skipped - API error'
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const moderationData: OpenAIModerationResponse = await moderationResponse.json();
    const result = moderationData.results[0];

    const riskLevel = calculateRiskLevel(result);
    const autoAction = determineAction(riskLevel);
    const flaggedCategories = getFlaggedCategories(result);

    await supabase.rpc('log_api_usage', {
      p_service: 'openai',
      p_function_name: 'moderate-content',
      p_endpoint: '/v1/moderations',
      p_execution_time_ms: executionTime,
      p_status: 'success',
      p_metadata: {
        content_type: contentType,
        content_id: contentId,
        flagged: result.flagged,
        risk_level: riskLevel,
        model: moderationData.model,
      },
    });

    const responseData = {
      contentId,
      flagged: result.flagged,
      riskLevel,
      autoAction,
      flaggedCategories,
      categoryScores: result.category_scores,
      aiResponse: moderationData,
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in moderate-content function:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.rpc('log_api_usage', {
      p_service: 'openai',
      p_function_name: 'moderate-content',
      p_execution_time_ms: Date.now() - startTime,
      p_status: 'error',
      p_error_message: error.message,
    });

    return new Response(
      JSON.stringify({
        flagged: false,
        riskLevel: 'safe',
        autoAction: 'approved',
        note: 'Moderation skipped - internal error'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
