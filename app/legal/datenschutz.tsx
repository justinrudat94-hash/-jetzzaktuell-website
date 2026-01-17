import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';

export default function DatenschutzScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datenschutz</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <AlertCircle size={24} color={Colors.warning} />
          <Text style={styles.noticeText}>
            Vollständige DSGVO-konforme Datenschutzerklärung wird in Kürze hinzugefügt. Bitte kontaktieren Sie support@jetzz.app für Fragen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datenschutzerklärung</Text>
          <Text style={styles.text}>
            Der Schutz Ihrer personenbezogenen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten gemäß den geltenden Datenschutzvorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Verantwortliche Stelle</Text>
          <Text style={styles.text}>
            IMMOPRO LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110{'\n'}
            E-Mail: support@jetzz.app
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Erhebung und Speicherung personenbezogener Daten</Text>
          <Text style={styles.text}>
            Wir erheben und speichern folgende Daten:{'\n\n'}
            • Registrierungsdaten (Name, E-Mail-Adresse, Benutzername){'\n'}
            • Profilangaben (Profilbild, Biografie, Stadt){'\n'}
            • Event-Daten (erstellte Events, Teilnahmen){'\n'}
            • Nutzungsdaten (Interaktionen, Favoriten, Likes){'\n'}
            • Zahlungsdaten (über Stripe verarbeitet){'\n'}
            • Standortdaten (mit Ihrer Zustimmung)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Zweck der Datenverarbeitung</Text>
          <Text style={styles.text}>
            Die Verarbeitung Ihrer Daten erfolgt zu folgenden Zwecken:{'\n\n'}
            • Bereitstellung und Verbesserung unserer Dienste{'\n'}
            • Vertragsabwicklung und Zahlungsabwicklung{'\n'}
            • Personalisierung der Nutzererfahrung{'\n'}
            • Kommunikation mit Nutzern{'\n'}
            • Sicherheit und Betrugsprävention
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Rechtsgrundlagen</Text>
          <Text style={styles.text}>
            Die Verarbeitung erfolgt auf Grundlage von:{'\n\n'}
            • Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung){'\n'}
            • Art. 6 Abs. 1 lit. a DSGVO (Einwilligung){'\n'}
            • Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Weitergabe von Daten</Text>
          <Text style={styles.text}>
            Wir geben Ihre Daten nur weiter an:{'\n\n'}
            • Stripe (Zahlungsabwicklung){'\n'}
            • Supabase (Hosting und Datenbank){'\n'}
            • Nur soweit gesetzlich erforderlich
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Speicherdauer</Text>
          <Text style={styles.text}>
            Wir speichern Ihre Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Ihre Rechte</Text>
          <Text style={styles.text}>
            Sie haben folgende Rechte:{'\n\n'}
            • Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO){'\n'}
            • Berichtigung unrichtiger Daten (Art. 16 DSGVO){'\n'}
            • Löschung Ihrer Daten (Art. 17 DSGVO){'\n'}
            • Einschränkung der Verarbeitung (Art. 18 DSGVO){'\n'}
            • Datenübertragbarkeit (Art. 20 DSGVO){'\n'}
            • Widerspruch gegen die Verarbeitung (Art. 21 DSGVO){'\n'}
            • Beschwerde bei einer Aufsichtsbehörde
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies und Tracking</Text>
          <Text style={styles.text}>
            Wir verwenden Cookies und ähnliche Technologien, um die Funktionalität unserer App zu gewährleisten und Ihre Nutzererfahrung zu verbessern.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Sicherheit</Text>
          <Text style={styles.text}>
            Wir treffen angemessene technische und organisatorische Maßnahmen, um Ihre Daten vor unbefugtem Zugriff, Verlust oder Missbrauch zu schützen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Änderungen</Text>
          <Text style={styles.text}>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen. Die aktuelle Version finden Sie stets in der App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.text}>
            Bei Fragen zum Datenschutz wenden Sie sich bitte an:{'\n\n'}
            IMMOPRO LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110{'\n'}
            E-Mail: support@jetzz.app
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Stand: Dezember 2024</Text>
          <Text style={styles.footerNote}>
            Diese Datenschutzerklärung ist vorläufig. Eine vollständige DSGVO-konforme Version folgt.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.md,
    marginLeft: -Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  noticeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray800,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  footerNote: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    textAlign: 'center',
  },
});
