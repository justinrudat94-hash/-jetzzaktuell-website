import { supabase } from '@/lib/supabase';

export interface KYCStatus {
  required: boolean;
  status: 'not_started' | 'pending' | 'verified' | 'failed' | null;
  verifiedAt: string | null;
  lastAttempt: string | null;
  lifetimeEarnings: number;
}

export interface VerificationSessionResponse {
  client_secret: string;
  verification_url: string;
  session_id: string;
  status: string;
}

export const kycService = {
  async checkKYCStatus(userId: string): Promise<KYCStatus | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_required, kyc_verification_status, kyc_verified_at, kyc_verification_last_attempt, lifetime_earnings')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking KYC status:', error);
        return null;
      }

      if (!data) return null;

      return {
        required: data.kyc_required || false,
        status: data.kyc_verification_status,
        verifiedAt: data.kyc_verified_at,
        lastAttempt: data.kyc_verification_last_attempt,
        lifetimeEarnings: data.lifetime_earnings || 0,
      };
    } catch (error) {
      console.error('Error in checkKYCStatus:', error);
      return null;
    }
  },

  async createVerificationSession(): Promise<VerificationSessionResponse | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-identity-verification`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create verification session');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating verification session:', error);
      throw error;
    }
  },

  async updateLifetimeEarnings(userId: string, amount: number): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('lifetime_earnings, kyc_required')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) return;

      const newLifetimeEarnings = (profile.lifetime_earnings || 0) + amount;
      const KYC_THRESHOLD = 100000;

      const updateData: any = {
        lifetime_earnings: newLifetimeEarnings,
      };

      if (newLifetimeEarnings >= KYC_THRESHOLD && !profile.kyc_required) {
        updateData.kyc_required = true;
        updateData.kyc_verification_status = 'not_started';
      }

      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

    } catch (error) {
      console.error('Error updating lifetime earnings:', error);
    }
  },

  async markKYCRequired(userId: string): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('kyc_required, kyc_verification_status')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) return;

      if (!profile.kyc_required || !profile.kyc_verification_status) {
        await supabase
          .from('profiles')
          .update({
            kyc_required: true,
            kyc_verification_status: 'not_started',
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error marking KYC required:', error);
    }
  },

  shouldShowKYCBanner(kycStatus: KYCStatus | null): boolean {
    if (!kycStatus) return false;

    if (!kycStatus.required) return false;

    if (kycStatus.status === 'verified') return false;

    return true;
  },

  shouldBlockAction(kycStatus: KYCStatus | null): boolean {
    if (!kycStatus) return false;

    if (!kycStatus.required) return false;

    if (kycStatus.status === 'verified') return false;

    const KYC_GRACE_PERIOD_DAYS = 7;
    if (kycStatus.lastAttempt) {
      const lastAttemptDate = new Date(kycStatus.lastAttempt);
      const daysSinceAttempt = (Date.now() - lastAttemptDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceAttempt < KYC_GRACE_PERIOD_DAYS) {
        return false;
      }
    }

    return true;
  },

  async getVerificationDetails(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_verified_first_name, kyc_verified_last_name, kyc_verified_dob, kyc_verified_address, kyc_verified_at')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        firstName: data.kyc_verified_first_name,
        lastName: data.kyc_verified_last_name,
        dob: data.kyc_verified_dob,
        address: data.kyc_verified_address ? JSON.parse(data.kyc_verified_address) : null,
        verifiedAt: data.kyc_verified_at,
      };
    } catch (error) {
      console.error('Error getting verification details:', error);
      return null;
    }
  },
};
