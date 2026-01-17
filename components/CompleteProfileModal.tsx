import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/utils/toastContext';
import { useAuth } from '@/utils/authContext';

interface CompleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface BillingData {
  first_name: string;
  last_name: string;
  birth_date: string;
  street: string;
  house_number: string;
  postcode: string;
  city: string;
  country_full: string;
  phone_number: string;
}

const CURRENT_TERMS_VERSION = '1.0.0';

export default function CompleteProfileModal({
  visible,
  onClose,
  onComplete,
}: CompleteProfileModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BillingData, string>>>({});

  const [formData, setFormData] = useState<BillingData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    street: '',
    house_number: '',
    postcode: '',
    city: '',
    country_full: 'Deutschland',
    phone_number: '',
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BillingData, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Vorname ist erforderlich';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Nachname ist erforderlich';
    }

    if (!formData.birth_date) {
      newErrors.birth_date = 'Geburtsdatum ist erforderlich';
    } else {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 16) {
        newErrors.birth_date = 'Sie müssen mindestens 16 Jahre alt sein';
      }

      if (birthDate > today) {
        newErrors.birth_date = 'Geburtsdatum kann nicht in der Zukunft liegen';
      }
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Straße ist erforderlich';
    } else if (formData.street.trim().length < 3) {
      newErrors.street = 'Straße muss mindestens 3 Zeichen lang sein';
    }

    if (!formData.house_number.trim()) {
      newErrors.house_number = 'Hausnummer ist erforderlich';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postleitzahl ist erforderlich';
    } else if (!/^\d{5}$/.test(formData.postcode)) {
      newErrors.postcode = 'Postleitzahl muss 5-stellig sein';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Stadt ist erforderlich';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Telefonnummer ist erforderlich';
    } else if (!/^(\+49|0)[1-9]\d{1,14}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Ungültige deutsche Telefonnummer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Bitte füllen Sie alle Pflichtfelder korrekt aus', 'error');
      return;
    }

    if (!user) {
      showToast('Benutzer nicht authentifiziert', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          date_of_birth: formData.birth_date,
          street: formData.street.trim(),
          house_number: formData.house_number.trim(),
          postcode: formData.postcode.trim(),
          city: formData.city.trim(),
          country_full: formData.country_full,
          phone_number: formData.phone_number.replace(/\s/g, ''),
          billing_data_complete: true,
          billing_data_completed_at: new Date().toISOString(),
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      showToast('Profil erfolgreich vervollständigt', 'success');
      onComplete();
    } catch (error) {
      console.error('Error saving billing data:', error);
      showToast('Fehler beim Speichern der Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    key: keyof BillingData,
    label: string,
    placeholder: string,
    keyboardType: 'default' | 'numeric' | 'phone-pad' = 'default',
    maxLength?: number
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        value={formData[key]}
        onChangeText={(value) => {
          setFormData((prev) => ({ ...prev, [key]: value }));
          if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
          }
        }}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize="words"
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Vollständiges Profil erforderlich</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Für Zahlungen benötigen wir vollständige Angaben gemäß Zahlungsdiensteaufsicht und
              für rechtssichere Rechnungsstellung.
            </Text>

            {renderInput('first_name', 'Vorname *', 'Max')}
            {renderInput('last_name', 'Nachname *', 'Mustermann')}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Geburtsdatum *</Text>
              <TextInput
                style={[styles.input, errors.birth_date && styles.inputError]}
                value={formData.birth_date}
                onChangeText={(value) => {
                  setFormData((prev) => ({ ...prev, birth_date: value }));
                  if (errors.birth_date) {
                    setErrors((prev) => ({ ...prev, birth_date: undefined }));
                  }
                }}
                placeholder="JJJJ-MM-TT (z.B. 1990-01-15)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.birth_date && <Text style={styles.errorText}>{errors.birth_date}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 3 }]}>
                <Text style={styles.label}>Straße *</Text>
                <TextInput
                  style={[styles.input, errors.street && styles.inputError]}
                  value={formData.street}
                  onChangeText={(value) => {
                    setFormData((prev) => ({ ...prev, street: value }));
                    if (errors.street) {
                      setErrors((prev) => ({ ...prev, street: undefined }));
                    }
                  }}
                  placeholder="Hauptstraße"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
                {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Nr. *</Text>
                <TextInput
                  style={[styles.input, errors.house_number && styles.inputError]}
                  value={formData.house_number}
                  onChangeText={(value) => {
                    setFormData((prev) => ({ ...prev, house_number: value }));
                    if (errors.house_number) {
                      setErrors((prev) => ({ ...prev, house_number: undefined }));
                    }
                  }}
                  placeholder="12"
                  placeholderTextColor="#999"
                  maxLength={10}
                />
                {errors.house_number && (
                  <Text style={styles.errorText}>{errors.house_number}</Text>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>PLZ *</Text>
                <TextInput
                  style={[styles.input, errors.postcode && styles.inputError]}
                  value={formData.postcode}
                  onChangeText={(value) => {
                    setFormData((prev) => ({ ...prev, postcode: value }));
                    if (errors.postcode) {
                      setErrors((prev) => ({ ...prev, postcode: undefined }));
                    }
                  }}
                  placeholder="12345"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                />
                {errors.postcode && <Text style={styles.errorText}>{errors.postcode}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                <Text style={styles.label}>Stadt *</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  value={formData.city}
                  onChangeText={(value) => {
                    setFormData((prev) => ({ ...prev, city: value }));
                    if (errors.city) {
                      setErrors((prev) => ({ ...prev, city: undefined }));
                    }
                  }}
                  placeholder="Berlin"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>

            {renderInput('phone_number', 'Telefonnummer *', '+49 oder 0...', 'phone-pad')}

            <Text style={styles.infoText}>
              * Pflichtfelder{'\n'}
              Ihre Daten werden sicher gespeichert und nur für Zahlungsabwicklung und
              Rechnungsstellung verwendet.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Speichern & Fortfahren</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
