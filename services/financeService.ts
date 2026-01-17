import { supabase } from '@/lib/supabase';

export interface FinanceOverview {
  coins_in_circulation: number;
  system_reserve: number;
  total_purchases_eur: number;
  total_payouts_eur: number;
  pending_payouts_count: number;
  pending_payouts_eur: number;
  today_purchases_eur: number;
  net_revenue_eur: number;
}

export const getFinanceOverview = async (): Promise<FinanceOverview | null> => {
  try {
    const { data, error } = await supabase.rpc('get_finance_overview');
    if (error) {
      console.error('Error fetching finance overview:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    return null;
  }
};

export const getCoinValue = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'coin_value_eur')
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching coin value:', error);
      return 0.001;
    }
    return parseFloat(data.value);
  } catch (error) {
    console.error('Error fetching coin value:', error);
    return 0.001;
  }
};

export const updateCoinValue = async (newValue: number): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('system_settings')
      .update({
        value: newValue.toString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'coin_value_eur');

    return { error };
  } catch (error) {
    console.error('Error updating coin value:', error);
    return { error };
  }
};

export const getCoinDistribution = async (): Promise<{
  by_source: { [key: string]: number };
  top_holders: { user_id: string; name: string; coins: number }[];
}> => {
  try {
    const { data: bySource, error: sourceError } = await supabase
      .from('coin_transactions')
      .select('type, amount');

    if (sourceError) {
      console.error('Error fetching coin distribution:', sourceError);
      return { by_source: {}, top_holders: [] };
    }

    const distribution: { [key: string]: number } = {};
    bySource?.forEach((tx) => {
      if (tx.amount > 0) {
        distribution[tx.type] = (distribution[tx.type] || 0) + tx.amount;
      }
    });

    const { data: topHolders, error: holdersError } = await supabase
      .from('user_stats')
      .select('user_id, total_coins, profiles!user_stats_user_id_fkey(name)')
      .order('total_coins', { ascending: false })
      .limit(10);

    if (holdersError) {
      console.error('Error fetching top holders:', holdersError);
      return { by_source: distribution, top_holders: [] };
    }

    const holders = topHolders?.map((holder: any) => ({
      user_id: holder.user_id,
      name: holder.profiles?.name || 'Unknown',
      coins: holder.total_coins,
    })) || [];

    return { by_source: distribution, top_holders: holders };
  } catch (error) {
    console.error('Error fetching coin distribution:', error);
    return { by_source: {}, top_holders: [] };
  }
};
