import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { useRouter } from 'expo-router';
import { ChevronLeft, DollarSign, CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';

interface PayoutRequest {
  id: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  payment_method: 'bank_transfer' | 'paypal';
  requested_at: string;
  processed_at?: string;
  admin_notes?: string;
}

export default function PayoutsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const [requestAmount, setRequestAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'paypal'>('bank_transfer');
  const [bankAccount, setBankAccount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('coins_balance')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setBalance(profileData.coins_balance || 0);
      }

      const { data: requestsData } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(10);

      if (requestsData) {
        setPayoutRequests(requestsData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount < 10) {
      setError('Mindestbetrag: 10 EUR');
      return;
    }

    if (amount > balance / 100) {
      setError('Nicht genügend Guthaben');
      return;
    }

    if (paymentMethod === 'bank_transfer' && !bankAccount.trim()) {
      setError('Bitte IBAN eingeben');
      return;
    }

    if (paymentMethod === 'paypal' && !paypalEmail.trim()) {
      setError('Bitte PayPal E-Mail eingeben');
      return;
    }

    setRequesting(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('create_payout_request', {
        p_user_id: user!.id,
        p_amount_cents: Math.round(amount * 100),
        p_payment_method: paymentMethod,
        p_bank_account: paymentMethod === 'bank_transfer' ? bankAccount : null,
        p_paypal_email: paymentMethod === 'paypal' ? paypalEmail : null,
      });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(data?.error || 'Fehler beim Erstellen der Auszahlungsanfrage');
      }

      setShowRequestForm(false);
      setRequestAmount('');
      setBankAccount('');
      setPaypalEmail('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color={Colors.warning} />;
      case 'approved':
        return <CheckCircle2 size={20} color={Colors.info} />;
      case 'completed':
        return <CheckCircle2 size={20} color={Colors.success} />;
      case 'rejected':
        return <XCircle size={20} color={Colors.error} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Prüfung';
      case 'approved':
        return 'Genehmigt';
      case 'completed':
        return 'Ausgezahlt';
      case 'rejected':
        return 'Abgelehnt';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.warning;
      case 'approved':
        return Colors.info;
      case 'completed':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      default:
        return Colors.gray600;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auszahlungen</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <DollarSign size={32} color={Colors.primary} />
            <Text style={styles.balanceLabel}>Verfügbares Guthaben</Text>
          </View>
          <Text style={styles.balanceAmount}>{(balance / 100).toFixed(2)} EUR</Text>
          <TouchableOpacity
            style={[styles.requestButton, balance < 1000 && styles.requestButtonDisabled]}
            onPress={() => setShowRequestForm(true)}
            disabled={balance < 1000}
          >
            <Text style={styles.requestButtonText}>Auszahlung anfordern</Text>
          </TouchableOpacity>
          {balance < 1000 && (
            <Text style={styles.minBalanceHint}>Mindestguthaben: 10,00 EUR</Text>
          )}
        </View>

        {showRequestForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Neue Auszahlung</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Betrag (EUR)</Text>
              <TextInput
                style={styles.input}
                value={requestAmount}
                onChangeText={setRequestAmount}
                placeholder="10.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Zahlungsmethode</Text>
              <View style={styles.methodButtons}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'bank_transfer' && styles.methodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod('bank_transfer')}
                >
                  <CreditCard
                    size={20}
                    color={paymentMethod === 'bank_transfer' ? Colors.white : Colors.text}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      paymentMethod === 'bank_transfer' && styles.methodButtonTextActive,
                    ]}
                  >
                    Banküberweisung
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'paypal' && styles.methodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod('paypal')}
                >
                  <DollarSign
                    size={20}
                    color={paymentMethod === 'paypal' ? Colors.white : Colors.text}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      paymentMethod === 'paypal' && styles.methodButtonTextActive,
                    ]}
                  >
                    PayPal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {paymentMethod === 'bank_transfer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  autoCapitalize="characters"
                />
              </View>
            )}

            {paymentMethod === 'paypal' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PayPal E-Mail</Text>
                <TextInput
                  style={styles.input}
                  value={paypalEmail}
                  onChangeText={setPaypalEmail}
                  placeholder="deine@email.de"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRequestForm(false);
                  setError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, requesting && styles.submitButtonDisabled]}
                onPress={handleRequestPayout}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Anfordern</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Verlauf</Text>
          {payoutRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Noch keine Auszahlungen</Text>
            </View>
          ) : (
            payoutRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestStatus}>
                    {getStatusIcon(request.status)}
                    <Text style={[styles.requestStatusText, { color: getStatusColor(request.status) }]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                  <Text style={styles.requestAmount}>
                    {(request.amount_cents / 100).toFixed(2)} EUR
                  </Text>
                </View>
                <View style={styles.requestDetails}>
                  <Text style={styles.requestDetailText}>
                    Methode: {request.payment_method === 'bank_transfer' ? 'Banküberweisung' : 'PayPal'}
                  </Text>
                  <Text style={styles.requestDetailText}>
                    Angefragt: {new Date(request.requested_at).toLocaleDateString('de-DE')}
                  </Text>
                  {request.processed_at && (
                    <Text style={styles.requestDetailText}>
                      Bearbeitet: {new Date(request.processed_at).toLocaleDateString('de-DE')}
                    </Text>
                  )}
                  {request.admin_notes && (
                    <Text style={styles.adminNotes}>Hinweis: {request.admin_notes}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  requestButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.lg,
  },
  requestButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  requestButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  minBalanceHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: Spacing.md,
  },
  formCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  formTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  methodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  methodButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  methodButtonTextActive: {
    color: Colors.white,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  historySection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  historyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  requestStatusText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  requestAmount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  requestDetails: {
    gap: Spacing.xs,
  },
  requestDetailText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  adminNotes: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
});
