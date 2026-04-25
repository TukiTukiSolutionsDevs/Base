# --- Build stage (Angular → static assets) -------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json tsconfig.app.json angular.json tailwind.config.js postcss.config.js ./
COPY src ./src
RUN npm run build

# --- Runtime stage (nginx serving static + proxy /api → api:3000) --------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
EXPOSE 80
