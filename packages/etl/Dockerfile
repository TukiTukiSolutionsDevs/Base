FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Por defecto: ETL one-shot. Termina cuando carga todo.
CMD ["npm", "run", "load"]
