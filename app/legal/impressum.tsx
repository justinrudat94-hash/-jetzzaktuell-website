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

export default function ImpressumScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impressum</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Angaben gemäß § 5 TMG</Text>
          <Text style={styles.text}>IMMOPRO LLC</Text>
          <Text style={styles.text}>1209 MOUNTAIN ROAD PL NE STE N</Text>
          <Text style={styles.text}>Albuquerque, NM 87110</Text>
          <Text style={styles.text}>United States</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.text}>E-Mail: support@jetzz.app</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vertreten durch</Text>
          <Text style={styles.text}>IMMOPRO LLC</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Umsatzsteuer-ID</Text>
          <Text style={styles.text}>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{'\n'}
            [Ihre USt-IdNr.]
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</Text>
          <Text style={styles.text}>IMMOPRO LLC</Text>
          <Text style={styles.text}>1209 MOUNTAIN ROAD PL NE STE N</Text>
          <Text style={styles.text}>Albuquerque, NM 87110</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EU-Streitschlichtung</Text>
          <Text style={styles.text}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr
          </Text>
          <Text style={styles.text}>
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verbraucherstreitbeilegung / Universalschlichtungsstelle</Text>
          <Text style={styles.text}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haftung für Inhalte</Text>
          <Text style={styles.text}>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </Text>
          <Text style={styles.text}>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haftung für Links</Text>
          <Text style={styles.text}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          </Text>
          <Text style={styles.text}>
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Urheberrecht</Text>
          <Text style={styles.text}>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </Text>
          <Text style={styles.text}>
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
          </Text>
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
  },
});
