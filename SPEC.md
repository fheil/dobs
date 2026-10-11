# dobs – done tasks and obstacles

Web-App als Tagebuch für erledigte Aufgaben und als Log der Hindernisse, die
dabei aufgetreten sind. Mehrere Benutzer arbeiten in gemeinsamen Projekten.

## Betrieb

- Selbst gehostet per Docker Compose: Backend (Node.js, SQLite) und
  Frontend (React, ausgeliefert über nginx), hinter einem Reverse Proxy.
- Konfiguration über Umgebungsvariablen, soweit möglich.
- Datenverzeichnis als Bind-Mount (`${BASE_DIR}/${BINDS}/data`), keine
  benannten Docker-Volumes.
- Optionaler, eigener sqlite-web-Container nur für die dobs-Datenbank, nur
  lokal erreichbar.
- Eigener Login mit Benutzername und Passwort, kein externer
  Identity-Provider. Die Registrierung lässt sich abschalten.

## Projekte und Rechte

- Jeder Eintrag gehört zu genau einem Projekt.
- Im Header neben dem Benutzernamen wählt man das aktive Projekt. Journal,
  Report und Hindernisse zeigen nur Einträge dieses Projekts; neue Einträge
  bekommen das aktive Projekt.
- Benutzer werden Projekten mit „Lesen“ oder „Lesen+Schreiben“ zugeordnet.
  Wer zugeordnet ist, sieht alle Einträge des Projekts (mit Autor). Ändern
  und löschen darf man nur eigene Einträge, und nur mit „Lesen+Schreiben“.
- Admins verwalten Projekte, Zuordnungen und Admin-Rechte.
  Der erste registrierte Benutzer wird Admin; den eigenen Admin-Status kann
  man nicht ändern. Wer ein Projekt anlegt, wird ihm mit „Lesen+Schreiben“
  zugeordnet.

## Datenmodell: Journal-Eintrag

- Projekt
- Autor
- Titel
- Inhalt
- Hindernisse (Text)
- Checkbox „Erledigt“
- Datum (Pflicht)
- Uhrzeit (optional)

Ein Hindernis gilt als gelöst, sobald „Erledigt“ gesetzt ist (kein eigenes
Feld dafür).

## Bewertungen und Reaktionen

Jeder mit mindestens Leserechten auf das Projekt kann auf einen Eintrag
reagieren (auch auf eigene). Die Leiste steht unter jedem Eintrag in
Journal, Report und Hindernisse:

- **😱 Sehr verwundert über das Hindernis:** an/aus pro Benutzer, mit
  Anzahl; nur bei Einträgen mit Hindernis.
- **1–5 Sterne:** eine Bewertung pro Benutzer, nur die eigene änderbar;
  erneuter Klick auf den gesetzten Stern nimmt sie zurück.
- **Durchschnitt in %** (Ø Sterne / 5) mit Anzahl der Bewertungen. Klick
  öffnet ein kleines Fenster mit der Verteilung wie bei Amazon: je
  Sternzahl Balken, Anteil in % und Anzahl.
- **🙋 Unterstützung anbieten:** an/aus pro Benutzer, bei jedem Eintrag
  (nicht nur bei Hindernissen). Klick auf die Anzahl zeigt die Namen derer,
  die Unterstützung anbieten.

## Tab 1 – Journal

- Eine Seite pro Tag, mit vor/zurück-Buttons und „Heute“-Button.
- Weiße Kacheln, eine Kachel = ein Eintrag, direkt in der Kachel editierbar.
- Unter den Kacheln: `+` (neuen Eintrag anlegen) und `−` (ausgewählten
  eigenen Eintrag löschen, mit Rückfrage).
- Mit „nur Lesen“ sind die Kacheln gesperrt und `+`/`−` ausgeblendet.

## Tab 2 – Report

- Wochenansicht, mit vor/zurück-Buttons und „Heute“-Button.
- Alle Einträge der gewählten Woche, nach Tag gruppiert.
- Es werden nur die Wochentage aus der persönlichen Einstellung
  „Report-Woche“ angezeigt.
- Ein Klick auf einen Tag öffnet ihn im Journal.

## Tab 3 – Hindernisse

- Liste aller Einträge mit ungelöstem Hindernis („Erledigt“ nicht gesetzt
  und Hindernisse-Feld nicht leer), mit Angabe, seit wie vielen Tagen offen.
- Sortierung: am längsten offen → am kürzesten offen, umkehrbar per
  Umschalter.
- Eigene Hindernisse lassen sich direkt in der Liste als erledigt markieren.

## Tab 4 – Einstellungen

Für alle Benutzer:

1. **Passwort ändern.**
2. **Report-Woche:** Slider über Mo–So, welche Wochentage der eigene Report
   anzeigt; Schnellwahl „Mo–Fr“ und „Mo–So“. Standard ist Mo–So. Gilt nur
   für den jeweiligen Benutzer.

Nur für Admins:

3. **Projektzuordnung:** Benutzern Projekte mit „Lesen“ oder
   „Lesen+Schreiben“ zuordnen.
4. **Projekte:** eine Eingabezeile pro Projektname, darunter `+` für weitere
   Zeilen, je Zeile ein Mülleimer. Projekte mit Einträgen können nicht
   gelöscht werden. Namen sind eindeutig (ohne Beachtung von Groß- und
   Kleinschreibung).
5. **Admin-Rechte** erteilen und entziehen.

## Erscheinungsbild

- Eine Akzentfarbe (`ACCENT_COLOR`, Standard Lime `#65a30d`). Alle
  Abstufungen in der Oberfläche und die App-Icons (Browser-Tab, macOS,
  iOS-Homescreen) werden daraus abgeleitet.
- Bedienbar auf Desktop und Smartphone.
