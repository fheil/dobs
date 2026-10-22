# dobs – done tasks and obstacles

Web-App als Tagebuch für erledigte Aufgaben und als Log der Hindernisse, die
dabei aufgetreten sind. Mehrere Benutzer arbeiten in gemeinsamen Projekten.

## Betrieb

- Selbst gehostet per Docker Compose: Backend (Node.js, SQLite) und
  Frontend (React, ausgeliefert über nginx), hinter Traefik. Alternativ
  ohne Traefik, mit dem Frontend direkt auf einem Host-Port (nur HTTP).
- Konfiguration über Umgebungsvariablen, soweit möglich.
- Datenverzeichnis als Bind-Mount (`${BASE_DIR}/${BINDS}/data`), keine
  benannten Docker-Volumes.
- Optionaler, eigener sqlite-web-Container nur für die dobs-Datenbank, nur
  lokal erreichbar.
- Eigener Login mit Benutzername und Passwort, kein externer
  Identity-Provider. Admins können die Registrierung in den Einstellungen
  abschalten.

## Sicherheit

- Das Backend startet nur mit einem sicheren `JWT_SECRET` (mind. 32
  Zeichen, kein bekannter Platzhalter).
- Erster Admin: mit `ADMIN_USERNAME` nur dieser Benutzername, sonst der
  erste registrierte Benutzer.
- Login und Passwortänderung: nach 10 Fehlversuchen pro IP 15 Minuten
  Sperre.
- Eine Passwortänderung meldet alle anderen Sitzungen ab (Token-Version).
- Längengrenzen: Benutzername 3–50, Passwort 8–72 Byte, Projektname 100,
  Titel 200, Inhalt 20 000, Hindernisse 10 000 Zeichen; Anfragen max. 100 KB.
- Sicherheits-Header (CSP, X-Frame-Options, nosniff, Referrer-Policy); nginx
  verrät seine Version nicht.
- Normale Benutzer erfahren nichts über Admin-Funktionen; Admin-Aufrufe
  durch Nicht-Admins liefern 404.

## Benutzer und Anzeigenamen

- Der Anmeldename dient nur zum Einloggen und ist unveränderlich.
- Zusätzlich gibt es einen optionalen Anzeigenamen (2–50 Zeichen). Andere
  Benutzer sehen überall nur diesen (Header, Autor, Reaktionen, „Gelöscht
  von …“); ohne Anzeigenamen wird der Anmeldename angezeigt.
- Sichtbare Namen sind eindeutig (ohne Groß-/Kleinschreibung): Ein
  Anzeigename darf weder einem anderen Anzeigenamen noch einem fremden
  Anmeldenamen entsprechen.
- Jeder pflegt seinen Anzeigenamen unter Einstellungen → Profil; Admins
  können ihn unter Einstellungen → Benutzer für alle setzen und sehen dort
  beide Namen.

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
  ein Klick auf das linke Drittel des ersten Sterns (Vorschau: alle Sterne
  leer) oder erneut auf den gesetzten Stern nimmt sie zurück.
- **Durchschnitt in %** (Ø Sterne / 5) mit Anzahl der Bewertungen. Klick
  öffnet ein kleines Fenster mit der Verteilung wie bei Amazon: je
  Sternzahl Balken, Anteil in % und Anzahl.
- **🙋 Unterstützung anbieten:** an/aus pro Benutzer, bei jedem Eintrag
  (nicht nur bei Hindernissen). Klick auf die Anzahl zeigt die Namen derer,
  die Unterstützung anbieten.

## Löschen, Archiv und Sperren

- Löschen archiviert nur: Der Eintrag ist für alle ausgeblendet (inkl.
  Bewertungen/Reaktionen) und kann von Admins wiederhergestellt oder
  endgültig gelöscht werden.
- Autoren löschen eigene Einträge (mit „Lesen+Schreiben“), sofern die
  Admin-Schalter es erlauben. Admins dürfen immer löschen, auch fremde
  Einträge in Projekten, denen sie zugeordnet sind.
- Für die Sperren zählen nur Reaktionen *anderer* Benutzer; eigene
  Reaktionen sperren den Autor nicht aus.
- Projekte mit Einträgen – auch gelöschten – können nicht gelöscht werden,
  bis ein Admin diese endgültig entfernt.

## Tab 1 – Journal

- Eine Seite pro Tag, mit vor/zurück-Buttons und „Heute“-Button. In die
  Zukunft geht es nicht: Bei „heute“ ist „weiter“ gesperrt, das Datumsfeld
  einer Kachel erlaubt höchstens heute, und der Server lehnt künftige Daten
  ab.
- Weiße Kacheln, eine Kachel = ein Eintrag, direkt in der Kachel editierbar.
- Unter den Kacheln: `+` (neuen Eintrag anlegen).
- Mülleimer ganz rechts in der Reaktionszeile jeder Kachel (eigene Einträge,
  für Admins alle): löscht mit Rückfrage. Ist Löschen gesperrt, ist er
  ausgegraut und nennt per Tooltip den Grund.
- Mit „nur Lesen“ sind die Kacheln gesperrt und `+` ist ausgeblendet.

## Tab 2 – Report

- Wochenansicht, mit vor/zurück-Buttons und „Heute“-Button; über die
  aktuelle Woche hinaus lässt sich nicht blättern.
- Alle Einträge der gewählten Woche, nach Tag gruppiert. Standard: neuester
  Tag oben (innerhalb eines Tages der späteste Eintrag oben); ein
  Umschalter neben der Überschrift dreht die Reihenfolge um.
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

1. **Profil:** Anzeigename und Passwort ändern.
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
5. **Benutzer:** Anmeldename, editierbarer Anzeigename und Admin-Rechte
   (erteilen/entziehen) aller Benutzer.
6. **Registrierung:** Schalter, ob sich neue Benutzer selbst registrieren
   können (Standard an). Aus: Der Link „Registrieren“ auf der Login-Seite
   verschwindet.
7. **Löschen & Sperren** (gilt für alle Projekte):
   - *Einträge löschen erlaubt* (Hauptschalter, Standard an)
   - *Erledigte Einträge löschbar* (Standard aus: erst „Erledigt“
     herausnehmen)
   - *Einträge mit Reaktionen anderer löschbar* (Standard aus: gesperrt,
     bis alle anderen ihre Reaktionen zurückgezogen haben)
   - *Einträge mit Reaktionen anderer schreibgeschützt* (Standard an: nur
     „Erledigt“ bleibt änderbar)
   - *Admins sehen gelöschte Einträge* in Journal, Report und Hindernisse,
     mit „Wiederherstellen“ und „Endgültig löschen“ (Standard an)

## Erscheinungsbild

- Eine Akzentfarbe (`ACCENT_COLOR`, Standard Lime `#65a30d`). Alle
  Abstufungen in der Oberfläche und die App-Icons (Browser-Tab, macOS,
  iOS-Homescreen) werden daraus abgeleitet.
- Bedienbar auf Desktop und Smartphone.
