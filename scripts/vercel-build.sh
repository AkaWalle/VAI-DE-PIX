#!/bin/bash
# Script de build para Vercel
# Garante que package.json está acessível

echo "🔍 Verificando estrutura do projeto..."
echo "📁 Diretório atual: $(pwd)"
echo "📄 package.json existe: $(test -f package.json && echo 'SIM' || echo 'NÃO')"

if [ ! -f "package.json" ]; then
  echo "❌ ERRO: package.json não encontrado!"
  echo "📂 Conteúdo do diretório:"
  ls -la
  exit 1
fi

echo "✅ package.json encontrado!"
echo "🚀 Executando npm install..."
npm install

echo "🏗️ Executando build..."
npm run build

echo "✅ Build concluído!"

