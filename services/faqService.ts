import { supabase } from '@/lib/supabase';

export interface FAQItem {
  id: string;
  category: string;
  question_de: string;
  answer_de: string;
  question_en?: string;
  answer_en?: string;
  question_tr?: string;
  answer_tr?: string;
  tags: string[];
  priority: number;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FAQSuggestion {
  id: string;
  source_type: 'recurring_issue' | 'chat_escalation' | 'manual' | 'ticket_pattern';
  source_id?: string;
  suggested_question: string;
  suggested_answer?: string;
  category?: string;
  frequency: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  reviewed_by?: string;
  reviewed_at?: string;
  implemented_as_faq_id?: string;
  created_at: string;
}

export interface FAQFeedback {
  id: string;
  faq_item_id: string;
  user_id: string;
  was_helpful: boolean;
  feedback_text?: string;
  created_at: string;
}

export const faqService = {
  async getPublishedFAQs(category?: string, language: string = 'de') {
    let query = supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as FAQItem[];
  },

  async searchFAQs(searchTerm: string, language: string = 'de') {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true)
      .or(`question_${language}.ilike.%${searchTerm}%,answer_${language}.ilike.%${searchTerm}%`)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data as FAQItem[];
  },

  async getFAQById(id: string) {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as FAQItem;
  },

  async incrementViewCount(id: string) {
    const { error } = await supabase.rpc('increment_faq_view', { faq_id: id });
    if (error) throw error;
  },

  async submitFeedback(faqId: string, wasHelpful: boolean, feedbackText?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('faq_user_feedback')
      .upsert({
        faq_item_id: faqId,
        user_id: user.id,
        was_helpful: wasHelpful,
        feedback_text: feedbackText,
      }, {
        onConflict: 'faq_item_id,user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as FAQFeedback;
  },

  async getUserFeedback(faqId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('faq_user_feedback')
      .select('*')
      .eq('faq_item_id', faqId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as FAQFeedback | null;
  },

  async getAllFAQs() {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as FAQItem[];
  },

  async createFAQ(faq: Omit<FAQItem, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'helpful_count' | 'not_helpful_count' | 'created_by'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('faq_items')
      .insert({
        ...faq,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as FAQItem;
  },

  async updateFAQ(id: string, updates: Partial<FAQItem>) {
    const { data, error } = await supabase
      .from('faq_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FAQItem;
  },

  async deleteFAQ(id: string) {
    const { error } = await supabase
      .from('faq_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getFAQSuggestions(status?: string) {
    let query = supabase
      .from('faq_suggestions')
      .select('*')
      .order('frequency', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as FAQSuggestion[];
  },

  async createFAQSuggestion(suggestion: Omit<FAQSuggestion, 'id' | 'created_at' | 'frequency' | 'status' | 'reviewed_by' | 'reviewed_at' | 'implemented_as_faq_id'>) {
    const { data, error } = await supabase
      .from('faq_suggestions')
      .insert(suggestion)
      .select()
      .single();

    if (error) throw error;
    return data as FAQSuggestion;
  },

  async updateSuggestionStatus(id: string, status: 'approved' | 'rejected' | 'implemented', implementedAsFaqId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('faq_suggestions')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        implemented_as_faq_id: implementedAsFaqId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FAQSuggestion;
  },

  async implementSuggestion(suggestionId: string, faqData: Partial<FAQItem>) {
    const suggestion = await this.getFAQSuggestions();
    const targetSuggestion = suggestion.find(s => s.id === suggestionId);

    if (!targetSuggestion) throw new Error('Suggestion not found');

    const newFAQ = await this.createFAQ({
      category: faqData.category || targetSuggestion.category || 'general',
      question_de: faqData.question_de || targetSuggestion.suggested_question,
      answer_de: faqData.answer_de || targetSuggestion.suggested_answer || '',
      question_en: faqData.question_en,
      answer_en: faqData.answer_en,
      question_tr: faqData.question_tr,
      answer_tr: faqData.answer_tr,
      tags: faqData.tags || [],
      priority: faqData.priority || 0,
      is_published: faqData.is_published || false,
    });

    await this.updateSuggestionStatus(suggestionId, 'implemented', newFAQ.id);

    return newFAQ;
  },

  async getFAQCategories() {
    const { data, error } = await supabase
      .from('faq_items')
      .select('category')
      .eq('is_published', true);

    if (error) throw error;

    const categories = [...new Set(data.map(item => item.category))];
    return categories;
  },

  async getFAQStats() {
    const { data, error } = await supabase
      .from('faq_items')
      .select('view_count, helpful_count, not_helpful_count, is_published');

    if (error) throw error;

    const stats = {
      total: data.length,
      published: data.filter(item => item.is_published).length,
      totalViews: data.reduce((sum, item) => sum + item.view_count, 0),
      totalHelpful: data.reduce((sum, item) => sum + item.helpful_count, 0),
      totalNotHelpful: data.reduce((sum, item) => sum + item.not_helpful_count, 0),
    };

    return {
      ...stats,
      helpfulRate: stats.totalHelpful + stats.totalNotHelpful > 0
        ? (stats.totalHelpful / (stats.totalHelpful + stats.totalNotHelpful) * 100).toFixed(2)
        : 0,
    };
  },
};
