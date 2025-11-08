# 📤 Setup Git e Deploy - VAI DE PIX

## 🔧 Instalação do Git (Necessário)

### **Windows:**
1. **Download:** https://git-scm.com/download/windows
2. **Instalar** com configurações padrão
3. **Reiniciar** PowerShell/CMD
4. **Verificar:** `git --version`

### **Configuração Inicial:**
```bash
# Configurar nome e email
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Verificar configuração
git config --list
```

---

## 📤 **Opção 1: Upload via Git (Após instalar)**

### **1. Inicializar Repositório:**
```bash
# Inicializar Git
git init

# Adicionar remote
git remote add origin https://github.com/AkaWalle/VAI-DE-PIX.git

# Verificar remote
git remote -v
```

### **2. Preparar Arquivos:**
```bash
# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "🎉 Initial commit - VAI DE PIX Sistema Completo

✅ Sistema de controle financeiro completo
✅ Autenticação funcional
✅ CRUD para transações, metas e caixinhas
✅ Relatórios e análises
✅ Configurações avançadas
✅ Automações inteligentes
✅ Design responsivo com tema claro/escuro
✅ Backend API preparado (FastAPI + PostgreSQL)
✅ Deploy configurations (Vercel, Netlify, Railway)
✅ Documentação completa"
```

### **3. Push para GitHub:**
```bash
# Push inicial
git push -u origin main

# Ou se a branch for master
git push -u origin master
```

---

## 📤 **Opção 2: Upload Manual (Sem Git)**

### **1. Preparar Arquivos:**
1. **Compactar projeto** em ZIP
2. **Excluir pastas:**
   - `node_modules/`
   - `dist/`
   - `backend/venv/`
   - `.env` (se existir)

### **2. Upload via GitHub Web:**
1. **Acesse:** https://github.com/AkaWalle/VAI-DE-PIX
2. **Click:** "uploading an existing file"
3. **Arrastar:** arquivo ZIP ou pastas
4. **Commit:** Adicionar mensagem de commit

---

## 📤 **Opção 3: GitHub Desktop (Visual)**

### **1. Instalar GitHub Desktop:**
- **Download:** https://desktop.github.com/
- **Login** com sua conta GitHub

### **2. Clonar Repositório:**
1. **File** → **Clone Repository**
2. **URL:** `https://github.com/AkaWalle/VAI-DE-PIX.git`
3. **Local Path:** Escolher pasta

### **3. Copiar Arquivos:**
1. **Copiar** todos os arquivos do projeto
2. **Colar** na pasta clonada
3. **Commit** via interface visual
4. **Push** para GitHub

---

## 🎯 **Estrutura Recomendada no GitHub:**

```
VAI-DE-PIX/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD automático
├── backend/                    # API FastAPI
│   ├── routers/
│   ├── models.py
│   ├── main.py
│   └── requirements.txt
├── src/                        # Frontend React
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── services/
├── public/                     # Assets estáticos
├── dist/                       # Build de produção (ignorado)
├── node_modules/              # Dependências (ignorado)
├── package.json
├── README.md                  # Documentação principal
├── INSTALL.md                 # Guia de instalação
├── deploy.md                  # Guia de deploy
├── vercel.json               # Config Vercel
├── netlify.toml              # Config Netlify
└── docker-compose.yml        # Config Docker
```

---

## 🔒 **Arquivos a Ignorar (.gitignore):**

```gitignore
# Dependencies
node_modules/
backend/venv/
backend/__pycache__/

# Build outputs
dist/
build/
.vite/

# Environment files
.env
.env.local
.env.production
backend/.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database files
*.db
*.sqlite
*.sqlite3

# Temporary files
*.tmp
*.temp
.cache/
```

---

## 🚀 **Deploy Automático Após Push:**

### **Com GitHub Actions configurado:**
1. **Push para main** → Deploy automático
2. **Vercel** → `https://vai-de-pix.vercel.app`
3. **Netlify** → `https://vai-de-pix.netlify.app`

### **URLs do Projeto:**
- **Repositório:** https://github.com/AkaWalle/VAI-DE-PIX
- **Documentação:** README.md no GitHub
- **Issues:** Para reportar bugs
- **Actions:** CI/CD automático

---

## 🎯 **Próximos Passos:**

1. **Instalar Git** (se necessário)
2. **Escolher método** de upload
3. **Fazer push** do projeto
4. **Configurar deploy** automático
5. **Testar** em produção

**Qual método prefere usar para fazer o upload?**
