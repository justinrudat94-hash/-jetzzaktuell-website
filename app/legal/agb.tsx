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

export default function AGBScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AGB</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <AlertCircle size={24} color={Colors.warning} />
          <Text style={styles.noticeText}>
            Vollständige AGB werden in Kürze hinzugefügt. Bitte kontaktieren Sie support@jetzz.app für Fragen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allgemeine Geschäftsbedingungen</Text>
          <Text style={styles.text}>
            Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der JETZZ App und der damit verbundenen Dienste.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Geltungsbereich</Text>
          <Text style={styles.text}>
            Diese AGB gelten für alle Verträge zwischen IMMOPRO LLC und den Nutzern der JETZZ App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Vertragsschluss</Text>
          <Text style={styles.text}>
            Der Vertrag kommt durch Registrierung und Bestätigung der AGB zustande.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Leistungen</Text>
          <Text style={styles.text}>
            JETZZ bietet eine Plattform zur Erstellung, Verwaltung und Teilnahme an Events.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Premium-Abonnement</Text>
          <Text style={styles.text}>
            Das Premium-Abonnement kann monatlich oder jährlich abgeschlossen werden. Die Laufzeit verlängert sich automatisch, sofern nicht gekündigt wird.
          </Text>
          <Text style={styles.text}>
            Kündigungen können jederzeit vorgenommen werden und werden zum Ende der Laufzeit wirksam.
          </Text>
          <Text style={styles.text}>
            Bei der jährlichen Zahlung beträgt die Ersparnis gegenüber 12 monatlichen Zahlungen ca. 17%.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Zahlungsbedingungen</Text>
          <Text style={styles.text}>
            Zahlungen erfolgen über Stripe. Die Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Widerrufsrecht</Text>
          <Text style={styles.text}>
            Verbraucher haben ein 14-tägiges Widerrufsrecht. Details siehe Widerrufsbelehrung.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Haftung</Text>
          <Text style={styles.text}>
            Die Haftung richtet sich nach den gesetzlichen Bestimmungen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Datenschutz</Text>
          <Text style={styles.text}>
            Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Details finden Sie in unserer Datenschutzerklärung.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Änderungen der AGB</Text>
          <Text style={styles.text}>
            Wir behalten uns vor, diese AGB zu ändern. Nutzer werden über Änderungen informiert.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Schlussbestimmungen</Text>
          <Text style={styles.text}>
            Es gilt das Recht der Bundesrepublik Deutschland.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.text}>
            IMMOPRO LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110{'\n'}
            E-Mail: support@jetzz.app
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Stand: Dezember 2024</Text>
          <Text style={styles.footerNote}>
            Diese AGB sind vorläufig. Vollständige rechtlich geprüfte AGB folgen.
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
