import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  ticketId: string;
}

interface KnowledgeEntry {
  id: string;
  question_pattern: string;
  answer_template: string;
  category: string;
  keywords: string[];
  priority: number;
}

interface GPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Nur Admins dürfen diese Funktion nutzen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ticketId }: GenerateRequest = await req.json();

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        subject,
        description,
        category,
        priority,
        status,
        is_recurring,
        related_issue_count,
        created_at
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ticketUser } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', ticket.user_id)
      .single();

    const { data: responses } = await supabase
      .from('ticket_responses')
      .select('message, is_admin_response, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const knowledgeEntries = await searchKnowledgeBase(supabase, ticket.subject, ticket.description, ticket.category);

    const similarSolutions = await getSimilarSolutions(supabase, ticket.category, ticket.subject);

    const templates = await getResponseTemplates(supabase, ticket.category);

    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service', 'openai')
      .eq('is_active', true)
      .single();

    if (!apiKey?.api_key) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API Key nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildSystemPrompt(knowledgeEntries, similarSolutions, templates, ticket, ticketUser);
    const conversationHistory = buildConversationHistory(ticket, responses || []);

    const startTime = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: `Bitte erstelle jetzt eine hilfreiche Antwort für dieses Ticket.` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API Error:', await openaiResponse.text());
      return new Response(
        JSON.stringify({ error: 'KI-Generierung fehlgeschlagen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gptData: GPTResponse = await openaiResponse.json();
    const generatedResponse = gptData.choices[0].message.content;
    const generationTime = Date.now() - startTime;

    const { data: aiResponse } = await supabase
      .from('ai_ticket_responses')
      .insert({
        ticket_id: ticketId,
        generated_response: generatedResponse,
        knowledge_sources: knowledgeEntries.map(e => e.id),
        confidence_score: calculateConfidenceScore(knowledgeEntries, similarSolutions),
        generation_time_ms: generationTime,
        tokens_used: gptData.usage.total_tokens,
        created_by: user.id,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        response: generatedResponse,
        confidence: calculateConfidenceScore(knowledgeEntries, similarSolutions),
        knowledgeSourcesCount: knowledgeEntries.length,
        similarSolutionsCount: similarSolutions.length,
        generationTimeMs: generationTime,
        tokensUsed: gptData.usage.total_tokens,
        aiResponseId: aiResponse?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ticket-response:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchKnowledgeBase(
  supabase: any,
  subject: string,
  description: string,
  category: string
): Promise<KnowledgeEntry[]> {
  const searchText = `${subject} ${description}`.toLowerCase();
  const words = searchText.split(/\s+/).filter(w => w.length > 2);

  const { data: entries } = await supabase
    .from('chat_knowledge_base')
    .select('id, question_pattern, answer_template, category, keywords, priority')
    .eq('is_active', true)
    .or(`category.eq.${category},category.eq.general`)
    .order('priority', { ascending: false })
    .limit(50);

  if (!entries) return [];

  const scoredEntries = entries.map((entry: KnowledgeEntry) => {
    let score = 0;

    words.forEach(word => {
      if (entry.question_pattern.toLowerCase().includes(word)) score += 3;
      if (entry.keywords.some(kw => kw.toLowerCase().includes(word))) score += 2;
      if (entry.answer_template.toLowerCase().includes(word)) score += 1;
    });

    if (entry.category === category) score += 5;
    score += entry.priority * 0.5;

    return { entry, score };
  });

  return scoredEntries
    .filter(({ score }) => score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ entry }) => entry);
}

async function getSimilarSolutions(
  supabase: any,
  category: string,
  subject: string
): Promise<any[]> {
  const { data: solutions } = await supabase
    .from('recurring_ticket_solutions')
    .select('*')
    .eq('category', category)
    .gte('success_rate', 0.7)
    .order('success_rate', { ascending: false })
    .limit(5);

  return solutions || [];
}

async function getResponseTemplates(
  supabase: any,
  category: string
): Promise<any[]> {
  const { data: templates } = await supabase
    .from('admin_response_templates')
    .select('*')
    .eq('is_active', true)
    .or(`category.eq.${category},category.eq.general`)
    .order('usage_count', { ascending: false })
    .limit(5);

  return templates || [];
}

function calculateConfidenceScore(
  knowledgeEntries: KnowledgeEntry[],
  similarSolutions: any[]
): number {
  let score = 0.5;

  if (knowledgeEntries.length > 0) score += 0.2;
  if (knowledgeEntries.length >= 3) score += 0.1;
  if (similarSolutions.length > 0) score += 0.15;
  if (similarSolutions.some(s => s.success_rate >= 0.9)) score += 0.05;

  return Math.min(1.0, score);
}

function buildSystemPrompt(
  knowledgeEntries: KnowledgeEntry[],
  similarSolutions: any[],
  templates: any[],
  ticket: any,
  ticketUser: any
): string {
  let prompt = `Du bist ein professioneller Support-Mitarbeiter für die Jetzz Event-App.

Deine Aufgabe:
- Erstelle eine hilfreiche, präzise Antwort für das Support-Ticket als professioneller Support-Mitarbeiter
- Nutze die Wissensbasis, Vorlagen und erfolgreiche Lösungen als Grundlage
- Sei freundlich, empathisch und lösungsorientiert
- Sprich den User direkt an (nutze "du")
- Halte die Antwort kurz und verständlich (max 4-5 Sätze)
- Gib konkrete Schritt-für-Schritt-Anleitungen wenn möglich
- Bei technischen Problemen: Frage nach Details (Gerätetyp, App-Version, etc.)
- WICHTIG: Füge KEINE Signatur hinzu - das übernimmt das System automatisch

TICKET-INFORMATIONEN:
Kategorie: ${ticket.category}
Priorität: ${ticket.priority}
Betreff: ${ticket.subject}
Beschreibung: ${ticket.description}
User: ${ticketUser?.username || 'Unbekannt'}
Wiederkehrendes Problem: ${ticket.is_recurring ? 'Ja' : 'Nein'}
`;

  if (templates.length > 0) {
    prompt += `\n\nVERFÜGBARE ANTWORT-VORLAGEN:\n\n`;
    templates.forEach((tpl, i) => {
      prompt += `${i + 1}. ${tpl.template_name}: ${tpl.template_text}\n\n`;
    });
  }

  if (knowledgeEntries.length > 0) {
    prompt += `\n\nRELEVANTE WISSENSBASIS:\n\n`;
    knowledgeEntries.forEach((entry, i) => {
      prompt += `${i + 1}. Q: ${entry.question_pattern}\n   A: ${entry.answer_template}\n\n`;
    });
  }

  if (similarSolutions.length > 0) {
    prompt += `\n\nERFOLGREICHE LÖSUNGEN FÜR ÄHNLICHE PROBLEME:\n\n`;
    similarSolutions.forEach((sol, i) => {
      prompt += `${i + 1}. ${sol.problem_pattern} (Erfolgsrate: ${(sol.success_rate * 100).toFixed(0)}%)\n   Lösung: ${sol.solution_text}\n\n`;
    });
  }

  prompt += `\n\nWICHTIG:\n- Personalisiere die Antwort für "${ticketUser?.username || 'User'}"\n- Nutze die Vorlagen als Basis, aber passe sie an das spezifische Problem an\n- Wenn du nicht sicher bist, empfehle weitere Schritte oder eskaliere das Ticket\n- Sei niemals unhöflich oder abweisend\n- Gib NIEMALS sensible Daten preis (API-Keys, Admin-Zugänge, etc.)\n- Antworte auf Deutsch\n`;

  return prompt;
}

function buildConversationHistory(
  ticket: any,
  responses: any[]
): Array<{ role: string; content: string }> {
  const history: Array<{ role: string; content: string }> = [
    {
      role: 'user',
      content: `Betreff: ${ticket.subject}\n\nBeschreibung: ${ticket.description}`
    }
  ];

  responses.forEach(response => {
    history.push({
      role: response.is_admin_response ? 'assistant' : 'user',
      content: response.message
    });
  });

  return history;
}
