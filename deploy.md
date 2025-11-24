# 🚀 Guia de Deploy - VAI DE PIX

## 🌟 Opções de Deploy

### 🥇 **Vercel (Recomendado)**

#### **Deploy Automático via GitHub:**
1. **Conectar Repositório:**
   - Acesse [vercel.com](https://vercel.com)
   - Conecte sua conta GitHub
   - Importe o repositório VAI DE PIX

2. **Configurações Automáticas:**
   - Framework: **Vite** (detectado automaticamente)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Variáveis de Ambiente:**
   ```env
   VITE_API_URL=https://sua-api.railway.app/api
   VITE_APP_NAME=VAI DE PIX
   VITE_APP_VERSION=1.0.0
   ```

4. **Deploy:**
   - Clique em **"Deploy"**
   - URL gerada automaticamente: `https://vai-de-pix.vercel.app`

#### **Deploy via CLI:**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy para produção
vercel --prod
```

---

### 🥈 **Netlify**

#### **Deploy via Drag & Drop:**
1. **Build Local:**
   ```bash
   npm run build
   ```

2. **Upload:**
   - Acesse [netlify.com](https://netlify.com)
   - Arraste pasta `dist` para área de deploy
   - URL gerada: `https://random-name.netlify.app`

#### **Deploy via Git:**
1. **Conectar Repositório:**
   - GitHub/GitLab integration
   - Auto-deploy em push

2. **Configurações:**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables:**
   ```env
   VITE_API_URL=https://sua-api.herokuapp.com/api
   VITE_APP_NAME=VAI DE PIX
   ```

---

### 🥉 **Railway (Full-Stack)**

#### **Frontend + Backend:**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy frontend
railway init
railway up

# Deploy backend (separado)
cd backend
railway init
railway up
```

---

### 🏗️ **GitHub Pages (Estático)**

#### **Setup:**
1. **Configurar GitHub Actions:**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

2. **Configurar Pages:**
   - Settings → Pages → Source: GitHub Actions

---

## 🌐 **Deploy Manual (Servidor Próprio)**

### **VPS/Servidor Linux:**

#### **1. Preparar Servidor:**
```bash
# Conectar via SSH
ssh user@seu-servidor.com

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Nginx
sudo apt install nginx

# Instalar PM2 (Process Manager)
npm install -g pm2
```

#### **2. Upload e Build:**
```bash
# Clonar repositório
git clone https://github.com/seu-usuario/vai-de-pix.git
cd vai-de-pix

# Instalar dependências
npm install

# Build para produção
npm run build

# Configurar Nginx
sudo nano /etc/nginx/sites-available/vai-de-pix
```

#### **3. Configuração Nginx:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /var/www/vai-de-pix/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

#### **4. Ativar Site:**
```bash
# Ativar configuração
sudo ln -s /etc/nginx/sites-available/vai-de-pix /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar SSL (opcional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 🐳 **Docker Deploy**

### **Dockerfile para Produção:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### **nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### **Deploy com Docker:**
```bash
# Build image
docker build -t vai-de-pix .

# Run container
docker run -d -p 80:80 --name vai-de-pix-app vai-de-pix

# Ou com docker-compose
docker-compose up -d
```

---

## ⚡ **Deploy Rápido (Recomendado)**

### **1. Vercel (1 minuto):**
```bash
npm install -g vercel
vercel
```

### **2. Netlify (2 minutos):**
```bash
npm run build
# Arrastar pasta 'dist' para netlify.com
```

### **3. Railway (3 minutos):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 📊 **URLs de Exemplo:**

- **Vercel:** `https://vai-de-pix.vercel.app`
- **Netlify:** `https://vai-de-pix.netlify.app`
- **Railway:** `https://vai-de-pix.up.railway.app`
- **GitHub Pages:** `https://seu-usuario.github.io/vai-de-pix`

---

## 🔧 **Configurações de Produção**

### **Environment Variables:**
```env
# API (se usando backend)
VITE_API_URL=https://sua-api-backend.com/api

# App
VITE_APP_NAME=VAI DE PIX
VITE_APP_VERSION=1.0.0

# Analytics (opcional)
VITE_GA_ID=G-XXXXXXXXXX
```

### **Build Otimizado:**
```bash
# Build com otimizações
npm run build

# Preview local da build
npm run preview

# Analisar bundle size
npx vite-bundle-analyzer dist
```

---

## 🎯 **Qual opção prefere?**

1. **🚀 Vercel** - Mais rápido e fácil
2. **🌐 Netlify** - Drag & drop simples  
3. **🚄 Railway** - Full-stack em uma plataforma
4. **🏗️ VPS próprio** - Controle total
5. **🐳 Docker** - Containerizado

**Recomendo começar com Vercel para deploy rápido!**
