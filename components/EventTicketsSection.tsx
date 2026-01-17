import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ticket, Check, X, ShoppingCart, Info } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import {
  getEventTickets,
  getTicketAvailability,
  formatPrice,
  EventTicket,
} from '../services/ticketService';
import { useAuth } from '../utils/authContext';
import { supabase } from '../lib/supabase';

interface EventTicketsSectionProps {
  eventId: string;
}

export default function EventTicketsSection({ eventId }: EventTicketsSectionProps) {
  const { user, isGuest } = useAuth();
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState<{
    amount: number;
    platformFee: number;
    stripeFee: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    loadTickets();
  }, [eventId]);

  useEffect(() => {
    if (selectedTicket) {
      calculateFees();
    }
  }, [selectedTicket, quantity]);

  const loadTickets = async () => {
    setLoading(true);
    const ticketData = await getEventTickets(eventId);
    setTickets(ticketData);
    setLoading(false);
  };

  const calculateFees = () => {
    if (!selectedTicket) return;

    const amount = parseFloat(selectedTicket.price.toString()) * quantity * 100;
    const platformFee = Math.round(amount * 0.05);
    const stripeFee = Math.round((amount * 0.029) + 30);
    const total = amount + platformFee + stripeFee;

    setFeeBreakdown({
      amount,
      platformFee,
      stripeFee,
      total,
    });
  };

  const handleTicketSelect = (ticket: EventTicket) => {
    if (isGuest) {
      Alert.alert(
        'Anmeldung erforderlich',
        'Bitte melde dich an, um Tickets zu kaufen.',
        [{ text: 'OK' }]
      );
      return;
    }

    const availability = getTicketAvailability(ticket);
    if (availability.soldOut) {
      Alert.alert('Ausverkauft', 'Dieses Ticket ist leider ausverkauft.');
      return;
    }

    setSelectedTicket(ticket);
    setQuantity(1);
    setModalVisible(true);
  };

  const handlePurchase = async () => {
    if (!selectedTicket || !user) return;

    setPurchasing(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'create-ticket-payment',
        {
          body: {
            userId: user.id,
            eventId: eventId,
            ticketId: selectedTicket.id,
            quantity: quantity,
          },
        }
      );

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      setModalVisible(false);

      Alert.alert(
        'Zahlung verarbeiten',
        'Du wirst zu Stripe weitergeleitet, um die Zahlung abzuschließen.',
        [
          {
            text: 'Abbrechen',
            style: 'cancel',
          },
          {
            text: 'Weiter zu Stripe',
            onPress: async () => {
              await WebBrowser.openBrowserAsync(`https://checkout.stripe.com/pay/${data.clientSecret}`);
            },
          },
        ]
      );

      loadTickets();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Zahlung konnte nicht erstellt werden.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (tickets.length === 0) {
    return null;
  }

  const totalPrice = selectedTicket ? parseFloat(selectedTicket.price.toString()) * quantity : 0;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ticket size={24} color={Colors.primary} />
          <Text style={styles.title}>Tickets</Text>
        </View>

        {tickets.map((ticket) => {
          const availability = getTicketAvailability(ticket);

          return (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketType}>{ticket.ticket_type}</Text>
                  {ticket.description && (
                    <Text style={styles.ticketDescription}>{ticket.description}</Text>
                  )}
                </View>
                <Text style={styles.ticketPrice}>{formatPrice(parseFloat(ticket.price.toString()))}</Text>
              </View>

              <View style={styles.ticketFooter}>
                <View style={styles.availability}>
                  {availability.soldOut ? (
                    <Text style={styles.soldOutText}>Ausverkauft</Text>
                  ) : availability.almostSoldOut ? (
                    <Text style={styles.limitedText}>
                      Nur noch {availability.available} verfügbar
                    </Text>
                  ) : (
                    <Text style={styles.availableText}>
                      {availability.available} verfügbar
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    availability.soldOut && styles.buyButtonDisabled,
                  ]}
                  onPress={() => handleTicketSelect(ticket)}
                  disabled={availability.soldOut}
                >
                  <ShoppingCart size={16} color={Colors.white} />
                  <Text style={styles.buyButtonText}>Kaufen</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket kaufen</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView>
                <View style={styles.selectedTicketCard}>
                  <Text style={styles.selectedTicketType}>{selectedTicket.ticket_type}</Text>
                  <Text style={styles.selectedTicketPrice}>
                    {formatPrice(parseFloat(selectedTicket.price.toString()))}
                  </Text>
                </View>

                <View style={styles.quantitySection}>
                  <Text style={styles.quantityLabel}>Anzahl:</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const availability = getTicketAvailability(selectedTicket);
                        setQuantity(Math.min(availability.available, quantity + 1));
                      }}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Ticketpreis:</Text>
                  <Text style={styles.totalPrice}>{formatPrice(totalPrice)}</Text>
                </View>

                {feeBreakdown && (
                  <View style={styles.feeBreakdown}>
                    <View style={styles.feeHeader}>
                      <Info size={16} color={Colors.info} />
                      <Text style={styles.feeTitle}>Gebührenübersicht</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Ticketpreis:</Text>
                      <Text style={styles.feeValue}>
                        {(feeBreakdown.amount / 100).toFixed(2)} EUR
                      </Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Plattformgebühr (5%):</Text>
                      <Text style={styles.feeValue}>
                        +{(feeBreakdown.platformFee / 100).toFixed(2)} EUR
                      </Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Zahlungsgebühr (2,9% + 0,30€):</Text>
                      <Text style={styles.feeValue}>
                        +{(feeBreakdown.stripeFee / 100).toFixed(2)} EUR
                      </Text>
                    </View>
                    <View style={[styles.feeRow, styles.feeRowTotal]}>
                      <Text style={styles.feeLabelTotal}>Gesamtpreis:</Text>
                      <Text style={styles.feeValueTotal}>
                        {(feeBreakdown.total / 100).toFixed(2)} EUR
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoSection}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.infoText}>Sofortiger Zugang nach Kauf</Text>
                </View>
                <View style={styles.infoSection}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.infoText}>QR-Code für Event-Einlass</Text>
                </View>
                <View style={styles.infoSection}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.infoText}>Tickets in deinem Profil</Text>
                </View>

                <TouchableOpacity
                  style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                  onPress={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.purchaseButtonText}>
                      {feeBreakdown ? `${(feeBreakdown.total / 100).toFixed(2)} EUR bezahlen` : 'Bezahlen'}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  Sichere Zahlung über Stripe
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  ticketCard: {
    marginBottom: Spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  ticketInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  ticketType: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  ticketPrice: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availability: {
    flex: 1,
  },
  availableText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
  },
  limitedText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    fontWeight: FontWeights.medium,
  },
  soldOutText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: FontWeights.medium,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  buyButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buyButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  selectedTicketCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  selectedTicketType: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  selectedTicketPrice: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  quantityLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  quantityValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  totalPrice: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  feeBreakdown: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  feeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  feeRowTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  feeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  feeValue: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  feeLabelTotal: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  feeValueTotal: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  purchaseButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  purchaseButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
