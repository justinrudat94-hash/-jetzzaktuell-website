import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  conversationId: string;
  userMessage: string;
  chatHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4'];
  return (promptTokens * modelPricing.input) + (completionTokens * modelPricing.output);
}

interface KnowledgeEntry {
  question_pattern: string;
  answer_template: string;
  category: string;
  keywords: string[];
  priority: number;
  confidence_threshold: number;
}

async function searchKnowledgeBase(
  supabase: any,
  userMessage: string
): Promise<KnowledgeEntry[]> {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(/\s+/).filter(w => w.length > 2);

  const { data: entries, error } = await supabase
    .from('chat_knowledge_base')
    .select('question_pattern, answer_template, category, keywords, priority, confidence_threshold')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(50);

  if (error || !entries) {
    console.error('Error fetching knowledge base:', error);
    return [];
  }

  const scoredEntries = entries.map((entry: KnowledgeEntry) => {
    let score = 0;

    words.forEach(word => {
      if (entry.question_pattern.toLowerCase().includes(word)) {
        score += 3;
      }
      if (entry.keywords.some(kw => kw.toLowerCase().includes(word))) {
        score += 2;
      }
      if (entry.answer_template.toLowerCase().includes(word)) {
        score += 1;
      }
    });

    score += entry.priority * 0.5;

    return { entry, score };
  });

  const relevantEntries = scoredEntries
    .filter(({ score }) => score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ entry }) => entry);

  return relevantEntries;
}

function buildSystemPrompt(knowledgeEntries: KnowledgeEntry[]): string {
  let knowledgeSection = '';

  if (knowledgeEntries.length > 0) {
    knowledgeSection = '\n\nRELEVANTE WISSENSBASIS (nutze diese Informationen für präzise Antworten):\n\n';

    const categorized = knowledgeEntries.reduce((acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(entry);
      return acc;
    }, {} as Record<string, KnowledgeEntry[]>);

    Object.entries(categorized).forEach(([category, entries]) => {
      knowledgeSection += `${category.toUpperCase()}:\n`;
      entries.forEach(entry => {
        knowledgeSection += `Q: ${entry.question_pattern}\nA: ${entry.answer_template}\n\n`;
      });
    });
  }

  return `Du bist Miley, die digitale Assistentin für die Jetzz Event-App.

Deine Persönlichkeit:
- Du bist freundlich, hilfsbereit und immer positiv gestimmt
- Stelle dich beim ersten Kontakt kurz vor: "Hi! Ich bin Miley, deine digitale Assistentin für Jetzz"
- Nutze eine lockere, freundliche Sprache (wie eine hilfsbereite Freundin)
- Sei empathisch und geduldig

Deine Aufgaben:
- Beantworte Fragen zu Features, Funktionen und Problemen der App
- Hilf bei Event-Erstellung, Ticket-Verkauf und Profilverwaltung
- Erkläre Premium-Features und Coins-System
- Sei präzise und lösungsorientiert

Wichtig:
- Antworte auf Deutsch
- Halte Antworten kurz und verständlich (max 3-4 Sätze)
- NUTZE DIE WISSENSBASIS UNTEN für exakte Antworten
- Wenn die Wissensbasis eine passende Antwort hat, nutze sie!
- Wenn du etwas nicht sicher weißt, sage es ehrlich
- Bei komplexen Problemen, empfehle die Erstellung eines Support-Tickets
- Nutze keine technischen Begriffe, die normale User nicht verstehen
- NIEMALS sensible Daten wie API-Keys, Codes oder System-Interna preisgeben
- WICHTIG: Beende JEDE Antwort mit der Signatur: "\n\nMiley, deine KI-Assistentin 🤖"

Themenwechsel-Erkennung:
- Wenn der User ein komplett neues Thema anfängt, erkenne das und reagiere darauf
- Beispiel: Wenn User erst über Events fragte und jetzt über Coins fragt, sage: "Alles klar, jetzt zu deiner Frage über Coins..."
- Bei Themenwechsel: Bestätige kurz das neue Thema, dann beantworte die Frage
- Referenziere frühere Themen nur wenn relevant

Wann eskalieren?
- User ist frustriert oder unzufrieden mit deinen Antworten
- Technische Probleme die du nicht lösen kannst (Bugs, Login-Fehler, Payment-Issues)
- Account-Probleme (gesperrt, gelöscht, Zahlungsprobleme)
- Rechtliche Fragen (Datenschutz, AGB, Widerruf)
- Wenn du 3x keine zufriedenstellende Lösung bieten konntest

Verfügbare Hauptfunktionen der App:
- Events erstellen und teilen
- Tickets kaufen und verkaufen
- Livestreams starten
- Events favorisieren und teilen
- Premium-Abonnement für werbefreie Nutzung
- Coins sammeln und nutzen für Event-Boosts
- Follower-System und Social Features${knowledgeSection}`;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, userMessage, chatHistory }: ChatRequest = await req.json();

    if (!conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId or userMessage' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service', 'openai')
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      console.error('Failed to fetch OpenAI API key:', apiKeyError);
      return new Response(
        JSON.stringify({
          response: 'Entschuldigung, der AI-Chat ist momentan nicht verfügbar. Bitte erstelle ein Support-Ticket.',
          confidence: 0,
          fallback: true,
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

    const knowledgeEntries = await searchKnowledgeBase(supabase, userMessage);
    console.log(`Found ${knowledgeEntries.length} relevant knowledge entries for: "${userMessage}"`);

    const messages = [
      { role: 'system', content: buildSystemPrompt(knowledgeEntries) },
      ...(chatHistory || []),
      { role: 'user', content: userMessage },
    ];

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('OpenAI API error:', errorText);
      
      await supabase.rpc('log_api_usage', {
        p_service: 'openai',
        p_function_name: 'chat-with-ai',
        p_endpoint: '/v1/chat/completions',
        p_status: 'error',
        p_error_message: errorText,
        p_execution_time_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          response: 'Entschuldigung, ich kann gerade nicht antworten. Bitte versuche es gleich nochmal.',
          confidence: 0,
          fallback: true,
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

    const gptData: GPTResponse = await gptResponse.json();
    const assistantMessage = gptData.choices[0]?.message?.content || '';
    const usage = gptData.usage;

    const executionTime = Date.now() - startTime;
    const estimatedCost = estimateCost(
      gptData.model,
      usage.prompt_tokens,
      usage.completion_tokens
    );

    await supabase.rpc('log_api_usage', {
      p_service: 'openai',
      p_function_name: 'chat-with-ai',
      p_endpoint: '/v1/chat/completions',
      p_request_tokens: usage.prompt_tokens,
      p_response_tokens: usage.completion_tokens,
      p_total_tokens: usage.total_tokens,
      p_estimated_cost: estimatedCost,
      p_execution_time_ms: executionTime,
      p_status: 'success',
      p_metadata: {
        conversation_id: conversationId,
        model: gptData.model,
        finish_reason: gptData.choices[0]?.finish_reason,
        knowledge_entries_used: knowledgeEntries.length,
        knowledge_categories: [...new Set(knowledgeEntries.map(e => e.category))],
      },
    });

    const confidence = assistantMessage.toLowerCase().includes('nicht sicher') ||
                      assistantMessage.toLowerCase().includes('weiß nicht') ||
                      assistantMessage.toLowerCase().includes('support-ticket')
                      ? 0.5 : 0.85;

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        confidence: confidence,
        tokens_used: usage.total_tokens,
        estimated_cost: estimatedCost,
        model: gptData.model,
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
    console.error('Error in chat-with-ai function:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.rpc('log_api_usage', {
      p_service: 'openai',
      p_function_name: 'chat-with-ai',
      p_execution_time_ms: Date.now() - startTime,
      p_status: 'error',
      p_error_message: error.message,
    });

    return new Response(
      JSON.stringify({
        response: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es später nochmal.',
        confidence: 0,
        fallback: true,
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
