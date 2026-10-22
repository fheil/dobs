# No apt-get and no native module downloads: SQLite is Node's built-in
# node:sqlite, resvg ships its binary inside an npm package, and the
# healthcheck uses node instead of curl. So the build only needs Docker Hub
# and the npm registry (works behind restrictive firewalls/proxies).
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
# node:sqlite is still flagged experimental in Node 22 - silence the notice.
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
