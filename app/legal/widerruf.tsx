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
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';

export default function WiderrufScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Widerrufsbelehrung</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widerrufsrecht</Text>
          <Text style={styles.text}>
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
          </Text>
          <Text style={styles.text}>
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
          </Text>
          <Text style={styles.text}>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
          </Text>
          <Text style={styles.boldText}>
            IMMOPRO LLC{'\n'}
            1209 MOUNTAIN ROAD PL NE STE N{'\n'}
            Albuquerque, NM 87110{'\n'}
            E-Mail: support@jetzz.app
          </Text>
          <Text style={styles.text}>
            mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
          </Text>
          <Text style={styles.text}>
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Folgen des Widerrufs</Text>
          <Text style={styles.text}>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
          </Text>
          <Text style={styles.text}>
            Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Besondere Hinweise bei digitalen Inhalten</Text>
          <Text style={styles.text}>
            Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
          </Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Wichtig: Bei Premium-Abonnements mit sofortiger Leistungserbringung erlischt Ihr Widerrufsrecht, wenn Sie ausdrücklich zugestimmt haben, dass wir mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und Sie Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muster-Widerrufsformular</Text>
          <Text style={styles.text}>
            Wenn Sie den Vertrag widerrufen wollen, dann können Sie folgendes Formular verwenden:
          </Text>
          <View style={styles.formular}>
            <Text style={styles.formularText}>
              An{'\n'}
              IMMOPRO LLC{'\n'}
              1209 MOUNTAIN ROAD PL NE STE N{'\n'}
              Albuquerque, NM 87110{'\n'}
              E-Mail: support@jetzz.app{'\n\n'}
              Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*){'\n\n'}
              Bestellt am (*)/erhalten am (*){'\n\n'}
              Name des/der Verbraucher(s){'\n\n'}
              Anschrift des/der Verbraucher(s){'\n\n'}
              Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier){'\n\n'}
              Datum{'\n\n'}
              (*) Unzutreffendes streichen.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Stand: Dezember 2024</Text>
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
    marginBottom: Spacing.md,
  },
  boldText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    lineHeight: 22,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
  },
  warningBox: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    marginTop: Spacing.md,
  },
  warningText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    lineHeight: 22,
    fontWeight: FontWeights.medium,
  },
  formular: {
    backgroundColor: Colors.gray100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    marginTop: Spacing.md,
  },
  formularText: {
    fontSize: FontSizes.sm,
    color: Colors.gray800,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
});
