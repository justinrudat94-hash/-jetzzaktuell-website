import { supabase } from '@/lib/supabase';

export interface PayoutRequest {
  id: string;
  user_id: string;
  coins_amount: number;
  eur_amount: number;
  coin_rate: number;
  status: 'pending' | 'reviewing' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  payout_method: 'paypal' | 'bank_transfer';
  payout_details: any;
  kyc_verified: boolean;
  fraud_score: number;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
    avatar_url: string;
  };
}

export const requestPayout = async (
  coinsAmount: number,
  payoutMethod: 'paypal' | 'bank_transfer',
  payoutDetails: any
): Promise<{ success: boolean; error?: any; payout_id?: string; eur_amount?: number; fraud_score?: number; kyc_required?: boolean }> => {
  try {
    const { data, error } = await supabase.rpc('request_payout', {
      p_coins_amount: coinsAmount,
      p_payout_method: payoutMethod,
      p_payout_details: payoutDetails,
    });

    if (error) {
      return { success: false, error };
    }
    return data;
  } catch (error) {
    console.error('Error requesting payout:', error);
    return { success: false, error };
  }
};

export const getPayoutRequests = async (filters: { user_id?: string; status?: string; limit?: number; offset?: number } = {}): Promise<PayoutRequest[]> => {
  try {
    let query = supabase
      .from('payout_requests')
      .select('*, profiles!payout_requests_user_id_fkey(name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching payout requests:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    return [];
  }
};

export const getPayoutRequest = async (payoutId: string): Promise<PayoutRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('payout_requests')
      .select('*, profiles!payout_requests_user_id_fkey(name, email, avatar_url)')
      .eq('id', payoutId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching payout request:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching payout request:', error);
    return null;
  }
};

export const updatePayoutStatus = async (payoutId: string, status: PayoutRequest['status'], notes?: string): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) updateData.notes = notes;

    if (status === 'reviewing' || status === 'approved' || status === 'rejected') {
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutId);

    return { error };
  } catch (error) {
    console.error('Error updating payout status:', error);
    return { error };
  }
};

export const getPayoutStatistics = async (userId?: string): Promise<any> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const targetUserId = userId || user.id;
    const { data, error } = await supabase
      .from('payout_statistics')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching payout statistics:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching payout statistics:', error);
    return null;
  }
};

export const getPayoutQueue = async (): Promise<{
  pending: PayoutRequest[];
  reviewing: PayoutRequest[];
  high_priority: PayoutRequest[];
}> => {
  try {
    const pending = await getPayoutRequests({ status: 'pending' });
    const reviewing = await getPayoutRequests({ status: 'reviewing' });
    const highPriority = [...pending, ...reviewing].filter(
      (p) => parseFloat(p.eur_amount.toString()) >= 200 || p.fraud_score >= 75
    );

    return { pending, reviewing, high_priority: highPriority };
  } catch (error) {
    console.error('Error fetching payout queue:', error);
    return { pending: [], reviewing: [], high_priority: [] };
  }
};
