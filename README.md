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

Üben und beide Speedruns unterstützen **Multiple Choice** und **freies Schreiben**. Karteikarten verwenden Selbsteinschätzung; das Zuordnungsspiel eigene Wortschaltflächen. Als Lernrichtung stehen **Englisch → Deutsch**, **Deutsch → Englisch** und **Gemischt** zur Verfügung (bei eigenen Sprachpaaren entsprechend deren Sprachen). Bei „Gemischt“ wird die Richtung pro Frage bzw. Wortpaar zufällig gewählt und bleibt bis zur nächsten Frage unverändert, auch beim Umdrehen einer Karte. Der Lernfortschritt zählt für die tatsächlich geübte Richtung; der Filter für schwierige Wörter berücksichtigt beide Richtungen und fragt nur die noch schwierigen ab. Gemischte Speedruns haben eigene Rekorde. Bei zu wenigen unterschiedlichen Antwortmöglichkeiten wird die freie Eingabe verwendet.

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

### CSV-Dateien ablegen

Speichere deine CSV-Dateien direkt im Ordner [data/decks](data/decks) und pushe sie auf `main`. Jede Datei wird automatisch als eigene Vokabelliste erkannt. Der Listenname ist der Dateiname ohne `.csv`: `Unit 1.csv` erscheint als **Unit 1**. Eine zusätzliche Registrierung oder Änderung am Programm ist nicht nötig.

Die erste Spalte enthält Englisch, die zweite Deutsch. Beispiel:

```csv
Englisch;Deutsch
apple;Apfel
book;Buch
friend;Freund | Freundin
```

- Als **UTF-8** speichern, in Excel die Option **CSV UTF-8** wählen.
- Semikolon, Komma und Tabulator werden automatisch erkannt. Eine Kopfzeile wie `Englisch;Deutsch` ist optional.
- Pro Zeile genau zwei Spalten; Texte mit Trennzeichen in Anführungszeichen setzen. Alternative Übersetzungen mit `|` trennen.
- Jede CSV-Datei enthält eine Liste mit bis zu 5.000 Wortpaaren (maximal 2 MB). Die Endung `.CSV` funktioniert ebenfalls.
- Dateien direkt im Ordner ablegen; Unterordner und andere Dateitypen werden ignoriert.

Eine fertige Beispielliste liegt unter [data/decks/Farben.csv](data/decks/Farben.csv).

GitHub Actions baut und veröffentlicht die Website nach jeder Änderung auf `main`. Sobald der Workflow erfolgreich abgeschlossen ist, erscheint die neue oder geänderte Liste nach dem Neuladen auf allen Geräten. Entfernte Dateien verschwinden beim nächsten Deployment. Bei einer ungültigen Datei schlägt der Build mit dem Dateinamen und einer Fehlermeldung fehl; die zuletzt veröffentlichte Website bleibt verfügbar.

Der Import im Browser bleibt für lokale Listen verfügbar. Für gemeinsame Listen genügt die CSV-Datei im Repository; es gibt keinen GitHub-Upload-Dialog im Trainer.

### Vorhandene JSON-Listen

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

Jede JSON-Datei enthält eine Liste. Bestehende JSON-Listen werden zusammen mit den CSV-Dateien eingelesen. Der Build validiert die Inhalte und erstellt automatisch den Katalog. Nach dem Push auf `main` erscheinen die Änderungen nach dem erfolgreichen Deployment und Neuladen auf allen Geräten. Den Dateinamen möglichst beibehalten, damit der Lernfortschritt unveränderter Wortpaare zugeordnet bleibt. Eine gültige Liste muss vorhanden sein.

Gemeinsame Listen und Website sind öffentlich zugänglich. Nur Vokabeln eintragen, keine persönlichen Daten. Mitgelieferte Listen sind allgemeine Beispiele und keinem bestimmten Schulbuch zugeordnet.

## Speicherung und Fortschritt

Eigene Listen, Wortlernstand und die letzten 500 Runden werden im `localStorage` dieses Browsers gespeichert. Es gibt keine Cloud-Synchronisierung, Analyse-Dienste oder externen Schriftarten. Die Anwendung meldet, wenn der Browser keine Daten speichern kann. Browserdaten löschen, privates Surfen und Gerätewechsel können zum Verlust eigener Daten führen; deshalb wichtige Listen exportieren.

Der Filter **Nur schwierige Wörter** enthält Wörter mit mindestens einem Fehler, bis drei richtige Antworten in Folge erreicht sind. Der Lernstand wird je Wortpaar und Lernrichtung geführt. Karteikarten zählen gemäß Selbsteinschätzung. Die Statistik wird beim Abschluss oder bewussten Beenden einer Runde gespeichert; beim Verlassen einer laufenden Runde warnt der Browser vor dem Verlust dieser Runde.

## Aufbau und Prüfungen

- [src/core.js](src/core.js): CSV-/JSON-Import, Antwortvergleich, Wortauswahl und Zeit-/Datumslogik.
- [src/app.js](src/app.js): Oberfläche, Spielabläufe, Speicherung und Statistik.
- [styles.css](styles.css): responsive Gestaltung, Tastaturfokus und reduzierte Bewegung.
- [scripts/build.mjs](scripts/build.mjs): statischer Build und Validierung gemeinsamer Listen.
- [tests/core.test.js](tests/core.test.js): automatisierte Tests mit Nodes eingebautem Test-Runner.
- [scripts/decks.mjs](scripts/decks.mjs): automatische Erkennung und Validierung gemeinsamer CSV-/JSON-Listen.
- [tests/decks.test.js](tests/decks.test.js): Erkennung, Aktualisierung, CSV-Formate und Fehlermeldungen beim Build.

Manuelle Browserprüfung: Listen importieren und exportieren, Lernrichtung wechseln, richtige/falsche Antworten und Überspringen prüfen, alle Spielmodi abschließen, den Timer ablaufen lassen und nach Neuladen die Persistenz prüfen. Auch die Ansicht auf einem schmalen Bildschirm und Bedienung per Tastatur prüfen.
