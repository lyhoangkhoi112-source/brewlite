FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
RUN npx prisma generate

COPY src ./src
RUN npm run build

ENV NODE_ENV=development
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "npm run db:setup && npm run start:prod"]
