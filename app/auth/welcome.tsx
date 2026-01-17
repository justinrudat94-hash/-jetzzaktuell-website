import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../../constants';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus, Users } from 'lucide-react-native';
import LogoComponent from '../../components/LogoComponent';
import { useAuth } from '../../utils/authContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleRegister = () => {
    router.push('/auth/register');
  };

  const handleGuestMode = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <LogoComponent width={200} height={80} />
          <Text style={styles.tagline}>Event-Plattform</Text>
        </View>

        <View style={styles.authButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <LogIn size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Anmelden</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRegister}>
            <UserPlus size={20} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Registrieren</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guestButton} onPress={handleGuestMode}>
            <Users size={20} color={Colors.gray600} />
            <Text style={styles.guestButtonText}>Als Gast fortfahren</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uber uns</Text>
          <Text style={styles.text}>
            JETZZ ist eine Event-Plattform, die es Nutzern ermoglicht, lokale Events zu entdecken und zu teilen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impressum</Text>
          <Text style={styles.text}>
            ImmoPro LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110{'\n'}
            USA{'\n\n'}

            Registered Agent: NORTHWEST REGISTERED AGENT, INC.{'\n'}
            E-Mail: kontaktjetzz@zohomail.eu{'\n'}
            Business ID: #7890460{'\n'}
            Gründung: 15. Oktober 2024
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutz</Text>
          <Text style={styles.text}>
            Verantwortlich fur die Datenverarbeitung:{'\n'}
            ImmoPro LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110, USA{'\n\n'}

            Kontakt Datenschutz:{'\n'}
            E-Mail: kontaktjetzz@zohomail.eu{'\n\n'}

            Wir verarbeiten personenbezogene Daten nur im erforderlichen Umfang und gemaß den gesetzlichen Bestimmungen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.text}>
            E-Mail: kontaktjetzz@zohomail.eu
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.xxl,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray300,
  },
  tagline: {
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  authButtons: {
    marginVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: Colors.gray100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  guestButtonText: {
    color: Colors.gray600,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginVertical: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});
