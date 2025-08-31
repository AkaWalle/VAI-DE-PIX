"""
Backend simples para VAI DE PIX usando apenas FastAPI básico
Execute: python simple_main.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import os
from datetime import datetime
from typing import List, Dict, Any

app = FastAPI(
    title="VAI DE PIX API",
    description="API simples para sistema de controle financeiro",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulação de banco de dados em memória
users_db = {
    "admin@vaidepix.com": {
        "id": "1",
        "name": "Administrador VAI DE PIX",
        "email": "admin@vaidepix.com",
        "password": "123456",
        "created_at": datetime.now().isoformat()
    }
}

transactions_db = []
goals_db = []
envelopes_db = []
categories_db = [
    {"id": "1", "name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
    {"id": "2", "name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
    {"id": "3", "name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
    {"id": "4", "name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
    {"id": "5", "name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
]
accounts_db = [
    {"id": "1", "name": "Conta Corrente", "type": "checking", "balance": 5000.0},
    {"id": "2", "name": "Poupança", "type": "savings", "balance": 15000.0},
]

@app.get("/")
async def root():
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "in-memory"
    }

# Auth endpoints
@app.post("/api/auth/login")
async def login(credentials: dict):
    email = credentials.get("email")
    password = credentials.get("password")
    
    user = users_db.get(email)
    if not user or user["password"] != password:
        return {"error": "Email ou senha incorretos"}, 401
    
    return {
        "access_token": "fake-jwt-token",
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }

@app.post("/api/auth/register")
async def register(user_data: dict):
    email = user_data.get("email")
    
    if email in users_db:
        return {"error": "Email já está em uso"}, 400
    
    user_id = str(len(users_db) + 1)
    users_db[email] = {
        "id": user_id,
        "name": user_data.get("name"),
        "email": email,
        "password": user_data.get("password"),
        "created_at": datetime.now().isoformat()
    }
    
    return {
        "access_token": "fake-jwt-token",
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user_data.get("name"),
            "email": email
        }
    }

# Categories
@app.get("/api/categories")
async def get_categories():
    return categories_db

# Accounts
@app.get("/api/accounts")
async def get_accounts():
    return accounts_db

# Transactions
@app.get("/api/transactions")
async def get_transactions():
    return transactions_db

@app.post("/api/transactions")
async def create_transaction(transaction: dict):
    transaction_id = str(len(transactions_db) + 1)
    new_transaction = {
        "id": transaction_id,
        "created_at": datetime.now().isoformat(),
        **transaction
    }
    transactions_db.append(new_transaction)
    return new_transaction

# Goals
@app.get("/api/goals")
async def get_goals():
    return goals_db

@app.post("/api/goals")
async def create_goal(goal: dict):
    goal_id = str(len(goals_db) + 1)
    new_goal = {
        "id": goal_id,
        "current_amount": 0.0,
        "status": "active",
        "created_at": datetime.now().isoformat(),
        **goal
    }
    goals_db.append(new_goal)
    return new_goal

# Envelopes
@app.get("/api/envelopes")
async def get_envelopes():
    return envelopes_db

@app.post("/api/envelopes")
async def create_envelope(envelope: dict):
    envelope_id = str(len(envelopes_db) + 1)
    new_envelope = {
        "id": envelope_id,
        "created_at": datetime.now().isoformat(),
        **envelope
    }
    envelopes_db.append(new_envelope)
    return new_envelope

# Reports
@app.get("/api/reports/summary")
async def get_summary():
    total_income = sum(t.get("amount", 0) for t in transactions_db if t.get("type") == "income")
    total_expenses = sum(abs(t.get("amount", 0)) for t in transactions_db if t.get("type") == "expense")
    
    return {
        "total_transactions": len(transactions_db),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": total_income - total_expenses
    }

if __name__ == "__main__":
    print("🚀 Iniciando VAI DE PIX API...")
    print("📊 Banco em memória inicializado")
    print("🔑 Login: admin@vaidepix.com / 123456")
    print("📚 Docs: http://localhost:8000/docs")
    
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
