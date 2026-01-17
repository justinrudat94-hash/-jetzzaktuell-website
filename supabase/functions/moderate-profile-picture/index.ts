import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ModerateImageRequest {
  imageUrl: string;
  userId: string;
  imageType: 'profile_picture' | 'profile_banner';
}

interface OpenAIVisionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse request body
    const { imageUrl, userId, imageType }: ModerateImageRequest = await req.json();

    if (!imageUrl || !userId || !imageType) {
      return new Response(
        JSON.stringify({ error: 'Image URL, user ID, and image type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists and get age
    const { data: profile } = await supabase
      .from('profiles')
      .select('date_of_birth, age_verified')
      .eq('id', userId)
      .single();

    let userAge = null;
    if (profile?.date_of_birth) {
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      userAge = today.getFullYear() - birthDate.getFullYear();
    }

    // Call OpenAI Vision API for image analysis
    const moderationPrompt = `You are a content moderation AI for a social networking app. Analyze this ${imageType.replace('_', ' ')} and check for:

1. NSFW content (nudity, sexual content, violence, gore)
2. Hate symbols or offensive imagery
3. Minors (people who appear under 18 years old)
4. Inappropriate content for a social networking platform
5. Whether the image is suitable as a ${imageType.replace('_', ' ')}

${userAge ? `Note: This user is ${userAge} years old.` : ''}

Respond in JSON format with:
{
  "is_appropriate": boolean,
  "contains_minor": boolean,
  "nsfw_detected": boolean,
  "violence_detected": boolean,
  "hate_symbols_detected": boolean,
  "confidence_score": number (0-100),
  "reason": "Brief explanation",
  "recommended_action": "approve" | "review" | "reject"
}`;

    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: moderationPrompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error('Failed to analyze image');
    }

    const visionData: OpenAIVisionResponse = await visionResponse.json();
    const analysisText = visionData.choices[0].message.content;

    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Invalid AI response format');
    }

    // Calculate moderation score (0-100, higher = safer)
    const moderationScore = analysis.confidence_score || 50;

    // Determine if profile should be flagged
    const shouldFlag =
      !analysis.is_appropriate ||
      analysis.nsfw_detected ||
      analysis.violence_detected ||
      analysis.hate_symbols_detected ||
      (analysis.contains_minor && (!userAge || userAge < 18));

    // Update profile with moderation results
    const updateField =
      imageType === 'profile_picture'
        ? {
            profile_picture_moderated: true,
            profile_picture_moderation_score: moderationScore,
          }
        : {
            profile_banner_moderated: true,
            profile_banner_moderation_score: moderationScore,
          };

    await supabase.from('profiles').update(updateField).eq('id', userId);

    // If flagged, add to moderation queue
    if (shouldFlag || analysis.recommended_action !== 'approve') {
      await supabase.from('moderation_queue').insert({
        content_type: imageType,
        content_id: userId,
        user_id: userId,
        status: 'pending',
        priority: analysis.nsfw_detected || analysis.contains_minor ? 'high' : 'medium',
        flagged_reason: analysis.reason,
        ai_analysis: analysis,
      });

      // Queue notification to user
      await supabase.rpc('queue_email_notification', {
        p_user_id: userId,
        p_notification_type: 'profile_picture_rejected',
        p_subject: `Dein ${imageType === 'profile_picture' ? 'Profilbild' : 'Banner'} wird geprüft`,
        p_data: {
          image_type: imageType,
          reason: analysis.reason,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        moderation_score: moderationScore,
        is_appropriate: analysis.is_appropriate,
        flagged: shouldFlag,
        recommended_action: analysis.recommended_action,
        analysis: analysis,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in moderate-profile-picture:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
