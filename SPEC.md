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

## Datenmodell: Journal-Eintrag

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

- Vorerst nur: Passwort ändern.

## Status

Noch kein Code vorhanden. Dies ist die Anforderungsgrundlage für die
Implementierung in einer eigenen Claude-Code-Session mit Arbeitsverzeichnis
`~/claude/dobs`.
