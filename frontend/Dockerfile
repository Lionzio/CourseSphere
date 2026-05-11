# frontend/Dockerfile

# ==========================================
# ESTÁGIO 1: Build (Node.js)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Caching de dependências: copia apenas os manifestos primeiro
COPY package.json package-lock.json* ./

# Instalação com resolução do conflito de dependências (React 18 vs 19)
RUN npm install --legacy-peer-deps

# Copiar o restante do código-fonte e compilar a aplicação
COPY . .
RUN npm run build

# ==========================================
# ESTÁGIO 2: Servidor Web (Nginx)
# ==========================================
FROM nginx:alpine

# Remover a configuração padrão do Nginx que vem na imagem
RUN rm /etc/nginx/conf.d/default.conf

# Injetar a nossa configuração preparada para o React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar APENAS os ficheiros estáticos gerados no Estágio 1 (pasta dist)
# O código-fonte e o Node.js ficam para trás, mantendo a imagem minúscula e segura.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor a porta 80
EXPOSE 80

# Comando padrão para manter o Nginx a correr em primeiro plano
CMD ["nginx", "-g", "daemon off;"]