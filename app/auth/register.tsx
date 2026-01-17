import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/authContext';
import { X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import LogoComponent from '../../components/LogoComponent';
import { PhoneVerificationModal } from '../../components/PhoneVerificationModal';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const getMonthName = (month: number): string => {
  return MONTHS[month - 1] || '';
};

const getDays = (): number[] => {
  return Array.from({ length: 31 }, (_, i) => i + 1);
};

const getYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 100 }, (_, i) => currentYear - i);
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    postcode: '',
    city: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeGDPR: false,
    agreeMarketing: false,
  });

  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vorname ist erforderlich';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nachname ist erforderlich';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username ist erforderlich';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username muss mindestens 3 Zeichen haben';
    } else if (!/^[a-z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Nur Kleinbuchstaben, Zahlen und _ erlaubt';
    }

    const currentYear = new Date().getFullYear();
    const day = parseInt(formData.birthDay);
    const month = parseInt(formData.birthMonth);
    const year = parseInt(formData.birthYear);

    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear) {
      newErrors.birthDate = 'Geburtsdatum ist erforderlich';
    } else if (isNaN(day) || day < 1 || day > 31) {
      newErrors.birthDate = 'Ungültiger Tag';
    } else if (isNaN(month) || month < 1 || month > 12) {
      newErrors.birthDate = 'Ungültiger Monat';
    } else if (isNaN(year) || year < 1900 || year > currentYear) {
      newErrors.birthDate = `Jahr muss zwischen 1900 und ${currentYear} liegen`;
    } else {
      const birthDate = new Date(year, month - 1, day);
      const age = currentYear - year;
      if (age < 13) {
        newErrors.birthDate = 'Du musst mindestens 13 Jahre alt sein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'PLZ ist erforderlich';
    } else if (!/^\d{5}$/.test(formData.postcode)) {
      newErrors.postcode = 'PLZ muss 5 Ziffern haben';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Stadt ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.agreeTerms) {
      newErrors.terms = 'Bitte akzeptiere die AGBs';
    }

    if (!formData.agreePrivacy) {
      newErrors.privacy = 'Bitte akzeptiere die Datenschutzerklärung';
    }

    if (!formData.agreeGDPR) {
      newErrors.gdpr = 'GDPR Zustimmung ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };


  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setErrorMessage('');
    setLoading(true);

    const birthDate = `${formData.birthYear}-${formData.birthMonth.padStart(2, '0')}-${formData.birthDay.padStart(2, '0')}`;

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

    const { data, error } = await signUp(formData.email, formData.password, {
      name: fullName,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      username: formData.username,
      date_of_birth: birthDate,
      birth_year: parseInt(formData.birthYear),
      postcode: formData.postcode,
      city: formData.city,
      interests: [],
      gdpr_consent: formData.agreeGDPR,
      marketing_consent: formData.agreeMarketing,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
        setErrorMessage('Diese E-Mail-Adresse ist bereits registriert.');
      } else {
        setErrorMessage(error.message);
      }
    } else if (data?.user) {
      setRegisteredUserId(data.user.id);
      setShowPhoneModal(true);
    }
  };

  const handlePhoneVerified = () => {
    setShowPhoneModal(false);
    router.replace('/auth/login');
  };

  const handleSkipPhone = () => {
    setShowPhoneModal(false);
    router.replace('/auth/login');
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.logoContainer}>
        <LogoComponent width={120} height={48} />
      </View>
      <Text style={styles.stepTitle}>Account erstellen</Text>
      <Text style={styles.stepDescription}>
        Erstelle deinen JETZZ Account
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vorname *</Text>
        <TextInput
          style={[styles.input, errors.firstName && styles.inputError]}
          placeholder="Max"
          value={formData.firstName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
          autoCapitalize="words"
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nachname *</Text>
        <TextInput
          style={[styles.input, errors.lastName && styles.inputError]}
          placeholder="Mustermann"
          value={formData.lastName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
          autoCapitalize="words"
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        <Text style={styles.helperText}>
          Wird nicht öffentlich angezeigt, nur dein Username
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>E-Mail *</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="deine@email.de"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Passwort *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Mindestens 8 Zeichen"
            value={formData.password}
            onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.gray600} />
            ) : (
              <Eye size={20} color={Colors.gray600} />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Passwort bestätigen *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
            placeholder="Passwort wiederholen"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color={Colors.gray600} />
            ) : (
              <Eye size={20} color={Colors.gray600} />
            )}
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Username & Geburtsdatum</Text>
      <Text style={styles.stepDescription}>
        Wähle deinen einzigartigen Username
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={[styles.input, errors.username && styles.inputError]}
          placeholder="deinusername"
          value={formData.username}
          onChangeText={(text) => setFormData(prev => ({ ...prev, username: text.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        <Text style={styles.helperText}>
          Nur Kleinbuchstaben, Zahlen und Unterstrich (_)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Geburtsdatum *</Text>

        <TouchableOpacity
          style={[styles.datePickerButton, errors.birthDate && styles.inputError]}
          onPress={() => setShowDayPicker(true)}
        >
          <Text style={formData.birthDay ? styles.datePickerText : styles.datePickerPlaceholder}>
            {formData.birthDay || 'Tag'}
          </Text>
          <ChevronRight size={20} color={Colors.gray600} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.datePickerButton, errors.birthDate && styles.inputError]}
          onPress={() => setShowMonthPicker(true)}
        >
          <Text style={formData.birthMonth ? styles.datePickerText : styles.datePickerPlaceholder}>
            {formData.birthMonth ? getMonthName(parseInt(formData.birthMonth)) : 'Monat'}
          </Text>
          <ChevronRight size={20} color={Colors.gray600} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.datePickerButton, errors.birthDate && styles.inputError]}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={formData.birthYear ? styles.datePickerText : styles.datePickerPlaceholder}>
            {formData.birthYear || 'Jahr'}
          </Text>
          <ChevronRight size={20} color={Colors.gray600} />
        </TouchableOpacity>

        {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}
        <Text style={styles.helperText}>
          Für Jugendschutzfilter & Altersverifikation
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Standort</Text>
      <Text style={styles.stepDescription}>
        Hilf uns, passende Events in deiner Nähe zu finden
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postleitzahl *</Text>
        <TextInput
          style={[styles.input, errors.postcode && styles.inputError]}
          placeholder="12345"
          value={formData.postcode}
          onChangeText={async (text) => {
            setFormData(prev => ({ ...prev, postcode: text }));
            if (text.length === 5) {
              setLoadingCities(true);
              try {
                const response = await fetch(`https://api.zippopotam.us/de/${text}`);
                if (response.ok) {
                  const data = await response.json();
                  const cityNames = data.places.map((place: any) => place['place name']);
                  setCities(cityNames);
                  if (cityNames.length === 1) {
                    setFormData(prev => ({ ...prev, city: cityNames[0] }));
                  } else if (cityNames.length > 1) {
                    setShowCityPicker(true);
                  }
                } else {
                  setCities([]);
                }
              } catch (error) {
                setCities([]);
              } finally {
                setLoadingCities(false);
              }
            } else {
              setCities([]);
            }
          }}
          keyboardType="number-pad"
          maxLength={5}
        />
        {loadingCities && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
        {errors.postcode && <Text style={styles.errorText}>{errors.postcode}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Stadt *</Text>
        {cities.length > 0 ? (
          <TouchableOpacity
            style={[styles.datePickerButton, errors.city && styles.inputError]}
            onPress={() => setShowCityPicker(true)}
          >
            <Text style={formData.city ? styles.datePickerText : styles.datePickerPlaceholder}>
              {formData.city || 'Stadt auswählen'}
            </Text>
            <ChevronRight size={20} color={Colors.gray600} />
          </TouchableOpacity>
        ) : (
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            placeholder="Deine Stadt"
            value={formData.city}
            onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
            autoCapitalize="words"
          />
        )}
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        <Text style={styles.helperText}>
          Für lokale Event-Empfehlungen
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Fast geschafft!</Text>
      <Text style={styles.stepDescription}>
        Bitte akzeptiere unsere Nutzungsbedingungen
      </Text>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          {errorMessage.includes('bereits registriert') && (
            <TouchableOpacity
              style={styles.errorBannerButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.errorBannerButtonText}>Zum Login</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setFormData(prev => ({ ...prev, agreeTerms: !prev.agreeTerms }))}
        >
          <View style={[styles.checkbox, formData.agreeTerms && styles.checkboxChecked]}>
            {formData.agreeTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Ich akzeptiere die <Text style={styles.link}>AGBs</Text> *
          </Text>
        </TouchableOpacity>
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setFormData(prev => ({ ...prev, agreePrivacy: !prev.agreePrivacy }))}
        >
          <View style={[styles.checkbox, formData.agreePrivacy && styles.checkboxChecked]}>
            {formData.agreePrivacy && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Ich akzeptiere die <Text style={styles.link}>Datenschutzerklärung</Text> *
          </Text>
        </TouchableOpacity>
        {errors.privacy && <Text style={styles.errorText}>{errors.privacy}</Text>}
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setFormData(prev => ({ ...prev, agreeGDPR: !prev.agreeGDPR }))}
        >
          <View style={[styles.checkbox, formData.agreeGDPR && styles.checkboxChecked]}>
            {formData.agreeGDPR && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Ich stimme der Datenverarbeitung gemäß GDPR zu *
          </Text>
        </TouchableOpacity>
        {errors.gdpr && <Text style={styles.errorText}>{errors.gdpr}</Text>}
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setFormData(prev => ({ ...prev, agreeMarketing: !prev.agreeMarketing }))}
        >
          <View style={[styles.checkbox, formData.agreeMarketing && styles.checkboxChecked]}>
            {formData.agreeMarketing && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Ich möchte Marketing-E-Mails erhalten (optional)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Deine Daten:</Text>
        <Text style={styles.summaryText}>📧 {formData.email}</Text>
        <Text style={styles.summaryText}>👤 {formData.firstName} {formData.lastName}</Text>
        <Text style={styles.summaryText}>🔤 @{formData.username}</Text>
        <Text style={styles.summaryText}>📅 {formData.birthDay}.{formData.birthMonth}.{formData.birthYear}</Text>
        <Text style={styles.summaryText}>📍 {formData.postcode} {formData.city}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrierung</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressSegment,
              s <= step && styles.progressSegmentActive
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleBack}
          >
            <ChevronLeft size={20} color={Colors.primary} />
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>
        )}

        {step < 4 ? (
          <TouchableOpacity
            style={[styles.button, styles.nextButton, step === 1 && styles.buttonFull]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Weiter</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Registrierung abschließen
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {registeredUserId && (
        <PhoneVerificationModal
          visible={showPhoneModal}
          onClose={handleSkipPhone}
          onVerified={handlePhoneVerified}
          userId={registeredUserId}
        />
      )}

      {/* Day Picker Modal */}
      <Modal visible={showDayPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag auswählen</Text>
              <TouchableOpacity onPress={() => setShowDayPicker(false)}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDays()}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, birthDay: item.toString() }));
                    setShowDayPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Monat auswählen</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MONTHS}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, birthMonth: (index + 1).toString() }));
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Jahr auswählen</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getYears()}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, birthYear: item.toString() }));
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stadt auswählen</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cities}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, city: item }));
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPickerContainer}>
                  <Text style={styles.emptyPickerText}>Keine Städte gefunden</Text>
                </View>
              }
            />
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Oder manuell eingeben:</Text>
              <TextInput
                style={styles.input}
                placeholder="Stadt eingeben"
                value={formData.city}
                onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={styles.manualInputButton}
                onPress={() => setShowCityPicker(false)}
              >
                <Text style={styles.manualInputButtonText}>Übernehmen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContent: {
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  dateInputYear: {
    flex: 1.5,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  dateSeparator: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: 'bold',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  pickerItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  emptyPickerContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  manualInputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  manualInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  manualInputButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  manualInputButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkboxGroup: {
    marginBottom: Spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 6,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    padding: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  buttonFull: {
    flex: 1,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  errorBannerButton: {
    backgroundColor: '#DC2626',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  errorBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
