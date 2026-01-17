import { supabase } from '@/lib/supabase';

export interface DunningCase {
  id: string;
  subscription_id: string;
  user_id: string;
  status: 'open' | 'paid' | 'forwarded_to_collection' | 'written_off' | 'closed';
  dunning_level: number;
  principal_amount: number;
  late_fees: number;
  interest_amount: number;
  total_amount: number;
  first_dunning_sent_at: string | null;
  second_dunning_sent_at: string | null;
  third_dunning_sent_at: string | null;
  next_action_date: string | null;
  overdue_days: number;
  interest_start_date: string | null;
  interest_rate: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DunningLetter {
  id: string;
  dunning_case_id: string;
  user_id: string;
  subscription_id: string;
  dunning_level: number;
  letter_number: string | null;
  amount_claimed: number;
  late_fee: number;
  interest_amount: number;
  letter_pdf_url: string | null;
  letter_content: string | null;
  sent_at: string;
  sent_via: 'email' | 'postal_mail' | 'both';
  email_delivered: boolean;
  email_opened: boolean;
  email_error: string | null;
  payment_deadline: string;
  paid_at: string | null;
  payment_amount: number | null;
  metadata: any;
  created_at: string;
}

class DunningService {
  async getDunningCase(userId: string): Promise<DunningCase | null> {
    try {
      const { data, error } = await supabase
        .from('dunning_cases')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dunning case:', error);
      return null;
    }
  }

  async getDunningLetters(dunningCaseId: string): Promise<DunningLetter[]> {
    try {
      const { data, error } = await supabase
        .from('dunning_letters')
        .select('*')
        .eq('dunning_case_id', dunningCaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dunning letters:', error);
      return [];
    }
  }

  async createDunningCase(subscriptionId: string, userId: string, principalAmount: number): Promise<DunningCase | null> {
    try {
      const { data, error } = await supabase
        .from('dunning_cases')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          principal_amount: principalAmount,
          interest_start_date: new Date().toISOString(),
          next_action_date: this.calculateNextActionDate(1),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating dunning case:', error);
      return null;
    }
  }

  async sendDunningLetter(dunningCaseId: string, level: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-dunning-letter', {
        body: {
          dunningCaseId,
          level,
        },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending dunning letter:', error);
      return false;
    }
  }

  async updateDunningLevel(dunningCaseId: string, newLevel: number): Promise<boolean> {
    try {
      const updates: any = {
        dunning_level: newLevel,
        next_action_date: newLevel < 3 ? this.calculateNextActionDate(newLevel + 1) : null,
      };

      if (newLevel === 1) {
        updates.first_dunning_sent_at = new Date().toISOString();
      } else if (newLevel === 2) {
        updates.second_dunning_sent_at = new Date().toISOString();
      } else if (newLevel === 3) {
        updates.third_dunning_sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('dunning_cases')
        .update(updates)
        .eq('id', dunningCaseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating dunning level:', error);
      return false;
    }
  }

  async markAsPaid(dunningCaseId: string, paymentAmount: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dunning_cases')
        .update({
          status: 'paid',
        })
        .eq('id', dunningCaseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking as paid:', error);
      return false;
    }
  }

  calculateNextActionDate(currentLevel: number): string {
    const now = new Date();
    let daysToAdd = 0;

    if (currentLevel === 1) {
      daysToAdd = 7;
    } else if (currentLevel === 2) {
      daysToAdd = 14;
    } else if (currentLevel === 3) {
      daysToAdd = 14;
    }

    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString();
  }

  formatAmount(amountInCents: number): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  getDunningFee(level: number): number {
    const fees = {
      1: 500,
      2: 1000,
      3: 1500,
    };
    return fees[level as keyof typeof fees] || 0;
  }

  getCumulativeFees(level: number): number {
    let total = 0;
    for (let i = 1; i <= level; i++) {
      total += this.getDunningFee(i);
    }
    return total;
  }

  async getAllOpenCases(adminOnly = true): Promise<DunningCase[]> {
    try {
      const { data, error } = await supabase
        .from('dunning_cases')
        .select('*, profiles!inner(first_name, last_name, email)')
        .eq('status', 'open')
        .order('dunning_level', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all open cases:', error);
      return [];
    }
  }

  async getCasesReadyForCollection(): Promise<DunningCase[]> {
    try {
      const { data, error } = await supabase
        .from('dunning_cases')
        .select('*, profiles!inner(first_name, last_name, email, billing_data_complete)')
        .eq('status', 'open')
        .eq('dunning_level', 3)
        .not('third_dunning_sent_at', 'is', null)
        .order('third_dunning_sent_at', { ascending: true });

      if (error) throw error;

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      return (data || []).filter((c: any) => {
        const thirdSent = new Date(c.third_dunning_sent_at);
        return thirdSent < fourteenDaysAgo;
      });
    } catch (error) {
      console.error('Error fetching cases ready for collection:', error);
      return [];
    }
  }

  async forwardToCollection(dunningCaseId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dunning_cases')
        .update({
          status: 'forwarded_to_collection',
        })
        .eq('id', dunningCaseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error forwarding to collection:', error);
      return false;
    }
  }
}

export const dunningService = new DunningService();
