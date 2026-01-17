import { supabase } from '@/lib/supabase';

/**
 * USt-Tracking-Service für Non-Union OSS-Verfahren
 *
 * Erfasst alle USt-pflichtigen Transaktionen für quartalsweise OSS-Meldung
 * gemäß Non-Union OSS-Verfahren (US-LLC verkauft digitale Dienstleistungen in DE)
 */

export interface UstTransactionData {
  transactionType: 'coin_purchase' | 'premium_subscription' | 'ticket_purchase' | 'boost_purchase';
  userId: string;
  stripePaymentIntentId: string;
  relatedEntityId?: string;
  countryCode: string; // ISO 3166-1 alpha-2 (z.B. "DE")
  grossAmount: number; // Bruttobetrag in EUR
  serviceDescription: string;
  metadata?: Record<string, any>;
}

export interface UstTransaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  user_id: string;
  stripe_payment_intent_id: string;
  related_entity_id?: string;
  country_code: string;
  gross_amount: number;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  service_description: string;
  invoice_number?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface QuarterlyReport {
  id: string;
  year: number;
  quarter: number;
  country_code: string;
  total_transactions: number;
  total_net_amount: number;
  total_vat_amount: number;
  total_gross_amount: number;
  report_data: {
    period_start: string;
    period_end: string;
    by_type: Record<string, {
      count: number;
      net_amount: number;
      vat_amount: number;
      gross_amount: number;
    }>;
    vat_rate: number;
    generated_by_user: string;
  };
  status: 'draft' | 'submitted' | 'paid';
  generated_at: string;
  generated_by: string;
  submission_date?: string;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuarterOverview {
  year: number;
  quarter: number;
  transaction_count: number;
  total_net: number;
  total_vat: number;
  total_gross: number;
  has_report: boolean;
  report_status?: 'draft' | 'submitted' | 'paid';
}

/**
 * Ruft den aktuellen USt-Satz für ein Land aus der Datenbank ab
 * Falls kein Satz gefunden wird, gibt 0 zurück
 */
export async function getVatRate(
  countryCode: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<{
  success: boolean;
  vatRate?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_vat_rate', {
      p_country_code: countryCode,
      p_date: date,
    });

    if (error) {
      console.error('Error fetching VAT rate:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      vatRate: data || 0,
    };
  } catch (error: any) {
    console.error('Exception in getVatRate:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Ruft alle aktiven VAT-Raten ab (für alle EU-Länder)
 */
export async function getAllVatRates(): Promise<{
  success: boolean;
  rates?: Array<{
    country_code: string;
    country_name: string;
    vat_rate: number;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('vat_rates')
      .select('country_code, country_name, vat_rate')
      .eq('is_active', true)
      .order('country_name');

    if (error) {
      console.error('Error fetching VAT rates:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      rates: data || [],
    };
  } catch (error: any) {
    console.error('Exception in getAllVatRates:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Berechnet Netto- und USt-Betrag aus Bruttobetrag
 */
function calculateVatAmounts(grossAmount: number, vatRate: number) {
  const netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
  const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;

  return {
    netAmount,
    vatAmount,
  };
}

/**
 * Tracked eine USt-pflichtige Transaktion
 *
 * Diese Funktion sollte bei jeder erfolgreichen Stripe-Zahlung aufgerufen werden
 */
export async function trackUstTransaction(data: UstTransactionData): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    // VAT-Rate für Land ermitteln
    const vatRate = VAT_RATES[data.countryCode] || 0;

    if (vatRate === 0) {
      console.warn(`No VAT rate configured for country: ${data.countryCode}`);
      return {
        success: false,
        error: `No VAT rate configured for country: ${data.countryCode}`,
      };
    }

    // Netto und USt berechnen
    const { netAmount, vatAmount } = calculateVatAmounts(data.grossAmount, vatRate);

    // Transaktion in Datenbank speichern
    const { data: transaction, error } = await supabase
      .from('ust_transactions')
      .insert({
        transaction_type: data.transactionType,
        user_id: data.userId,
        stripe_payment_intent_id: data.stripePaymentIntentId,
        related_entity_id: data.relatedEntityId,
        country_code: data.countryCode,
        gross_amount: data.grossAmount,
        net_amount: netAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        service_description: data.serviceDescription,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking USt transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      transactionId: transaction.id,
    };
  } catch (error: any) {
    console.error('Exception in trackUstTransaction:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Ruft alle Transaktionen eines bestimmten Quartals ab
 * Inkludiert alle Länder
 */
export async function getTransactionsByQuarter(
  year: number,
  quarter: number
): Promise<{
  success: boolean;
  transactions?: UstTransaction[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_ust_transactions_by_quarter', {
      p_year: year,
      p_quarter: quarter,
      p_country_code: null,
    });

    if (error) {
      console.error('Error fetching transactions by quarter:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      transactions: data || [],
    };
  } catch (error: any) {
    console.error('Exception in getTransactionsByQuarter:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Generiert einen Quartalsbericht für OSS-Meldung
 * Nur für Admins verfügbar
 *
 * Erzeugt einen Multi-Country Bericht mit Aufschlüsselung nach Ländern
 */
export async function generateQuarterlyReport(
  year: number,
  quarter: number
): Promise<{
  success: boolean;
  reportId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('generate_ust_quarterly_report', {
      p_year: year,
      p_quarter: quarter,
    });

    if (error) {
      console.error('Error generating quarterly report:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      reportId: data,
    };
  } catch (error: any) {
    console.error('Exception in generateQuarterlyReport:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Ruft einen spezifischen Quartalsbericht ab
 */
export async function getQuarterlyReport(
  year: number,
  quarter: number
): Promise<{
  success: boolean;
  report?: QuarterlyReport;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('ust_quarterly_reports')
      .select('*')
      .eq('year', year)
      .eq('quarter', quarter)
      .maybeSingle();

    if (error) {
      console.error('Error fetching quarterly report:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      report: data || undefined,
    };
  } catch (error: any) {
    console.error('Exception in getQuarterlyReport:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Aktualisiert den Status eines Quartalsberichts
 * (z.B. von "draft" zu "submitted" nach OSS-Meldung)
 */
export async function updateReportStatus(
  reportId: string,
  status: 'draft' | 'submitted' | 'paid',
  additionalData?: {
    submissionDate?: string;
    paymentDate?: string;
    paymentReference?: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updateData: any = { status };

    if (additionalData?.submissionDate) {
      updateData.submission_date = additionalData.submissionDate;
    }
    if (additionalData?.paymentDate) {
      updateData.payment_date = additionalData.paymentDate;
    }
    if (additionalData?.paymentReference) {
      updateData.payment_reference = additionalData.paymentReference;
    }
    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }

    const { error } = await supabase
      .from('ust_quarterly_reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report status:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Exception in updateReportStatus:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Ruft eine Übersicht aller Quartale mit Daten ab
 * Aggregiert über alle Länder
 */
export async function getQuartersOverview(): Promise<{
  success: boolean;
  quarters?: QuarterOverview[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_ust_quarters_overview');

    if (error) {
      console.error('Error fetching quarters overview:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      quarters: data || [],
    };
  } catch (error: any) {
    console.error('Exception in getQuartersOverview:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Ermittelt das aktuelle Quartal
 */
export async function getCurrentQuarter(): Promise<{
  success: boolean;
  quarter?: {
    year: number;
    quarter: number;
    start_date: string;
    end_date: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_current_quarter');

    if (error) {
      console.error('Error getting current quarter:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      quarter: data?.[0],
    };
  } catch (error: any) {
    console.error('Exception in getCurrentQuarter:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Formatiert Quartalsinformationen als lesbaren String
 */
export function formatQuarterString(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

/**
 * Formatiert einen Betrag als EUR-String
 */
export function formatEurAmount(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Berechnet die Deadline für OSS-Meldung eines Quartals
 *
 * OSS-Meldefristen (letzter Tag des Folgemonats nach Quartalsende):
 * - Q1 (Jan-Mar) → 30. April
 * - Q2 (Apr-Jun) → 31. Juli
 * - Q3 (Jul-Sep) → 31. Oktober
 * - Q4 (Okt-Dez) → 31. Januar (Folgejahr)
 */
export function getOssDeadline(year: number, quarter: number): Date {
  // Monat nach Quartalsende: quarter * 3 + 1
  // Jahr kann sich bei Q4 ändern (Januar = Folgejahr)
  const deadlineMonth = quarter * 3 + 1;
  const deadlineYear = deadlineMonth > 12 ? year + 1 : year;
  const normalizedMonth = deadlineMonth > 12 ? 1 : deadlineMonth;

  // Letzter Tag des Monats: Tag 0 des nächsten Monats
  const deadline = new Date(deadlineYear, normalizedMonth, 0);

  return deadline;
}

/**
 * Prüft, ob die OSS-Meldung für ein Quartal überfällig ist
 */
export function isOssOverdue(year: number, quarter: number): boolean {
  const deadline = getOssDeadline(year, quarter);
  return new Date() > deadline;
}
