# No apt-get: better-sqlite3 and resvg ship prebuilt binaries for
# linux-x64/Node 22, and the healthcheck uses node instead of curl. So the
# build only needs Docker Hub and the npm registry (works behind firewalls
# that block the Debian package mirrors).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p /app/data && chown -R app:app /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER app
EXPOSE 8050
VOLUME ["/app/data"]
CMD ["node", "server.js"]
