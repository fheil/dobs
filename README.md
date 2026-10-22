# *dobs* - *do*ne tasks and o*bs*tacles

diary for done tasks and log of obstacles

Node/Express-Backend mit SQLite, React/Vite-Frontend hinter nginx,
Deployment per Docker Compose hinter Traefik. Anforderungen
siehe [SPEC.md](SPEC.md).

## Betrieb

```sh
cp .env.example .env   # Werte anpassen, v. a. DOMAIN und JWT_SECRET
docker compose up -d --build
```

Die Datenbank liegt unter `${BASE_DIR}/${BINDS}/data/dobs.db`. Der erste
registrierte Benutzer wird automatisch Admin; danach lässt sich die
Registrierung unter Einstellungen → Registrierung abschalten.

dobs bringt einen eigenen sqlite-web-Container (`dobs-sqlite-web`) mit, der
nur die dobs-Datenbank sieht. Er startet nur mit `COMPOSE_PROFILES=tools` und
lauscht ausschließlich auf `127.0.0.1:${SQLITE_WEB_PORT}` (ohne Login, also
nur per SSH-Tunnel nutzen).

| Variable | Bedeutung |
| --- | --- |
| `DOMAIN` | Hostname, unter dem Traefik die App ausliefert |
| `JWT_SECRET` | Geheimnis zum Signieren der Login-Tokens |
| `PORT` | Backend-Port (Standard 8050; bei Änderung auch `frontend/nginx.conf` anpassen) |
| `BASE_DIR`, `BINDS` | Bind-Mount für das Datenverzeichnis |
| `ACCENT_COLOR` | Akzentfarbe als `#rrggbb` (Standard `#65a30d`, Lime); alle Abstufungen werden daraus berechnet. Wird zur Laufzeit gelesen – Neustart reicht, kein Rebuild |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Optionaler Proxy für den Image-Build (braucht `registry.npmjs.org`, `github.com`, `release-assets.githubusercontent.com`); leer lassen bei direktem Internetzugang |
| `COMPOSE_PROFILES`, `SQLITE_WEB_PORT` | `tools` startet zusätzlich sqlite-web (ohne Login, nur lokal binden) |

### Ohne Traefik

`docker-compose.standalone.yml` startet dobs ohne Traefik: Das Frontend ist
direkt unter `http://<server>:${PORT}` erreichbar (nur HTTP – für HTTPS einen
eigenen Reverse Proxy davorsetzen). Gleiche Variablen wie oben, `DOMAIN`
entfällt; `PORT` ist hier der Port auf dem Server. In Portainer beim
Repository-Stack einfach diese Datei als „Compose path“ angeben.

## Entwicklung

```sh
cd backend && npm install && DATA_DIR=./data npm run dev    # :8050
cd frontend && npm install && npm run dev                   # :8060, /api -> :8050
```
