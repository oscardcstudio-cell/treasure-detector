# Build Docker pour Railway — remplace Nixpacks dont le mount de cache npm
# provoque des EBUSY aléatoires sur node_modules/.cache (3 builds FAILED le 2026-08-08).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY . .
# Vite fige les VITE_* DANS le bundle au moment du build : sans ces ARG, les
# variables de service Railway n'atteignent pas `npm run build` et l'app
# déployée croit Supabase absent (sauvegarde en ligne muette).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit
COPY --from=build /app/dist ./dist
# Données dérivées versionnées (cibles, foncier, voies) servies par server.js
COPY data/derived/*.geojson ./dist/data/derived/
# Couches relief LiDAR : trop lourdes pour git et pour l'upload Railway (413).
# Les assets GitHub Releases refusent le CORS navigateur mais se téléchargent
# très bien au build : servis ensuite same-origin (Range via express.static).
ADD https://github.com/oscardcstudio-cell/treasure-detector/releases/download/lidar-v1/hillshade.pmtiles ./dist/data/derived/hillshade.pmtiles
ADD https://github.com/oscardcstudio-cell/treasure-detector/releases/download/lidar-v1/svf.pmtiles ./dist/data/derived/svf.pmtiles
ADD https://github.com/oscardcstudio-cell/treasure-detector/releases/download/lidar-v1/lrm.pmtiles ./dist/data/derived/lrm.pmtiles
ADD https://github.com/oscardcstudio-cell/treasure-detector/releases/download/lidar-v1/openness.pmtiles ./dist/data/derived/openness.pmtiles
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
