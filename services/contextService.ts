import { supabase } from '../lib/supabase';

interface ConversationContext {
  id: string;
  current_problem: string;
  status: string;
  priority: string;
  context_data: any;
  last_updated: string;
  created_at: string;
}

interface OpenTask {
  id: string;
  task_name: string;
  description?: string;
  status: string;
  related_files?: string[];
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface Decision {
  id: string;
  decision: string;
  reason: string;
  impact?: string;
  files_affected?: string[];
  created_at: string;
}

export const contextService = {
  // Aktuellen Kontext abrufen
  async getCurrentContext(): Promise<ConversationContext | null> {
    const { data, error } = await supabase
      .from('conversation_context')
      .select('*')
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Kontext updaten
  async updateContext(
    problem: string,
    status: string = 'in_progress',
    priority: string = 'medium',
    contextData: any = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('conversation_context')
      .insert({
        current_problem: problem,
        status,
        priority,
        context_data: contextData,
        last_updated: new Date().toISOString(),
      });

    if (error) throw error;
  },

  // Offene Tasks abrufen
  async getOpenTasks(): Promise<OpenTask[]> {
    const { data, error } = await supabase
      .from('open_tasks')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Task hinzufügen
  async addTask(
    taskName: string,
    description?: string,
    relatedFiles?: string[],
    notes?: string
  ): Promise<void> {
    const { error } = await supabase.from('open_tasks').insert({
      task_name: taskName,
      description,
      related_files: relatedFiles,
      notes,
      status: 'open',
    });

    if (error) throw error;
  },

  // Task abschließen
  async completeTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('open_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) throw error;
  },

  // Entscheidung loggen
  async logDecision(
    decision: string,
    reason: string,
    impact?: string,
    filesAffected?: string[]
  ): Promise<void> {
    const { error } = await supabase.from('decision_log').insert({
      decision,
      reason,
      impact,
      files_affected: filesAffected,
    });

    if (error) throw error;
  },

  // Letzte Entscheidungen abrufen
  async getRecentDecisions(limit: number = 10): Promise<Decision[]> {
    const { data, error } = await supabase
      .from('decision_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Vollständiger Status-Report
  async getFullStatus(): Promise<{
    context: ConversationContext | null;
    openTasks: OpenTask[];
    recentDecisions: Decision[];
  }> {
    const [context, openTasks, recentDecisions] = await Promise.all([
      this.getCurrentContext(),
      this.getOpenTasks(),
      this.getRecentDecisions(5),
    ]);

    return {
      context,
      openTasks,
      recentDecisions,
    };
  },
};
