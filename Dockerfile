FROM node:20-alpine

WORKDIR /app

# Install build dependencies for sharp/canvas if needed
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "server.js"]
