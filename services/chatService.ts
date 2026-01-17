import { supabase } from '@/lib/supabase';
import { supportService } from './supportService';
import Constants from 'expo-constants';

export interface ChatConversation {
  id: string;
  user_id: string;
  status: 'active' | 'resolved' | 'escalated' | 'abandoned';
  started_at: string;
  ended_at?: string;
  escalated_to_ticket_id?: string;
  satisfaction_rating?: number;
  was_helpful?: boolean;
  resolution_type?: 'ai_resolved' | 'escalated' | 'user_left' | 'timeout';
  total_messages: number;
  ai_resolution_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  message: string;
  ai_confidence_score?: number;
  related_faq_id?: string;
  was_helpful?: boolean;
  metadata?: any;
  created_at: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  question_pattern: string;
  answer_template: string;
  category: string;
  keywords: string[];
  usage_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  source: 'faq' | 'ticket_resolution' | 'manual' | 'chat_learning';
  source_id?: string;
  confidence_threshold: number;
  is_active: boolean;
  language: string;
  priority: number;
  created_at: string;
  last_updated: string;
  last_used_at?: string;
}

export interface ChatFeedbackDetail {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  original_question: string;
  original_answer: string;
  related_knowledge_id?: string;
  feedback_type: 'incorrect' | 'incomplete' | 'unclear' | 'outdated' | 'other';
  feedback_text?: string;
  correct_answer?: string;
  missing_information?: string;
  retry_attempted: boolean;
  improved_answer?: string;
  improved_answer_helpful?: boolean;
  improved_answer_message_id?: string;
  learning_status: 'pending' | 'learned' | 'reviewed' | 'rejected' | 'auto_learned';
  learned_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningQueueEntry {
  id: string;
  source_type: 'feedback' | 'conversation' | 'pattern' | 'ticket' | 'manual';
  source_id?: string;
  question_pattern: string;
  answer_template: string;
  category: string;
  keywords: string[];
  language: string;
  confidence_score: number;
  success_count: number;
  usage_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  priority: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  knowledge_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringQuestion {
  id: string;
  question_normalized: string;
  question_examples: string[];
  category?: string;
  keywords: string[];
  ask_count: number;
  first_asked_at: string;
  last_asked_at: string;
  successful_gpt_responses: string[];
  avg_confidence_score?: number;
  suggested_for_learning: boolean;
  learning_priority: number;
  has_knowledge_entry: boolean;
  created_at: string;
  updated_at: string;
}

export const chatService = {
  async startConversation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    await this.sendSystemMessage(data.id, 'Hallo! Ich bin dein virtueller Support-Assistent. Wie kann ich dir heute helfen?');

    return data as ChatConversation;
  },

  async getOrCreateActiveConversation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const conversationAge = Date.now() - new Date(existing.updated_at || existing.created_at).getTime();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

      if (conversationAge > twentyFourHoursInMs) {
        console.log('Closing old conversation (>24h), starting fresh');
        await this.endConversation(existing.id, 'timeout');

        const newConversation = await this.startConversation();
        await this.sendSystemMessage(
          newConversation.id,
          'Dein vorheriger Chat wurde automatisch geschlossen, da er älter als 24 Stunden war. Wie kann ich dir heute helfen?'
        );
        return newConversation;
      }

      return existing as ChatConversation;
    }

    return await this.startConversation();
  },

  async getConversation(id: string) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ChatConversation;
  },

  async getConversationMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  async sendUserMessage(conversationId: string, message: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userMessage, error: userError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
        message: message,
      })
      .select()
      .single();

    if (userError) throw userError;

    const aiResponse = await this.generateAIResponse(conversationId, message);

    return {
      userMessage: userMessage as ChatMessage,
      aiMessage: aiResponse,
    };
  },

  async sendSystemMessage(conversationId: string, message: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'system',
        message: message,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  },

  async generateAIResponse(conversationId: string, userMessage: string) {
    const messages = await this.getConversationMessages(conversationId);
    const conversation = await this.getConversation(conversationId);

    const knowledgeMatches = await this.findRelevantKnowledge(userMessage);

    let responseText = '';
    let confidenceScore = 0;
    let relatedFaqId = null;
    let useGPT = false;

    if (knowledgeMatches.length > 0 && knowledgeMatches[0].success_rate > 70) {
      const bestMatch = knowledgeMatches[0];
      responseText = bestMatch.answer_template;
      confidenceScore = bestMatch.confidence_threshold;

      if (bestMatch.source === 'faq' && bestMatch.source_id) {
        relatedFaqId = bestMatch.source_id;
      }

      console.log('Using Knowledge Base entry with', bestMatch.success_rate, '% success rate');
      await this.trackKnowledgeUsage(bestMatch.id, true);
    } else {
      useGPT = true;
      console.log('Using GPT for response (KB match too low or not found)');
      try {
        const gptResponse = await this.callGPTChat(conversationId, userMessage, messages);

        if (gptResponse && !gptResponse.fallback) {
          responseText = gptResponse.response;
          confidenceScore = gptResponse.confidence || 0.85;
        } else {
          confidenceScore = 0.3;
          responseText = this.getDefaultLowConfidenceResponse(conversation.ai_resolution_attempts);
        }
      } catch (error) {
        console.error('GPT call failed, using fallback:', error);
        confidenceScore = 0.3;
        responseText = this.getDefaultLowConfidenceResponse(conversation.ai_resolution_attempts);
      }
    }

    if (confidenceScore < 0.5 && !useGPT) {
      responseText += '\n\nIch bin mir bei dieser Antwort nicht ganz sicher. War das hilfreich?';
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        message: responseText,
        ai_confidence_score: confidenceScore,
        related_faq_id: relatedFaqId,
        metadata: useGPT ? { source: 'gpt', model: 'gpt-3.5-turbo' } : { source: 'knowledge_base' },
      })
      .select()
      .single();

    if (error) throw error;

    // Track recurring question for learning
    if (useGPT && data) {
      await this.trackRecurringQuestion(
        userMessage,
        'general',
        confidenceScore > 0.7,
        responseText
      ).catch(err => console.error('Error tracking recurring question:', err));
    }

    return data as ChatMessage;
  },

  async callGPTChat(conversationId: string, userMessage: string, previousMessages: ChatMessage[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const chatHistory = previousMessages
      .filter(m => m.sender_type !== 'system')
      .slice(-6)
      .map(m => ({
        role: m.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: m.message,
      }));

    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials for GPT chat');
      return { fallback: true, response: this.getDefaultLowConfidenceResponse(0), confidence: 0.3 };
    }

    try {
      console.log('Calling GPT chat API for conversation:', conversationId);
      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            userMessage,
            chatHistory,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat API error:', response.status, errorText);
        return { fallback: true, response: this.getDefaultLowConfidenceResponse(0), confidence: 0.3 };
      }

      const result = await response.json();
      console.log('GPT response received with confidence:', result.confidence);
      return result;
    } catch (error) {
      console.error('Error calling GPT chat:', error);
      return { fallback: true, response: this.getDefaultLowConfidenceResponse(0), confidence: 0.3 };
    }
  },

  getDefaultLowConfidenceResponse(attemptCount: number): string {
    const responses = [
      'Das ist eine interessante Frage. Lass mich sehen, wie ich dir am besten helfen kann...',
      'Hmm, ich bin mir nicht ganz sicher. Kannst du mir mehr Details geben?',
      'Ich verstehe dein Anliegen, aber ich brauche vielleicht mehr Informationen um dir optimal zu helfen.',
    ];
    return responses[Math.min(attemptCount, responses.length - 1)];
  },

  async findRelevantKnowledge(query: string, limit: number = 5) {
    const queryLower = query.toLowerCase().trim().replace(/[?!.,]/g, '');
    const keywords = queryLower.split(' ').filter(word => word.length > 3);

    const { data, error } = await supabase
      .from('chat_knowledge_base')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (!data || data.length === 0) return [];

    const scoredResults = data
      .map(entry => {
        const patternLower = entry.question_pattern.toLowerCase();
        let score = 0;

        if (patternLower === queryLower) {
          score = 1000;
        } else if (patternLower.includes(queryLower) || queryLower.includes(patternLower)) {
          score = 500;
        } else {
          const matchedKeywords = keywords.filter(kw =>
            entry.keywords.some(entryKw => entryKw.toLowerCase().includes(kw) || kw.includes(entryKw.toLowerCase()))
          );
          score = matchedKeywords.length * 50;
        }

        score += entry.success_rate * 2;
        score += entry.priority * 10;

        return { ...entry, matchScore: score };
      })
      .filter(entry => entry.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return scoredResults as KnowledgeBaseEntry[];
  },

  async trackKnowledgeUsage(knowledgeId: string, wasSuccessful: boolean) {
    const { error } = await supabase.rpc('track_knowledge_usage', {
      kb_id: knowledgeId,
      was_successful: wasSuccessful,
    });

    if (error) console.error('Error tracking knowledge usage:', error);
  },

  async markMessageHelpful(messageId: string, wasHelpful: boolean) {
    const { data: message } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (!message) throw new Error('Message not found');

    const { error } = await supabase
      .from('chat_messages')
      .update({ was_helpful: wasHelpful })
      .eq('id', messageId);

    if (error) throw error;

    if (message.related_faq_id) {
      await this.trackKnowledgeUsage(message.related_faq_id, wasHelpful);
    }

    return message;
  },

  async escalateToTicket(conversationId: string, additionalInfo?: string) {
    const conversation = await this.getConversation(conversationId);
    const messages = await this.getConversationMessages(conversationId);

    const chatTranscript = messages
      .map(m => `[${m.sender_type.toUpperCase()}]: ${m.message}`)
      .join('\n\n');

    const firstUserMessage = messages.find(m => m.sender_type === 'user')?.message || 'Support benötigt';

    const ticketDescription = `${additionalInfo ? additionalInfo + '\n\n' : ''}**Chat-Verlauf:**\n\n${chatTranscript}\n\n---\nEskaliert aus Chat-Conversation: ${conversationId}\nAI-Versuche: ${conversation.ai_resolution_attempts}`;

    const ticketResult = await supportService.createTicket(
      `Chat-Eskalation: ${firstUserMessage.substring(0, 50)}...`,
      ticketDescription
    );

    if (ticketResult.error || !ticketResult.ticket) {
      console.error('Failed to create ticket:', ticketResult.error);
      throw new Error(ticketResult.error || 'Fehler beim Erstellen des Tickets');
    }

    const { error } = await supabase
      .from('chat_conversations')
      .update({
        status: 'escalated',
        ended_at: new Date().toISOString(),
        escalated_to_ticket_id: ticketResult.ticket.id,
        resolution_type: 'escalated',
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Failed to update conversation status:', error);
      throw error;
    }

    await this.sendSystemMessage(
      conversationId,
      `Dein Gespräch wurde an unser Support-Team weitergeleitet. Ticket-Nummer: #${ticketResult.ticket.id.substring(0, 8)}`
    );

    return ticketResult.ticket;
  },

  async endConversation(conversationId: string, resolutionType: 'ai_resolved' | 'user_left' | 'timeout') {
    const { error } = await supabase
      .from('chat_conversations')
      .update({
        status: resolutionType === 'ai_resolved' ? 'resolved' : 'abandoned',
        ended_at: new Date().toISOString(),
        resolution_type: resolutionType,
      })
      .eq('id', conversationId);

    if (error) throw error;
  },

  async rateSatisfaction(conversationId: string, rating: number, wasHelpful: boolean) {
    const { error } = await supabase
      .from('chat_conversations')
      .update({
        satisfaction_rating: rating,
        was_helpful: wasHelpful,
      })
      .eq('id', conversationId);

    if (error) throw error;
  },

  async getUserConversations(limit: number = 10) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ChatConversation[];
  },

  async getChatAnalytics(daysBack: number = 7) {
    const { data, error } = await supabase.rpc('get_chat_analytics', { days_back: daysBack });

    if (error) throw error;
    return data;
  },

  async addKnowledgeBaseEntry(entry: Omit<KnowledgeBaseEntry, 'id' | 'usage_count' | 'success_count' | 'failure_count' | 'success_rate' | 'created_at' | 'last_updated' | 'last_used_at'>) {
    const { data, error } = await supabase
      .from('chat_knowledge_base')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data as KnowledgeBaseEntry;
  },

  async updateKnowledgeBaseEntry(id: string, updates: Partial<KnowledgeBaseEntry>) {
    const { data, error } = await supabase
      .from('chat_knowledge_base')
      .update({
        ...updates,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as KnowledgeBaseEntry;
  },

  async getKnowledgeBase(filters?: { category?: string; source?: string; is_active?: boolean }) {
    let query = supabase
      .from('chat_knowledge_base')
      .select('*')
      .order('success_rate', { ascending: false })
      .order('priority', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as KnowledgeBaseEntry[];
  },

  async learnFromTicket(ticketId: string) {
    const { error } = await supabase.rpc('learn_from_ticket', { ticket_id: ticketId });

    if (error) throw error;
  },

  async getTopUnresolvedTopics(limit: number = 10) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*, chat_messages!inner(*)')
      .eq('status', 'escalated')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const topics = data.map(conv => {
      const firstUserMessage = (conv as any).chat_messages?.find((m: any) => m.sender_type === 'user')?.message;
      return {
        conversation_id: conv.id,
        topic: firstUserMessage?.substring(0, 100) || 'Unknown',
        escalated_at: conv.ended_at,
        ticket_id: conv.escalated_to_ticket_id,
      };
    });

    return topics;
  },

  // =====================================================
  // FEEDBACK LEARNING SYSTEM
  // =====================================================

  async handleNegativeFeedback(
    messageId: string,
    feedbackType: 'incorrect' | 'incomplete' | 'unclear' | 'outdated' | 'other',
    feedbackText?: string,
    correctAnswer?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('handle_negative_feedback', {
      p_message_id: messageId,
      p_feedback_type: feedbackType,
      p_feedback_text: feedbackText || null,
      p_correct_answer: correctAnswer || null,
    });

    if (error) throw error;
    return data as string;
  },

  async generateImprovedResponse(
    feedbackId: string,
    originalQuestion: string,
    feedbackContext: string
  ): Promise<ChatMessage> {
    const { data: feedback, error: feedbackError } = await supabase
      .from('chat_feedback_details')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      console.error('Error fetching feedback:', feedbackError);
      throw new Error('Feedback nicht gefunden');
    }

    const conversationId = feedback.conversation_id;
    const messages = await this.getConversationMessages(conversationId);

    const enhancedPrompt = `Vorherige Antwort war nicht hilfreich. User-Feedback: "${feedbackContext}".
Bitte gib eine verbesserte, detailliertere Antwort auf die Frage: "${originalQuestion}"`;

    try {
      const gptResponse = await this.callGPTChat(conversationId, enhancedPrompt, messages);
      const improvedText = gptResponse?.response || 'Entschuldigung, ich konnte keine verbesserte Antwort generieren.';

      const { data: improvedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'ai',
          message: `📝 Hier eine verbesserte Antwort:\n\n${improvedText}`,
          ai_confidence_score: gptResponse?.confidence || 0.75,
          metadata: {
            source: 'improved_from_feedback',
            feedback_id: feedbackId,
            original_message_id: feedback.message_id,
          },
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('chat_feedback_details')
        .update({
          retry_attempted: true,
          improved_answer: improvedText,
          improved_answer_message_id: improvedMessage.id,
        })
        .eq('id', feedbackId);

      return improvedMessage as ChatMessage;
    } catch (error) {
      console.error('Error generating improved response:', error);
      throw error;
    }
  },

  async markImprovedAnswerHelpful(feedbackId: string, wasHelpful: boolean) {
    const { error } = await supabase
      .from('chat_feedback_details')
      .update({ improved_answer_helpful: wasHelpful })
      .eq('id', feedbackId);

    if (error) throw error;

    if (wasHelpful) {
      await this.createLearningFromFeedback(feedbackId, true);
    }
  },

  async createLearningFromFeedback(feedbackId: string, autoApprove: boolean = false) {
    const { data, error } = await supabase.rpc('create_learning_from_feedback', {
      p_feedback_id: feedbackId,
      p_auto_approve: autoApprove,
    });

    if (error) throw error;
    return data as string;
  },

  async trackRecurringQuestion(
    question: string,
    category: string = 'general',
    wasSuccessful: boolean = false,
    gptResponse?: string
  ) {
    const { error } = await supabase.rpc('track_recurring_question', {
      p_question: question,
      p_category: category,
      p_was_successful: wasSuccessful,
      p_gpt_response: gptResponse || null,
    });

    if (error) console.error('Error tracking recurring question:', error);
  },

  async getLearningQueue(status?: 'pending' | 'approved' | 'rejected' | 'auto_approved', limit: number = 50) {
    let query = supabase
      .from('chat_learning_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LearningQueueEntry[];
  },

  async approveLearningEntry(queueId: string, notes?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('approve_learning_queue_entry', {
      p_queue_id: queueId,
      p_admin_user_id: user.id,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data as string;
  },

  async rejectLearningEntry(queueId: string, reason?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('chat_learning_queue')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reason,
      })
      .eq('id', queueId);

    if (error) throw error;
  },

  async getLearningAnalytics(daysBack: number = 30) {
    const { data, error } = await supabase.rpc('get_learning_analytics', {
      p_days_back: daysBack,
    });

    if (error) throw error;
    return data;
  },

  async autoLearnFromSuccessPattern() {
    const { data, error } = await supabase.rpc('auto_learn_from_success_pattern');

    if (error) throw error;
    return data;
  },

  async deactivateLowPerformingKnowledge() {
    const { data, error } = await supabase.rpc('deactivate_low_performing_knowledge');

    if (error) throw error;
    return data;
  },

  async getRecurringQuestions(limit: number = 50) {
    const { data, error } = await supabase
      .from('chat_recurring_questions')
      .select('*')
      .order('ask_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as RecurringQuestion[];
  },

  async getRecurringQuestionsSuggestedForLearning(limit: number = 20) {
    const { data, error } = await supabase
      .from('chat_recurring_questions')
      .select('*')
      .eq('suggested_for_learning', true)
      .eq('has_knowledge_entry', false)
      .order('learning_priority', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as RecurringQuestion[];
  },

  async getUserFeedbackHistory(limit: number = 20) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_feedback_details')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ChatFeedbackDetail[];
  },

  async getKnowledgeHistory(knowledgeId: string) {
    const { data, error } = await supabase
      .from('chat_knowledge_history')
      .select('*')
      .eq('knowledge_id', knowledgeId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data;
  },
};
