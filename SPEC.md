# dobs – done tasks and obstacles

Web-App, analog zu `paindiary` aufgebaut (Node-Backend + Vite-Frontend,
Docker-Compose, eigenes einfaches Login wie bei paindiary, kein Keycloak).

## Infrastruktur

- Struktur und Deployment-Muster wie `paindiary` (siehe `../paindiary`).
- Konfiguration über Umgebungsvariablen, soweit möglich.
- Datenverzeichnis als lokaler Bind-Mount (keine benannten Docker-Volumes),
  über `BASE_DIR` und `BINDS` (gleiche Variablennamen wie bei paindiary:
  `${BASE_DIR}/${BINDS}/data:/app/data`).
- Lokal abgelegt parallel zu paindiary: `~/claude/dobs`.
- Eigener, einfacher User/Passwort-Login im Backend (wie paindiary),
  kein Keycloak.

## Projekte und Rechte

- Einträge gehören immer zu genau einem Projekt.
- Im Header neben dem Benutzernamen wählt man das aktive Projekt; Journal,
  Report und Hindernisse zeigen nur Einträge dieses Projekts. Neue Einträge
  bekommen das aktive Projekt.
- Benutzer werden Projekten mit „Lesen“ oder „Lesen+Schreiben“ zugeordnet.
  Wer zugeordnet ist, sieht alle Einträge des Projekts (mit Autor). Ändern und
  löschen darf man nur eigene Einträge, und nur mit „Lesen+Schreiben“.
- Admins verwalten Projekte, Zuordnungen und Admin-Rechte. Der erste
  registrierte Benutzer wird Admin; den eigenen Admin-Status kann man nicht
  ändern. Wer ein Projekt anlegt, wird ihm mit „Lesen+Schreiben“ zugeordnet.

## Datenmodell: Journal-Eintrag

- Projekt
- Titel
- Inhalt
- Hindernisse (Text)
- Checkbox "Erledigt"
- Datum (Pflicht)
- Uhrzeit (optional)

Ein Hindernis gilt als "gelöst", sobald die Checkbox "Erledigt" gesetzt ist
(kein eigenes Feld dafür).

## Tab 1 – Journal

- Eine Seite pro Tag.
- Tages-Navigation: vor/zurück-Buttons + "Heute"-Button (wie Report-Tab).
- Weiße Kacheln als Hintergrund-Look (wie paindiary), eine Kachel = ein
  Eintrag.
- Unter den Kacheln: `+`-Button (neuen Eintrag anlegen) und `-`-Button
  (Eintrag löschen).

## Tab 2 – Report

- Wochenansicht.
- Oben: Buttons zum Blättern durch Wochen + "Heute"-Button (wie paindiary).
- Inhalt: alle Einträge der gewählten Woche, nach Tag gruppiert.

## Tab 3 – Hindernisse

- Liste aller Einträge mit ungelöstem Hindernis (Erledigt = false und
  Hindernisse-Feld nicht leer).
- Sortierung: "am längsten offen" → "am kürzesten offen".
- Umschalter oben, um die Sortierrichtung umzudrehen.

## Tab 4 – Einstellungen

Unterseiten (alle außer der ersten nur für Admins):

1. Passwort ändern.
2. Projektzuordnung: Benutzern Projekte mit „Lesen“ oder „Lesen+Schreiben“
   zuordnen.
3. Admin-Rechte erteilen/entziehen.
4. Projekte: eine Eingabezeile pro Projektname, darunter `+` für weitere
   Zeilen, je Zeile ein Mülleimer zum Löschen. Projekte mit Einträgen können
   nicht gelöscht werden.

## Farben

- Eine Akzentfarbe (`ACCENT_COLOR`, Standard Lime `#65a30d`), alle
  Abstufungen werden daraus abgeleitet.

## Status

Erste Implementierung vorhanden (Backend `backend/`, Frontend `frontend/`,
`docker-compose.yml`). Details zu Betrieb und Konfiguration im README.
