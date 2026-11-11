# FabiVocs

Ein Vokabeltrainer für Englisch in Klasse 5 am Gymnasium. Deutsche Oberfläche, keine Anmeldung, kein Backend und keine externen Laufzeit-Abhängigkeiten. Die Website lässt sich als statische Seite auf GitHub Pages betreiben.

## Lokal starten

Node.js ab Version 20 (empfohlen: Node.js 22 oder neuer) genügt. Eine Paketinstallation ist nicht notwendig.

```sh
npm run dev
```

Anschließend <http://127.0.0.1:4173> öffnen. Der Server erstellt beim Start die Website. Nach Änderungen `npm run build` ausführen und den Browser neu laden oder den Server neu starten.

```sh
npm test
npm run build
```

Das Ergebnis liegt in `dist/`. Die Website über HTTP aufrufen, nicht durch Doppelklick auf die HTML-Datei, da gemeinsame Listen per `fetch` geladen werden.

## GitHub Pages einschalten

1. Die Dateien in das Repository `fpiesik/fabivocs` auf den Branch `main` committen und pushen.
2. Auf GitHub unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** auswählen.
3. Unter **Actions** den Workflow „Testen und auf GitHub Pages veröffentlichen“ prüfen. Falls der erste Lauf vor der Pages-Einrichtung fehlgeschlagen ist, erneut starten (**Re-run all jobs**) oder über **Run workflow** auslösen.
4. Nach erfolgreichem Deployment steht die Seite unter <https://fpiesik.github.io/fabivocs/> bereit, sofern keine eigene Domain konfiguriert ist.

Der [Workflow](.github/workflows/pages.yml) prüft und baut jeden Push auf `main`, einschließlich Änderungen an den Vokabeldateien, und veröffentlicht danach automatisch. Pull Requests werden getestet und gebaut, aber nicht veröffentlicht. Deployments benötigen keine selbst angelegten Tokens oder Secrets; sie verwenden die GitHub-Pages-Berechtigungen des Workflows. Alle Asset-URLs sind relativ und funktionieren auch unter dem Repository-Unterpfad.

## Die fünf Spielmodi

| Modus | Ablauf |
| --- | --- |
| Ganz entspannt | 10, 20 oder alle Wörter; mit Lösung und Rückmeldung, ohne Zeitdruck. Kleine Listen werden nur einmal abgefragt. |
| Karteikarten | Antwort überlegen, Karte umdrehen und ehrlich selbst einschätzen. |
| Wörter verbinden | Bis zu sechs eindeutige Wortpaare verbinden. Fehlversuche können korrigiert werden. |
| Gegen die Uhr | Möglichst viele richtige Antworten in 30, 60 oder 120 Sekunden. |
| Auf die Plätze! | 10, 20 oder 30 richtige Antworten so schnell wie möglich. Falsche Antworten zählen nicht zum Ziel. |

Üben und beide Speedruns unterstützen **Multiple Choice** und **freies Schreiben**. Karteikarten verwenden Selbsteinschätzung; das Zuordnungsspiel eigene Wortschaltflächen. Beide Lernrichtungen sind verfügbar. Bei zu wenigen unterschiedlichen Antwortmöglichkeiten wird die freie Eingabe verwendet.

Groß-/Kleinschreibung, äußere und doppelte Leerzeichen sowie typografische Apostrophe werden beim Vergleich vereinheitlicht. Buchstaben, Akzente, Artikel und Satzzeichen müssen stimmen. Mit `|` hinterlegte alternative Übersetzungen werden akzeptiert. Beispiel: `Freund | Freundin`.

Bei Speedruns können sich Wörter wiederholen. Die Uhr läuft auch während der Lösungsanzeige, eines Dialogs oder eines Tab-Wechsels. Fehler kosten dadurch Zeit. Abgebrochene Runden behalten ihren Lernfortschritt, zählen aber nicht als Rekord. Rekorde werden nur bei derselben Liste mit denselben Wortpaaren, derselben Lernrichtung, Antwortart, Filterauswahl und demselben Zeitlimit bzw. Ziel verglichen.

## Vokabeln einfach importieren

Unter **Wortschatz** eine Datei auswählen oder zwei Spalten aus Excel/LibreOffice in das Textfeld kopieren. Unterstützt werden:

- **CSV / TSV / Text:** genau zwei Spalten, getrennt durch Semikolon, Komma oder Tabulator. UTF-8 verwenden; `.xlsx` zunächst als **CSV UTF-8** exportieren.
- **JSON:** eine Liste, ein Array von Wortpaaren oder mehrere zuvor exportierte Listen.

Vor dem Import werden die ersten fünf Wortpaare jeder Liste angezeigt. Fehlerhafte Zeilen verhindern den Import vollständig. Identische Wortpaare werden zusammengeführt. Grenzen: 2 MB pro Import, 5.000 Wortpaare pro Liste, 50 Listen pro JSON-Import und 300 Zeichen pro Wortseite.

CSV-Beispiel, mit optionaler Kopfzeile:

```csv
Englisch;Deutsch
apple;Apfel
school;Schule
friend;Freund | Freundin
"hello, friend";"hallo, Freund | hallo, Freundin"
```

[CSV-Beispieldatei herunterladen](examples/vokabeln.csv). Text mit Trennzeichen oder Zeilenumbrüchen in Anführungszeichen setzen. Ein Anführungszeichen innerhalb eines Feldes wird verdoppelt (`""`). Exporte enthalten die Vokabellisten als JSON und lassen sich auf einem anderen Gerät wieder importieren; sie enthalten keinen Lernfortschritt.

## Gemeinsame Listen über GitHub pflegen

### Direkt aus dem Trainer veröffentlichen

1. Die Wörter unter **Wortschatz** importieren und die Vorschau bestätigen.
2. Bei der eigenen Liste **Auf GitHub speichern** auswählen.
3. Im Dialog **Datei herunterladen** anklicken. Dabei wird eine einzelne Liste im passenden Repository-Format erzeugt, ohne Lernfortschritt oder lokale Kennungen.
4. **GitHub-Upload öffnen** anklicken und auf GitHub mit deinem Konto anmelden. Der Link öffnet bereits den Ordner `data/decks` auf `main` in `fpiesik/fabivocs`.
5. Die heruntergeladene Datei über **choose your files** auswählen und mit **Commit changes** bestätigen. Bei einem geschützten Branch oder fehlender Schreibberechtigung muss die Änderung zuerst über einen Pull Request übernommen werden.
6. Die erfolgreiche Ausführung des Pages-Workflows abwarten und den Trainer auf den anderen Geräten neu laden. Im Dialog gibt es einen Link zum Veröffentlichungsstatus.

Die Anmeldung und die Schreibberechtigung übernimmt ausschließlich GitHub. Der Trainer speichert keine Zugangsschlüssel und benötigt weder einen zusätzlichen Dienst noch ein eigenes Passwort. Das Herunterladen oder Öffnen von GitHub bedeutet noch nicht, dass die Liste veröffentlicht wurde. Der Ablauf verwendet GitHubs [Datei-Upload im Browser](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

Jede Liste wird einzeln übertragen. Der Dateiname wird aus dem Listennamen und einem Inhaltsfingerabdruck erzeugt: Wiederholte Downloads derselben Liste verwenden denselben Namen; unterschiedliche Inhalte bekommen unterschiedliche Namen. Den Namen beim Upload beibehalten. Der normale **Exportieren**-Button erstellt weiterhin eine Browser-Sicherung mit einem `decks`-Array; für den Repository-Upload bitte die Datei aus **Auf GitHub speichern** verwenden.

Die lokale Liste und ihr Lernfortschritt bleiben erhalten. Nach dem Deployment erscheint zusätzlich die gemeinsame Liste. Bei Bedarf kannst du die lokale Kopie später löschen. Änderungen am Inhalt erzeugen beim erneuten Veröffentlichen eine neue Datei; zum Ersetzen einer vorhandenen gemeinsamen Liste deren Datei direkt auf GitHub bearbeiten.

Das Zielrepository und der Branch stehen in [src/github.js](src/github.js). Bei einem Fork diese Werte anpassen; der Veröffentlichungsbranch muss zum [Workflow](.github/workflows/pages.yml) passen.

### Dateien direkt im Repository bearbeiten

Eine JSON-Datei im Ordner [data/decks](data/decks) anlegen oder bearbeiten:

```json
{
  "name": "Unit 1 – At school",
  "sourceLanguage": "Englisch",
  "targetLanguage": "Deutsch",
  "words": [
    { "front": "classroom", "back": "Klassenzimmer | Klassenraum" },
    { "front": "teacher", "back": "Lehrer | Lehrerin" }
  ]
}
```

Jede JSON-Datei enthält eine Liste. Der Build findet alle `.json`-Dateien in diesem Ordner, validiert die Inhalte und erstellt automatisch den Katalog. Nach dem Push auf `main` erscheinen die Änderungen nach dem erfolgreichen Deployment und Neuladen auf allen Geräten. Den Dateinamen möglichst beibehalten, damit der Lernfortschritt unveränderter Wortpaare zugeordnet bleibt. Eine gültige Liste muss vorhanden sein.

Gemeinsame Listen und Website sind öffentlich zugänglich. Nur Vokabeln eintragen, keine persönlichen Daten. Mitgelieferte Listen sind allgemeine Beispiele und keinem bestimmten Schulbuch zugeordnet.

## Speicherung und Fortschritt

Eigene Listen, Wortlernstand und die letzten 500 Runden werden im `localStorage` dieses Browsers gespeichert. Es gibt keine Cloud-Synchronisierung, Analyse-Dienste oder externen Schriftarten. Die Anwendung meldet, wenn der Browser keine Daten speichern kann. Browserdaten löschen, privates Surfen und Gerätewechsel können zum Verlust eigener Daten führen; deshalb wichtige Listen exportieren.

Der Filter **Nur schwierige Wörter** enthält Wörter mit mindestens einem Fehler, bis drei richtige Antworten in Folge erreicht sind. Der Lernstand wird je Wortpaar und Lernrichtung geführt. Karteikarten zählen gemäß Selbsteinschätzung. Die Statistik wird beim Abschluss oder bewussten Beenden einer Runde gespeichert; beim Verlassen einer laufenden Runde warnt der Browser vor dem Verlust dieser Runde.

## Aufbau und Prüfungen

- [src/core.js](src/core.js): CSV-/JSON-Import, Antwortvergleich, Wortauswahl und Zeit-/Datumslogik.
- [src/app.js](src/app.js): Oberfläche, Spielabläufe, Speicherung und Statistik.
- [src/github.js](src/github.js): Zielrepository und Vorbereitung einzelner Listen für den GitHub-Upload.
- [styles.css](styles.css): responsive Gestaltung, Tastaturfokus und reduzierte Bewegung.
- [scripts/build.mjs](scripts/build.mjs): statischer Build und Validierung gemeinsamer Listen.
- [tests/core.test.js](tests/core.test.js): automatisierte Tests mit Nodes eingebautem Test-Runner.
- [tests/github.test.js](tests/github.test.js): Repository-Dateiformat, stabile sichere Dateinamen und große Listen.

Manuelle Browserprüfung: Listen importieren und exportieren, Lernrichtung wechseln, richtige/falsche Antworten und Überspringen prüfen, alle Spielmodi abschließen, den Timer ablaufen lassen und nach Neuladen die Persistenz prüfen. Auch die Ansicht auf einem schmalen Bildschirm und Bedienung per Tastatur prüfen.
