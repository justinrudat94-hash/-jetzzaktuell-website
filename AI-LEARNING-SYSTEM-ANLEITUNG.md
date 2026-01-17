# AI Learning System - Bedienungsanleitung

## Wo finde ich die Learning Queue?

Im **Admin-Dashboard** unter:
```
Admin-Dashboard → Verwaltung → "KI Learning Queue"
```

Oder direkt über die URL:
```
/admin/ai-learning-queue
```

---

## Was ist die Learning Queue?

Die Learning Queue sammelt **potenzielle neue Wissenseinträge**, die aus User-Feedback entstanden sind. Deine Aufgabe ist es, diese zu reviewen und zu entscheiden, ob sie als offizielles Wissen gespeichert werden sollen.

---

## Deine Aufgaben als Admin

### 1. **Neue Einträge reviewen**

In der Queue siehst du Einträge mit Status "Ausstehend":
- **Frage**: Was der User gefragt hat
- **Antwort**: Die verbesserte Antwort, die generiert wurde
- **Quelle**: Woher der Eintrag kommt (z.B. "feedback")
- **Konfidenz**: Wie sicher das System ist (70-100%)
- **Keywords**: Automatisch extrahierte Schlagwörter

### 2. **Entscheiden: Genehmigen oder Ablehnen**

**Genehmigen**, wenn:
- Die Antwort korrekt und hilfreich ist
- Die Antwort allgemein anwendbar ist (nicht zu spezifisch)
- Die Frage häufig gestellt wird

**Ablehnen**, wenn:
- Die Antwort falsch oder veraltet ist
- Die Antwort zu spezifisch ist
- Ein Duplikat existiert

### 3. **Ergebnis**

**Bei Genehmigung:**
- Wird automatisch als Wissen gespeichert
- Alle zukünftigen User bekommen diese Antwort sofort
- Keine GPT-Kosten mehr für diese Frage
- System wird schneller

**Bei Ablehnung:**
- Eintrag wird archiviert
- Hat keinen Einfluss auf das System
- Kann in der Historie eingesehen werden

---

## Automatische Freigabe (Auto-Approval)

Das System kann **automatisch lernen** ohne dein Zutun!

### Wann passiert Auto-Approval?

1. **User gibt negatives Feedback** auf eine Antwort
2. System generiert **verbesserte Antwort**
3. User bewertet verbesserte Antwort als "Hilfreich" 👍
4. → **Automatisch genehmigt und gespeichert!**

### Oder durch Success-Pattern:

1. Eine Frage wird **5x gestellt**
2. GPT antwortet jedes Mal
3. **3x wird die Antwort als "Hilfreich" bewertet**
4. → System erkennt Pattern
5. → **Automatisch als Wissen gespeichert!**

**Vorteil:** Das System lernt ohne deine Arbeit!

---

## Duplikate werden verhindert

### Wie?

Die Datenbank hat einen **UNIQUE Constraint** auf:
```sql
UNIQUE (question_pattern, answer_template)
```

Das bedeutet:
- **Gleiche Frage + Gleiche Antwort** → Fehler beim Einfügen
- Duplikate werden automatisch ignoriert
- Datenbank bleibt sauber

### Zusätzlicher Schutz:

Bei Auto-Learning prüft das System:
```sql
WHERE NOT has_knowledge_entry = true
```

Fragen, für die bereits Wissen existiert, werden **nicht nochmal gelernt**.

---

## Dashboard-Features

### Statistiken (oben)
- **Ausstehend**: Wie viele Einträge auf dein Review warten
- **Genehmigt**: Wie viele du schon genehmigt hast
- **Gelernt**: Wie viele durch Auto-Approval gelernt wurden
- **Erfolgsrate**: Durchschnittliche Qualität aller Wissenseinträge

### Aktionen
- **Auto-Learning**: Triggert manuell das automatische Lernen
  - Sucht nach Fragen mit 5+ erfolgreichen Antworten
  - Erstellt automatisch Wissenseinträge
- **Bereinigen**: Entfernt schlechte Einträge
  - Deaktiviert Einträge mit <40% Erfolgsrate
  - Archiviert sie in der Historie

### Filter & Suche
- **Status-Filter**: Ausstehend / Alle
- **Suche**: Durchsucht Fragen und Antworten
- **Expandieren**: Klicke auf einen Eintrag für Details

---

## Workflow-Beispiel

### Szenario 1: User-Feedback Flow

1. **User chattet:** "Wie kann ich mein Konto löschen?"
2. **KI antwortet** mit allgemeiner Info
3. **User klickt:** 👎 "Nicht hilfreich"
4. **Modal öffnet sich:**
   - User wählt: "Unvollständig"
   - User schreibt: "Fehlt Schritt-für-Schritt Anleitung"
5. **System generiert** sofort neue Antwort mit Details
6. **Neue Antwort erscheint** im Chat
7. **User klickt:** 👍 "Hilfreich"
8. → **Automatisch genehmigt!**
9. **Nächster User** mit gleicher Frage bekommt sofort die gute Antwort

**Du musst nichts tun!** ✓

### Szenario 2: Du reviewst manuell

1. **Du öffnest** Learning Queue im Admin
2. **Du siehst:** 3 ausstehende Einträge
3. **Du klickst** auf ersten Eintrag
4. **Du liest:**
   - Frage: "Wie ändere ich mein Passwort?"
   - Antwort: "Gehe zu Profil → Einstellungen → Passwort ändern..."
   - Quelle: feedback
   - Konfidenz: 75%
5. **Du denkst:** "Gute Antwort, kommt häufig vor"
6. **Du klickst:** "Genehmigen" ✓
7. → **Wird als Wissen gespeichert**
8. **Alle zukünftigen User** bekommen diese Antwort direkt

### Szenario 3: Auto-Learning (täglich)

1. **Cron-Job läuft** täglich um 03:00 Uhr
2. **System analysiert** alle Fragen der letzten 30 Tage
3. **Findet:**
   - "Wie funktioniert Premium?" → 8x gefragt, 6x hilfreich
   - "Ticket-Status prüfen?" → 5x gefragt, 4x hilfreich
4. → **Beide automatisch als Wissen gespeichert!**
5. **Morgens siehst du** im Dashboard:
   - "Auto-Gelernt: 2"
   - Beide Einträge haben Status "Auto-Genehmigt"

---

## Best Practices

### Wann solltest du reviewen?

**Täglich/Wöchentlich:**
- Checke "Ausstehend"-Counter im Dashboard
- Bei >10 Einträgen → Zeit zum Reviewen
- 5-10 Minuten reichen meist

### Worauf achten?

1. **Korrektheit**: Stimmt die Antwort?
2. **Aktualität**: Ist die Info noch aktuell?
3. **Allgemeingültigkeit**: Gilt die Antwort für alle User?
4. **Klarheit**: Ist die Antwort verständlich?

### Duplikate erkennen

Wenn du vermutest, dass bereits Wissen existiert:
1. Öffne "Support-Tickets" → "FAQ Management"
2. Suche nach ähnlichen Fragen
3. Existiert schon? → Ablehnen
4. Existiert nicht? → Genehmigen

---

## Automatische Bereinigung

Das System **entfernt automatisch** schlechte Einträge:

**Kriterien:**
- Mindestens 10x verwendet
- Erfolgsrate <40%

**Was passiert:**
- Eintrag wird deaktiviert
- In Historie archiviert (nicht gelöscht!)
- System nutzt Eintrag nicht mehr
- Du siehst es in den Statistiken

**Du kannst auch manuell triggern:**
1. Klicke "Bereinigen"-Button
2. System checkt alle Einträge
3. Deaktiviert schlechte
4. Zeigt Ergebnis an

---

## Häufige Fragen

### Muss ich jeden Eintrag reviewen?

**Nein!** Das System lernt auch automatisch:
- Bei positivem User-Feedback → Auto-Approval
- Bei häufigen erfolgreichen Fragen → Auto-Learning
- Du reviewst nur, wenn du Zeit hast oder >10 Einträge warten

### Was passiert bei Duplikaten?

**Datenbank verhindert Duplikate:**
- Gleiche Frage + Antwort → Fehler
- Eintrag wird nicht eingefügt
- Du siehst ggf. Fehler in der Learning Queue
- Kannst ihn einfach ablehnen

### Kann ich Auto-Approval deaktivieren?

**Nein, aber das willst du nicht:**
- Auto-Approval passiert nur bei **2x positivem Feedback**
- Das ist ein starkes Signal für Qualität
- Spart dir viel Review-Arbeit
- Du kannst schlechte Auto-Approved Einträge später manuell deaktivieren

### Wie sehe ich Historie?

**Aktuell nur in der Datenbank:**
```sql
SELECT * FROM chat_knowledge_history
WHERE knowledge_id = 'xxx'
ORDER BY version DESC;
```

**Geplant:** Historie-Ansicht im Admin-Dashboard

---

## Performance-Metriken

### Was bedeuten die Zahlen?

**Erfolgsrate:**
- Wie oft wurde die Antwort als hilfreich bewertet
- >80% = Sehr gut
- 60-80% = Okay
- <40% = Wird automatisch deaktiviert

**Verwendungen:**
- Wie oft wurde der Eintrag genutzt
- Mehr = Wichtiger

**Konfidenz-Score:**
- Wie sicher das System ist
- 0.70-0.80 = Gut
- 0.80-0.90 = Sehr gut
- >0.90 = Exzellent

---

## Zusammenfassung

**Deine Rolle:**
- Reviewe ausstehende Einträge (wenn >10)
- Genehmige gute Antworten
- Lehne schlechte/doppelte ab
- Nutze "Auto-Learning" bei Bedarf

**Das System macht:**
- Automatisches Lernen aus positivem Feedback
- Automatisches Lernen aus Success-Patterns
- Automatische Bereinigung schlechter Einträge
- Duplikate werden verhindert

**Ergebnis:**
- KI wird immer besser
- Schnellere Antworten
- Niedrigere Kosten
- Glücklichere User

**Zeitaufwand:**
- 5-10 Minuten/Woche
- System arbeitet 95% automatisch
- Du hast die Kontrolle über Qualität
