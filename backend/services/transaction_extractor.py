"""
Serviço para extração de informações de transação de mensagens de texto
Refatoração da função extract_transaction_info usando Strategy Pattern
"""
from typing import List, Optional, Dict, Any
import re
from datetime import datetime

from models import Account, Category
from core.constants import MAX_TRANSACTION_AMOUNT, TRANSACTION_TYPE_INCOME, TRANSACTION_TYPE_EXPENSE
from core.logging_config import get_logger
from core.amount_parser import parse_brazilian_amount

logger = get_logger(__name__)


class TransactionExtractor:
    """
    Extrai informações de transação de mensagens de texto usando regras e padrões.
    """
    
    # Palavras-chave que indicam intenção de criar transação
    TRANSACTION_KEYWORDS = [
        # Despesas - verbos
        'gastei', 'gastou', 'gastamos', 'gastar', 'gastando',
        'paguei', 'pague', 'pagou', 'pagamos', 'pagar', 'pagando',
        'comprei', 'comprou', 'compramos', 'comprar', 'comprando',
        'saí', 'saiu', 'saímos', 'sair', 'saindo',
        'fui', 'foi', 'fomos', 'ir', 'indo',
        'usei', 'usou', 'usamos', 'usar', 'usando',
        # Despesas - substantivos/contexto
        'despesa', 'despesas', 'gasto', 'gastos', 'pagamento', 'pagamentos',
        'conta', 'contas', 'fatura', 'faturas', 'boleto', 'boletos',
        'débito', 'débitos', 'saída', 'saídas',
        # Receitas - verbos
        'recebi', 'recebeu', 'recebemos', 'receber', 'recebendo',
        'ganhei', 'ganhou', 'ganhamos', 'ganhar', 'ganhando',
        'entrei', 'entrou', 'entramos', 'entrar', 'entrando',
        'adquiri', 'adquiriu', 'adquirir', 'adquirindo',
        # Receitas - substantivos/contexto
        'receita', 'receitas', 'entrada', 'entradas', 'salário', 'salario', 'salários',
        'renda', 'rendas', 'provento', 'proventos', 'pagamento recebido',
        # Ações gerais
        'transação', 'transacao', 'transações', 'transacoes',
        'adiciona', 'adicionar', 'adicionou', 'adicionamos',
        'registra', 'registrar', 'registrou', 'registramos',
        'lança', 'lancar', 'lançar', 'lançou', 'lançamos',
        'insere', 'inserir', 'inseriu', 'inserimos',
        'cria', 'criar', 'criou', 'criamos',
        # Contexto financeiro
        'dinheiro', 'valor', 'reais', 'real',
        'depósito', 'deposito', 'saque', 'transferência', 'transferencia'
    ]
    
    # Palavras-chave de receita
    INCOME_KEYWORDS = [
        'recebi', 'recebeu', 'recebemos', 'receber', 'recebendo',
        'ganhei', 'ganhou', 'ganhamos', 'ganhar', 'ganhando',
        'entrei', 'entrou', 'entramos', 'entrar', 'entrando',
        'salário', 'salario', 'salários', 'salarios',
        'receita', 'receitas', 'entrada', 'entradas',
        'renda', 'rendas', 'provento', 'proventos',
        'depósito', 'deposito', 'depósitos', 'depositos',
        'pagamento recebido', 'dinheiro recebido'
    ]
    
    # Palavras-chave de despesa
    EXPENSE_KEYWORDS = [
        'gastei', 'gastou', 'gastamos', 'gastar', 'gastando',
        'paguei', 'pague', 'pagou', 'pagamos', 'pagar', 'pagando',
        'comprei', 'comprou', 'compramos', 'comprar', 'comprando',
        'saí', 'saiu', 'saímos', 'sair', 'saindo',
        'fui', 'foi', 'fomos', 'ir', 'indo',
        'usei', 'usou', 'usamos', 'usar', 'usando',
        'despesa', 'despesas', 'gasto', 'gastos',
        'conta', 'contas', 'fatura', 'faturas', 'boleto', 'boletos',
        'débito', 'débitos', 'saída', 'saídas',
        'pagamento', 'pagamentos', 'transferência enviada', 'transferencia enviada',
        'saque', 'saques'
    ]
    
    # Padrões regex para extração de valores (ordem importa - mais específicos primeiro)
    AMOUNT_PATTERNS = [
        r'[rR]\$\s*(\d{1,3}(?:\.\d{3})+(?:[.,]\d{1,2})?)',  # R$ 1.000, R$ 1.000,50 (com separador de milhar)
        r'[rR]\$\s*(\d{4,}(?:[.,]\d{1,2})?)',  # R$ 5000, R$ 5000,50 (sem separador, 4+ dígitos)
        r'[rR]\$\s*(\d{1,3}(?:[.,]\d{1,2})?)',  # R$ 50, R$ 50,50 (1-3 dígitos)
        r'(\d{1,3}(?:\.\d{3})+(?:[.,]\d{1,2})?)\s*reais?',  # 1.000 reais (com separador)
        r'(\d{4,}(?:[.,]\d{1,2})?)\s*reais?',  # 5000 reais (sem separador, 4+ dígitos)
        r'(\d{1,3}(?:[.,]\d{1,2})?)\s*reais?',  # 50 reais, 50,50 reais
        r'(\d{1,3}(?:\.\d{3})+(?:[.,]\d{1,2})?)',  # 1.000, 1.000,50 (com separador)
        r'(\d{4,}(?:[.,]\d{1,2})?)',  # 5000, 5000,50 (sem separador, 4+ dígitos)
        r'(\d+[.,]\d{2})',  # 50,50 ou 50.50 (2 decimais)
        r'(\d+[.,]\d+)',  # 50,50 ou 50.50 (qualquer decimal)
        r'(\d{2,3})',  # 50 a 999 (último, menos específico)
    ]
    
    # Mapeamento de palavras-chave para categorias
    CATEGORY_KEYWORDS = {
        'alimentação': ['comida', 'restaurante', 'mercado', 'supermercado', 'lanche', 'almoço', 'jantar'],
        'transporte': ['uber', 'taxi', 'gasolina', 'combustível', 'ônibus', 'metro', 'transporte'],
        'moradia': ['aluguel', 'condomínio', 'luz', 'água', 'internet', 'moradia', 'casa'],
        'saúde': ['médico', 'farmacia', 'remédio', 'hospital', 'saude'],
        'educação': ['curso', 'escola', 'faculdade', 'livro', 'educacao'],
        'lazer': ['cinema', 'show', 'viagem', 'lazer', 'diversão'],
        'compras': ['compra', 'shopping', 'loja'],
        'contas': ['conta', 'boleto', 'fatura'],
        'salário': ['salário', 'salario', 'recebi', 'recebeu', 'ganhei', 'ganhar']
    }
    
    def has_transaction_intent(self, message: str) -> bool:
        """Verifica se a mensagem contém intenção de criar transação."""
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in self.TRANSACTION_KEYWORDS)
    
    def extract_amount(self, message: str) -> Optional[float]:
        """
        Extrai o valor monetário da mensagem usando parsing robusto.
        
        Returns:
            Valor extraído ou None se não encontrar
        """
        message_lower = message.lower()
        
        # Coletar todos os matches possíveis e escolher o maior/mais provável
        candidates = []
        
        # Primeiro, tentar encontrar padrões com regex para localizar o valor
        for pattern in self.AMOUNT_PATTERNS:
            matches = re.finditer(pattern, message_lower)
            for match in matches:
                amount_str = match.group(1)
                # Usar função robusta de parsing brasileiro
                amount = parse_brazilian_amount(amount_str)
                if amount is not None and 0 < amount < MAX_TRANSACTION_AMOUNT:
                    candidates.append((amount, len(amount_str), match.start()))
                    logger.debug(f"Valor candidato encontrado com padrão '{pattern}': {amount} (string: '{amount_str}')")
        
        # Se encontrou candidatos, escolher o maior valor (mais provável ser o valor real)
        if candidates:
            # Ordenar por valor (maior primeiro), depois por posição (primeiro na mensagem)
            candidates.sort(key=lambda x: (-x[0], x[2]))
            best_amount = candidates[0][0]
            logger.debug(f"Valor escolhido: {best_amount} (de {len(candidates)} candidatos)")
            return float(best_amount)
        
        # Se não encontrou com padrões, tentar extrair números da mensagem
        # Buscar sequências de dígitos que possam ser valores
        number_pattern = r'\d{2,}(?:[.,]\d{1,2})?'
        number_matches = re.finditer(number_pattern, message_lower)
        for match in number_matches:
            amount_str = match.group(0)
            amount = parse_brazilian_amount(amount_str)
            if amount is not None and 0 < amount < MAX_TRANSACTION_AMOUNT:
                logger.debug(f"Valor encontrado na mensagem (número solto): {amount} (string: '{amount_str}')")
                return float(amount)
        
        return None
    
    def extract_type(self, message: str) -> str:
        """
        Extrai o tipo de transação (income ou expense).
        
        Returns:
            'income' ou 'expense' (padrão: 'expense')
        """
        message_lower = message.lower()
        
        # Verificar receitas primeiro (mais específico)
        if any(keyword in message_lower for keyword in self.INCOME_KEYWORDS):
            logger.debug("Tipo detectado: RECEITA (income)")
            return TRANSACTION_TYPE_INCOME
        elif any(keyword in message_lower for keyword in self.EXPENSE_KEYWORDS):
            logger.debug("Tipo detectado: DESPESA (expense)")
            return TRANSACTION_TYPE_EXPENSE
        else:
            # Padrão: despesa (mais comum)
            logger.debug("Tipo não detectado explicitamente, usando padrão: DESPESA")
            return TRANSACTION_TYPE_EXPENSE
    
    def find_category(
        self, 
        message: str, 
        transaction_type: str, 
        categories: List[Category]
    ) -> Optional[str]:
        """
        Encontra a categoria mais adequada baseada na mensagem.
        
        Returns:
            ID da categoria ou None se não encontrar
        """
        message_lower = message.lower()
        category_id = None
        
        for cat in categories:
            if cat.type != transaction_type:
                continue
            
            cat_name_lower = cat.name.lower()
            logger.debug(f"Verificando categoria: {cat.name} (tipo: {cat.type})")
            
            # Verificar se o nome da categoria está na mensagem
            if cat_name_lower in message_lower:
                category_id = cat.id
                logger.debug(f"Categoria encontrada por nome: {cat.name}")
                break
            
            # Verificar palavras-chave
            if cat_name_lower in self.CATEGORY_KEYWORDS:
                for keyword in self.CATEGORY_KEYWORDS[cat_name_lower]:
                    if keyword in message_lower:
                        category_id = cat.id
                        logger.debug(f"Categoria encontrada por palavra-chave '{keyword}': {cat.name}")
                        break
                if category_id:
                    break
        
        # Se não encontrou, usar primeira disponível do tipo
        if not category_id:
            for cat in categories:
                if cat.type == transaction_type:
                    category_id = cat.id
                    break
        
        return category_id
    
    def find_account(
        self, 
        transaction_type: str, 
        accounts: List[Account]
    ) -> Optional[str]:
        """
        Encontra a conta mais adequada baseada no tipo de transação.
        
        Returns:
            ID da conta ou None se não encontrar
        """
        if not accounts:
            return None
        
        account_id = None
        
        # Preferir conta corrente ou dinheiro (não crédito para evitar confusão)
        preferred_types = ['checking', 'cash']
        
        if transaction_type == TRANSACTION_TYPE_INCOME:
            # Para receitas, preferir checking ou cash
            for acc in accounts:
                if acc.type in preferred_types:
                    account_id = acc.id
                    break
            if not account_id:
                account_id = accounts[0].id
        else:
            # Para despesas, evitar crédito se possível
            for acc in accounts:
                if acc.type in preferred_types:
                    account_id = acc.id
                    break
            if not account_id:
                account_id = accounts[0].id
        
        return account_id
    
    def extract(
        self, 
        message: str, 
        accounts: List[Account], 
        categories: List[Category]
    ) -> Optional[Dict[str, Any]]:
        """
        Extrai todas as informações de transação da mensagem.
        
        Returns:
            Dicionário com informações da transação ou None se não detectar intenção
        """
        # Verificar intenção
        if not self.has_transaction_intent(message):
            logger.debug("Nenhuma palavra-chave de transação encontrada")
            return None
        
        # Extrair valor
        amount = self.extract_amount(message)
        if amount is None:
            logger.debug("Nenhum valor encontrado na mensagem")
            return None
        
        # Extrair tipo
        transaction_type = self.extract_type(message)
        
        # Encontrar categoria
        category_id = self.find_category(message, transaction_type, categories)
        
        # Encontrar conta
        account_id = self.find_account(transaction_type, accounts)
        
        logger.debug(f"Account ID: {account_id}, Category ID: {category_id}")
        
        if not account_id or not category_id:
            logger.debug("Falta account_id ou category_id - retornando None")
            return None
        
        return {
            'amount': amount,
            'type': transaction_type,
            'description': message,
            'category_id': category_id,
            'account_id': account_id,
            'date': datetime.now()
        }

