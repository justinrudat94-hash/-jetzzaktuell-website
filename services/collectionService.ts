import { supabase } from '@/lib/supabase';

export interface CollectionCase {
  id: string;
  dunning_case_id: string;
  subscription_id: string;
  user_id: string;
  status: 'open' | 'forwarded' | 'paid' | 'closed' | 'written_off';
  principal_amount: number;
  late_fees: number;
  interest_amount: number;
  collection_fees: number;
  total_amount: number;
  forwarded_to_collection_at: string | null;
  collection_agency_name: string | null;
  collection_reference_number: string | null;
  collection_agency_email: string | null;
  collection_agency_contact: string | null;
  partial_payments_received: number;
  last_payment_date: string | null;
  admin_notes: string | null;
  internal_status: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data_complete: boolean;
  missing_data: string[];
  legal_escalation_date: string | null;
  court_case_number: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface CollectionExport {
  id: string;
  case_ids: string[];
  export_date: string;
  export_file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  collection_agency_name: string;
  collection_agency_email: string | null;
  exported_by: string;
  total_cases: number;
  total_amount: number;
  notes: string | null;
  agency_confirmed_receipt: boolean;
  agency_confirmed_at: string | null;
  created_at: string;
}

export interface ExportData {
  case: CollectionCase;
  user: any;
  subscription: any;
  dunningCase: any;
  dunningLetters: any[];
  invoices: any[];
  auditLog: any[];
}

class CollectionService {
  async getOpenCases(): Promise<CollectionCase[]> {
    try {
      const { data, error } = await supabase
        .from('collection_cases')
        .select(`
          *,
          profiles!inner(id, first_name, last_name, email, phone_number, street, house_number, postcode, city, date_of_birth)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching open collection cases:', error);
      return [];
    }
  }

  async getForwardedCases(): Promise<CollectionCase[]> {
    try {
      const { data, error } = await supabase
        .from('collection_cases')
        .select(`
          *,
          profiles!inner(id, first_name, last_name, email)
        `)
        .eq('status', 'forwarded')
        .order('forwarded_to_collection_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching forwarded collection cases:', error);
      return [];
    }
  }

  async getCaseById(caseId: string): Promise<CollectionCase | null> {
    try {
      const { data, error } = await supabase
        .from('collection_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching collection case:', error);
      return null;
    }
  }

  async createCollectionCaseFromDunning(dunningCaseId: string): Promise<CollectionCase | null> {
    try {
      const { data, error } = await supabase.rpc('create_collection_case_from_dunning', {
        dunning_case_id_param: dunningCaseId,
      });

      if (error) throw error;

      return await this.getCaseById(data);
    } catch (error) {
      console.error('Error creating collection case:', error);
      return null;
    }
  }

  async forwardToAgency(
    caseIds: string[],
    agencyName: string,
    agencyEmail: string | null,
    notes: string | null,
    exportedBy: string
  ): Promise<CollectionExport | null> {
    try {
      const cases = await Promise.all(caseIds.map((id) => this.getCaseById(id)));
      const validCases = cases.filter((c) => c !== null) as CollectionCase[];

      if (validCases.length === 0) {
        throw new Error('No valid cases to export');
      }

      const totalAmount = validCases.reduce((sum, c) => sum + c.total_amount, 0);

      const exportFileName = `inkasso_export_${new Date().toISOString().split('T')[0]}_${caseIds.length}_cases.zip`;

      const { data: exportData, error: exportError } = await supabase
        .from('collection_exports')
        .insert({
          case_ids: caseIds,
          export_file_url: `/exports/${exportFileName}`,
          file_name: exportFileName,
          collection_agency_name: agencyName,
          collection_agency_email: agencyEmail,
          exported_by: exportedBy,
          total_cases: caseIds.length,
          total_amount: totalAmount,
          notes: notes,
        })
        .select()
        .single();

      if (exportError) throw exportError;

      for (const caseId of caseIds) {
        await supabase
          .from('collection_cases')
          .update({
            status: 'forwarded',
            forwarded_to_collection_at: new Date().toISOString(),
            collection_agency_name: agencyName,
            collection_agency_email: agencyEmail,
          })
          .eq('id', caseId);
      }

      return exportData;
    } catch (error) {
      console.error('Error forwarding to agency:', error);
      return null;
    }
  }

  async generateExportData(caseId: string): Promise<ExportData | null> {
    try {
      const collectionCase = await this.getCaseById(caseId);
      if (!collectionCase) return null;

      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', collectionCase.user_id)
        .single();

      const { data: subscription } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('id', collectionCase.subscription_id)
        .single();

      const { data: dunningCase } = await supabase
        .from('dunning_cases')
        .select('*')
        .eq('id', collectionCase.dunning_case_id)
        .single();

      const { data: dunningLetters } = await supabase
        .from('dunning_letters')
        .select('*')
        .eq('dunning_case_id', collectionCase.dunning_case_id)
        .order('created_at', { ascending: true });

      const { data: invoices } = await supabase
        .from('stripe_invoices')
        .select('*')
        .eq('subscription_id', collectionCase.subscription_id)
        .order('invoice_created_at', { ascending: false });

      const { data: auditLog } = await supabase
        .from('subscription_audit_log')
        .select('*')
        .eq('subscription_id', collectionCase.subscription_id)
        .order('created_at', { ascending: false });

      return {
        case: collectionCase,
        user: user || {},
        subscription: subscription || {},
        dunningCase: dunningCase || {},
        dunningLetters: dunningLetters || [],
        invoices: invoices || [],
        auditLog: auditLog || [],
      };
    } catch (error) {
      console.error('Error generating export data:', error);
      return null;
    }
  }

  async updateCaseStatus(
    caseId: string,
    status: CollectionCase['status'],
    notes?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updates.admin_notes = notes;
      }

      if (status === 'closed' || status === 'paid') {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('collection_cases')
        .update(updates)
        .eq('id', caseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating case status:', error);
      return false;
    }
  }

  async updateReferenceNumber(caseId: string, referenceNumber: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collection_cases')
        .update({
          collection_reference_number: referenceNumber,
        })
        .eq('id', caseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating reference number:', error);
      return false;
    }
  }

  async getAllExports(): Promise<CollectionExport[]> {
    try {
      const { data, error } = await supabase
        .from('collection_exports')
        .select('*')
        .order('export_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exports:', error);
      return [];
    }
  }

  formatAmount(amountInCents: number): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  getDataCompletenessPercentage(collectionCase: CollectionCase): number {
    const requiredFields = 8;
    const missingCount = collectionCase.missing_data.length;
    return Math.round(((requiredFields - missingCount) / requiredFields) * 100);
  }

  checkDataCompleteness(collectionCase: CollectionCase): {
    complete: boolean;
    missing: string[];
    percentage: number;
  } {
    return {
      complete: collectionCase.data_complete,
      missing: collectionCase.missing_data,
      percentage: this.getDataCompletenessPercentage(collectionCase),
    };
  }
}

export const collectionService = new CollectionService();
