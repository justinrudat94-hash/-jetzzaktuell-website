import { supabase } from '@/lib/supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  ai_category_confidence: number;
  related_issue_count: number;
  is_recurring: boolean;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_favorite?: boolean;
  waiting_for?: 'admin' | 'user' | 'none';
  last_admin_response_at?: string | null;
  admin_read_at?: string | null;
}

export interface FolderStats {
  new_count: number;
  waiting_admin_count: number;
  waiting_user_count: number;
  favorites_count: number;
  closed_today_count: number;
  urgent_count: number;
  overdue_count: number;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  is_admin_response: boolean;
  message: string;
  created_at: string;
}

export interface RecurringIssue {
  id: string;
  issue_pattern: string;
  category: string;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  admin_notified: boolean;
}

export interface TicketWithUser extends SupportTicket {
  user?: {
    username: string;
    email: string;
  };
  response_count?: number;
  last_response?: string;
}

export const supportService = {
  async categorizeWithAI(subject: string, description: string): Promise<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    confidence: number;
  }> {
    const text = `${subject} ${description}`.toLowerCase();

    let category = 'general';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let confidence = 0.5;

    // Kategorie-Erkennung
    if (text.includes('bug') || text.includes('fehler') || text.includes('error') || text.includes('funktioniert nicht')) {
      category = 'technical';
      priority = 'high';
      confidence = 0.85;
    } else if (text.includes('coin') || text.includes('münz') || text.includes('zahlung') || text.includes('kaufen')) {
      category = 'coins';
      priority = 'high';
      confidence = 0.9;
    } else if (text.includes('livestream') || text.includes('live') || text.includes('stream')) {
      category = 'livestream';
      priority = 'medium';
      confidence = 0.8;
    } else if (text.includes('account') || text.includes('profil') || text.includes('passwort') || text.includes('login') || text.includes('anmeld')) {
      category = 'account';
      priority = 'high';
      confidence = 0.85;
    } else if (text.includes('gesperrt') || text.includes('ban') || text.includes('suspendiert')) {
      category = 'account';
      priority = 'urgent';
      confidence = 0.9;
    } else if (text.includes('event') || text.includes('veranstalt')) {
      category = 'events';
      priority = 'medium';
      confidence = 0.75;
    } else if (text.includes('report') || text.includes('meld') || text.includes('abuse')) {
      category = 'moderation';
      priority = 'high';
      confidence = 0.8;
    } else if (text.includes('frage') || text.includes('how') || text.includes('wie')) {
      category = 'general';
      priority = 'low';
      confidence = 0.7;
    }

    // Priorität-Anpassung
    if (text.includes('dringend') || text.includes('urgent') || text.includes('sofort') || text.includes('notfall')) {
      priority = 'urgent';
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return { category, priority, confidence };
  },

  async createTicket(data: {
    subject: string;
    description: string;
    category?: string;
  }): Promise<SupportTicket> {
    const { subject, description, category } = data;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nicht angemeldet');
    }

    if (subject.length < 3 || subject.length > 200) {
      throw new Error('Betreff muss zwischen 3 und 200 Zeichen lang sein');
    }

    if (description.length < 10 || description.length > 2000) {
      throw new Error('Beschreibung muss zwischen 10 und 2000 Zeichen lang sein');
    }

    const { count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (count && count >= 5) {
      throw new Error('Du kannst maximal 5 Anfragen pro Stunde erstellen');
    }

    const aiResult = await this.categorizeWithAI(subject, description);

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        description,
        category: category || aiResult.category,
        priority: aiResult.priority,
        ai_category_confidence: aiResult.confidence,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw new Error('Fehler beim Erstellen des Tickets');
    }

    await this.sendTicketEmail(ticket.id, 'ticket_created');

    return ticket;
  },

  async getUserTickets(): Promise<SupportTicket[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tickets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTickets:', error);
      return [];
    }
  },

  async getAllTickets(filter?: {
    status?: string;
    priority?: string;
    category?: string;
    assigned?: boolean;
  }): Promise<TicketWithUser[]> {
    try {
      // First, get tickets without join to avoid RLS issues
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.priority) {
        query = query.eq('priority', filter.priority);
      }
      if (filter?.category) {
        query = query.eq('category', filter.category);
      }
      if (filter?.assigned !== undefined) {
        if (filter.assigned) {
          query = query.not('assigned_to', 'is', null);
        } else {
          query = query.is('assigned_to', null);
        }
      }

      const { data: tickets, error: ticketsError } = await query;

      if (ticketsError) {
        console.error('Error fetching all tickets:', ticketsError);
        console.error('Error details:', JSON.stringify(ticketsError));
        return [];
      }

      if (!tickets || tickets.length === 0) {
        console.log('No tickets found');
        return [];
      }

      console.log(`Found ${tickets.length} tickets`);

      // Now fetch user data separately
      const userIds = tickets.map(t => t.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return tickets without user data
        return tickets.map(ticket => ({
          ...ticket,
          user: undefined,
        }));
      }

      // Map profiles to tickets
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return tickets.map(ticket => {
        const profile = profileMap.get(ticket.user_id);
        return {
          ...ticket,
          user: profile ? {
            username: profile.username,
            email: profile.email,
          } : undefined,
        };
      });
    } catch (error) {
      console.error('Error in getAllTickets:', error);
      return [];
    }
  },

  async getTicketById(ticketId: string): Promise<TicketWithUser | null> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!support_tickets_user_id_fkey (
            username,
            email
          )
        `)
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching ticket:', error);
        return null;
      }

      return {
        ...data,
        user: data.profiles ? {
          username: data.profiles.username,
          email: data.profiles.email,
        } : undefined,
      };
    } catch (error) {
      console.error('Error in getTicketById:', error);
      return null;
    }
  },

  async getTicketResponses(ticketId: string): Promise<TicketResponse[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching responses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTicketResponses:', error);
      return [];
    }
  },

  async addResponse(ticketId: string, message: string, isAdmin: boolean = false): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_admin_response: isAdmin,
        });

      if (error) {
        console.error('Error adding response:', error);
        return false;
      }

      // Update ticket timestamp
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return true;
    } catch (error) {
      console.error('Error in addResponse:', error);
      return false;
    }
  },

  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  ): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTicketStatus:', error);
      return false;
    }
  },

  async assignTicket(ticketId: string, adminId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: adminId,
          status: adminId ? 'in_progress' : 'open',
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error assigning ticket:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in assignTicket:', error);
      return false;
    }
  },

  async updateTicketPriority(ticketId: string, priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority })
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating priority:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTicketPriority:', error);
      return false;
    }
  },

  async getRecurringIssues(): Promise<RecurringIssue[]> {
    try {
      const { data, error } = await supabase
        .from('recurring_issues')
        .select('*')
        .order('occurrence_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching recurring issues:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecurringIssues:', error);
      return [];
    }
  },

  async getDashboardStats(): Promise<{
    total_open: number;
    total_in_progress: number;
    total_unassigned: number;
    total_urgent: number;
    recurring_issues: number;
  }> {
    try {
      const { count: openCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      const { count: inProgressCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: unassignedCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .is('assigned_to', null)
        .in('status', ['open', 'in_progress']);

      const { count: urgentCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'urgent')
        .in('status', ['open', 'in_progress']);

      const { count: recurringCount } = await supabase
        .from('recurring_issues')
        .select('*', { count: 'exact', head: true })
        .gte('occurrence_count', 3);

      return {
        total_open: openCount || 0,
        total_in_progress: inProgressCount || 0,
        total_unassigned: unassignedCount || 0,
        total_urgent: urgentCount || 0,
        recurring_issues: recurringCount || 0,
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return {
        total_open: 0,
        total_in_progress: 0,
        total_unassigned: 0,
        total_urgent: 0,
        recurring_issues: 0,
      };
    }
  },

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      technical: 'Technisch',
      coins: 'Coins & Zahlung',
      livestream: 'Livestream',
      account: 'Account',
      events: 'Events',
      moderation: 'Moderation',
      general: 'Allgemein',
    };
    return labels[category] || category;
  },

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      urgent: 'Dringend',
    };
    return labels[priority] || priority;
  },

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting: 'Wartend',
      resolved: 'Gelöst',
      closed: 'Geschlossen',
    };
    return labels[status] || status;
  },

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626',
    };
    return colors[priority] || '#6B7280';
  },

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      open: '#3B82F6',
      in_progress: '#F59E0B',
      waiting: '#6B7280',
      resolved: '#10B981',
      closed: '#6B7280',
    };
    return colors[status] || '#6B7280';
  },

  async generateAIResponse(ticketId: string): Promise<{
    success: boolean;
    response?: string;
    confidence?: number;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-ticket-response`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticketId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'KI-Generierung fehlgeschlagen' };
      }

      const data = await response.json();
      return {
        success: true,
        response: data.response,
        confidence: data.confidence,
      };
    } catch (error: any) {
      console.error('Error generating AI response:', error);
      return { success: false, error: error.message || 'Netzwerkfehler' };
    }
  },

  async sendTicketEmail(
    ticketId: string,
    type: 'ticket_created' | 'admin_response' | 'ticket_closed' | 'status_update' | 'auto_closed' | 'reopen',
    customMessage?: string
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-ticket-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticketId, type, customMessage }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error sending ticket email:', error);
      return false;
    }
  },

  async addResponseWithEmail(
    ticketId: string,
    message: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    try {
      const success = await this.addResponse(ticketId, message, isAdmin);
      if (!success) return false;

      if (isAdmin) {
        await this.sendTicketEmail(ticketId, 'admin_response', message);
      }

      return true;
    } catch (error) {
      console.error('Error in addResponseWithEmail:', error);
      return false;
    }
  },

  async closeTicket(
    ticketId: string,
    closingMessage?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status: 'closed',
        closed_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      };

      if (closingMessage) {
        updateData.closing_message = closingMessage;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('Error closing ticket:', error);
        return false;
      }

      await this.sendTicketEmail(ticketId, 'ticket_closed', closingMessage);

      return true;
    } catch (error) {
      console.error('Error in closeTicket:', error);
      return false;
    }
  },

  async reopenTicket(ticketId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          closed_at: null,
          closing_message: null,
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error reopening ticket:', error);
        return false;
      }

      await this.sendTicketEmail(ticketId, 'reopen');

      return true;
    } catch (error) {
      console.error('Error in reopenTicket:', error);
      return false;
    }
  },

  async getTemplates(category?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('admin_response_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplates:', error);
      return [];
    }
  },

  async createTemplate(data: {
    template_name: string;
    template_text: string;
    category?: string;
  }): Promise<{ success: boolean; template?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const { data: template, error } = await supabase
        .from('admin_response_templates')
        .insert({
          template_name: data.template_name,
          template_text: data.template_text,
          category: data.category || 'general',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        return { success: false, error: error.message };
      }

      return { success: true, template };
    } catch (error: any) {
      console.error('Error in createTemplate:', error);
      return { success: false, error: error.message || 'Unerwarteter Fehler' };
    }
  },

  async updateTemplate(
    templateId: string,
    data: {
      template_name?: string;
      template_text?: string;
      category?: string;
      is_active?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_response_templates')
        .update(data)
        .eq('id', templateId);

      if (error) {
        console.error('Error updating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      return false;
    }
  },

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_response_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      return false;
    }
  },

  async incrementTemplateUsage(templateId: string): Promise<boolean> {
    try {
      const { data: template } = await supabase
        .from('admin_response_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      if (!template) return false;

      const { error } = await supabase
        .from('admin_response_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);

      if (error) {
        console.error('Error incrementing template usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in incrementTemplateUsage:', error);
      return false;
    }
  },

  async getRecurringIssuesWithSolutions(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_recurring_issues_with_solutions');

      if (error) {
        console.error('Error fetching recurring issues with solutions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecurringIssuesWithSolutions:', error);
      return [];
    }
  },

  async getFAQSuggestions(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('suggest_faq_from_recurring');

      if (error) {
        console.error('Error fetching FAQ suggestions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFAQSuggestions:', error);
      return [];
    }
  },

  async createFAQFromSolution(solutionId: string): Promise<{ success: boolean; faqId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_knowledge_from_ticket', {
        p_solution_id: solutionId
      });

      if (error) {
        console.error('Error creating FAQ from solution:', error);
        return { success: false, error: error.message };
      }

      return { success: true, faqId: data };
    } catch (error: any) {
      console.error('Error in createFAQFromSolution:', error);
      return { success: false, error: error.message || 'Unerwarteter Fehler' };
    }
  },

  async getAIResponses(ticketId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching AI responses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAIResponses:', error);
      return [];
    }
  },

  async markAIResponseAsUsed(
    aiResponseId: string,
    wasEdited: boolean = false,
    editedResponse?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        was_used: true,
        was_edited: wasEdited,
      };

      if (wasEdited && editedResponse) {
        updateData.edited_response = editedResponse;
      }

      const { error } = await supabase
        .from('ai_ticket_responses')
        .update(updateData)
        .eq('id', aiResponseId);

      if (error) {
        console.error('Error marking AI response as used:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAIResponseAsUsed:', error);
      return false;
    }
  },

  async getTicketStatistics(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_ticket_statistics', {
        p_admin_id: user.id
      });

      if (error) {
        console.error('Error fetching ticket statistics:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error in getTicketStatistics:', error);
      return null;
    }
  },

  async getTicketsByFolder(
    folderName: 'new' | 'waiting_admin' | 'waiting_user' | 'favorites' | 'closed' | 'all',
    adminId?: string
  ): Promise<TicketWithUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_tickets_by_folder', {
        p_folder_name: folderName,
        p_admin_id: adminId || null
      });

      if (error) {
        console.error('Error fetching tickets by folder:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTicketsByFolder:', error);
      return [];
    }
  },

  async getFolderStats(adminId?: string): Promise<FolderStats> {
    try {
      const { data, error } = await supabase.rpc('get_folder_stats', {
        p_admin_id: adminId || null
      });

      if (error) {
        console.error('Error fetching folder stats:', error);
        return {
          new_count: 0,
          waiting_admin_count: 0,
          waiting_user_count: 0,
          favorites_count: 0,
          closed_today_count: 0,
          urgent_count: 0,
          overdue_count: 0,
        };
      }

      return data && data.length > 0 ? data[0] : {
        new_count: 0,
        waiting_admin_count: 0,
        waiting_user_count: 0,
        favorites_count: 0,
        closed_today_count: 0,
        urgent_count: 0,
        overdue_count: 0,
      };
    } catch (error) {
      console.error('Error in getFolderStats:', error);
      return {
        new_count: 0,
        waiting_admin_count: 0,
        waiting_user_count: 0,
        favorites_count: 0,
        closed_today_count: 0,
        urgent_count: 0,
        overdue_count: 0,
      };
    }
  },

  async toggleFavorite(ticketId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('toggle_ticket_favorite', {
        ticket_id: ticketId
      });

      if (error) {
        console.error('Error toggling favorite:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return false;
    }
  },

  async markTicketRead(ticketId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_ticket_read', {
        ticket_id: ticketId
      });

      if (error) {
        console.error('Error marking ticket as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markTicketRead:', error);
      return false;
    }
  },

  getWaitingLabel(waitingFor: string): string {
    const labels: { [key: string]: string } = {
      admin: 'Warte auf Admin',
      user: 'Warte auf User',
      none: 'Keine Wartezeit',
    };
    return labels[waitingFor] || waitingFor;
  },

  getFolderColor(folderName: string): string {
    const colors: { [key: string]: string } = {
      new: '#EF4444',
      waiting_admin: '#F59E0B',
      waiting_user: '#3B82F6',
      favorites: '#F59E0B',
      closed: '#10B981',
    };
    return colors[folderName] || '#6B7280';
  },

  getFolderIcon(folderName: string): string {
    const icons: { [key: string]: string } = {
      new: 'alert-circle',
      waiting_admin: 'clock',
      waiting_user: 'message-circle',
      favorites: 'star',
      closed: 'check-circle',
    };
    return icons[folderName] || 'inbox';
  },

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}min`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  },

  isOverdue(ticket: TicketWithUser): boolean {
    if (ticket.waiting_for !== 'admin') return false;

    const referenceTime = ticket.last_admin_response_at || ticket.created_at;
    if (!referenceTime) return false;

    const refDate = new Date(referenceTime);
    const now = new Date();
    const diffHours = (now.getTime() - refDate.getTime()) / 3600000;

    return diffHours > 4;
  },

  getAutoCloseCountdown(lastAdminResponseAt: string | null): string | null {
    if (!lastAdminResponseAt) return null;

    const responseDate = new Date(lastAdminResponseAt);
    const closeDate = new Date(responseDate.getTime() + 48 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = closeDate.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `in ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `in ${diffDays}d`;
  },
};
