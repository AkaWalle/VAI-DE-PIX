/**
 * Testes da camada monetária pt-BR (parse e formatação).
 * Garante que "10,00" → 10, "9.000,00" → 9000, etc.
 */
import { describe, it, expect } from 'vitest';
import {
  parseBrazilianCurrency,
  formatBrazilianCurrency,
  toCents,
  fromCents,
  toApiAmount,
  parseCurrencyInput,
} from '@/utils/currency';

describe('parseBrazilianCurrency', () => {
  it('parseia vírgula decimal e ponto milhar (pt-BR)', () => {
    expect(parseBrazilianCurrency('10,00')).toBe(10);
    expect(parseBrazilianCurrency('9.000,00')).toBe(9000);
    expect(parseBrazilianCurrency('1.234,56')).toBe(1234.56);
    expect(parseBrazilianCurrency('12.345,67')).toBe(12345.67);
  });

  it('parseia sem milhar', () => {
    expect(parseBrazilianCurrency('100,50')).toBe(100.5);
    expect(parseBrazilianCurrency('0,50')).toBe(0.5);
  });

  it('parseia inteiros e formato internacional', () => {
    expect(parseBrazilianCurrency('100')).toBe(100);
    expect(parseBrazilianCurrency('100.50')).toBe(100.5);
  });

  it('remove R$ e ignora espaços', () => {
    expect(parseBrazilianCurrency('R$ 100,50')).toBe(100.5);
    expect(parseBrazilianCurrency(' 1.234,56 ')).toBe(1234.56);
  });

  it('retorna 0 para inválidos', () => {
    expect(parseBrazilianCurrency('')).toBe(0);
    expect(parseBrazilianCurrency('abc')).toBe(0);
    expect(parseBrazilianCurrency('R$')).toBe(0);
  });
});

describe('formatBrazilianCurrency', () => {
  it('formata para exibição pt-BR', () => {
    expect(formatBrazilianCurrency(1234.56)).toMatch(/1\.234,56/);
    expect(formatBrazilianCurrency(10)).toMatch(/10,00/);
  });

  it('pode ocultar símbolo', () => {
    const withSymbol = formatBrazilianCurrency(100, { showSymbol: true });
    const without = formatBrazilianCurrency(100, { showSymbol: false });
    expect(withSymbol).toContain('R$');
    expect(without).not.toContain('R$');
  });
});

describe('toCents / fromCents', () => {
  it('converte reais ↔ centavos', () => {
    expect(toCents(10)).toBe(1000);
    expect(fromCents(1000)).toBe(10);
  });
});

describe('toApiAmount', () => {
  it('arredonda e garante não negativo', () => {
    expect(toApiAmount(10.999)).toBe(11);
    expect(toApiAmount(-1)).toBe(0);
  });
});

describe('parseCurrencyInput (compatibilidade)', () => {
  it('delega para parseBrazilianCurrency', () => {
    expect(parseCurrencyInput('9.000,00')).toBe(9000);
    expect(parseCurrencyInput('10,00')).toBe(10);
  });
});
