FROM node:latest AS build
ARG NPM_TOKEN
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
RUN npm install
COPY . .
RUN npm run build

FROM node:latest
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./dist/src/db/migrations
EXPOSE 3000
CMD ["node", "dist/src/server.js"]
