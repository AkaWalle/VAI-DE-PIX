import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBankCsv } from "@/lib/bank-csv-parser";

const ITAU_LANCAMENTOS_SAMPLE = `Lançamentos da Conta;
Data;Histórico;Docto.;Crédito;Débito;Saldo
02/01/2026;PAGTO SALARIO;;3458,00;;739,99
02/01/2026;APLICACAO COFRINHOS;;;2000,00;739,99
03/01/2026;SALDO DO DIA;;;;1000,00
03/01/2026;PIX RECEBIDO;;100,00;;1100,00`;

const ITAU_EXTRATO_CC_SAMPLE = `Extrato Conta Corrente
Conta ;112384102
Período ;01/02/2026 a 25/05/2026
Saldo ;153,67

Data Lançamento;Histórico;Descrição;Valor;Saldo
25/05/2026;Pix recebido;Maria Clemilda Ventura Correia;70,00;153,67
19/05/2026;Deb Cartao + Protegido;Cartão + Protegido;-1,90;39,67
19/05/2026;Pix enviado ;Valdeci Pollheim;-29,00;41,57`;

const REAL_EXTRATO_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/Extrato-01-02-2026-a-25-05-2026-CSV.csv",
);

describe("parseBankCsv — Itaú Lançamentos da Conta", () => {
  it("detecta formato Itaú e mapeia crédito/débito", () => {
    const result = parseBankCsv(ITAU_LANCAMENTOS_SAMPLE);

    expect(result.format).toBe("itau");
    expect(result.itauVariant).toBe("lancamentos_conta");
    expect(result.reportType).toBe("extract");
    expect(result.transactions).toHaveLength(3);

    const salary = result.transactions.find((t) =>
      t.description.includes("PAGTO SALARIO"),
    );
    expect(salary).toMatchObject({
      date: "2026-01-02",
      type: "income",
      amount: 3458,
    });

    const cofrinhos = result.transactions.find((t) =>
      t.description.includes("COFRINHOS"),
    );
    expect(cofrinhos).toMatchObject({
      date: "2026-01-02",
      type: "expense",
      amount: -2000,
    });

    expect(
      result.transactions.some((t) =>
        t.description.toUpperCase().includes("SALDO DO DIA"),
      ),
    ).toBe(false);
  });
});

describe("parseBankCsv — Itaú Extrato Conta Corrente", () => {
  it("detecta layout com coluna Valor assinada", () => {
    const result = parseBankCsv(ITAU_EXTRATO_CC_SAMPLE);

    expect(result.format).toBe("itau");
    expect(result.itauVariant).toBe("extrato_conta_corrente");
    expect(result.transactions).toHaveLength(3);

    expect(result.transactions[0]).toMatchObject({
      date: "2026-05-25",
      description: "Pix recebido - Maria Clemilda Ventura Correia",
      type: "income",
      amount: 70,
    });

    expect(result.transactions[1]).toMatchObject({
      date: "2026-05-19",
      type: "expense",
      amount: -1.9,
    });

    expect(result.transactions[2]).toMatchObject({
      date: "2026-05-19",
      type: "expense",
      amount: -29,
    });
  });

  it("parseia o arquivo real Extrato-01-02-2026-a-25-05-2026-CSV.csv", () => {
    const csv = readFileSync(REAL_EXTRATO_FIXTURE, "utf-8");
    const result = parseBankCsv(csv);

    expect(result.format).toBe("itau");
    expect(result.itauVariant).toBe("extrato_conta_corrente");
    expect(result.transactions).toHaveLength(96);

    const incomes = result.transactions.filter((t) => t.type === "income");
    const expenses = result.transactions.filter((t) => t.type === "expense");
    expect(incomes.length).toBeGreaterThan(0);
    expect(expenses.length).toBeGreaterThan(0);
    expect(incomes.every((t) => t.amount > 0)).toBe(true);
    expect(expenses.every((t) => t.amount < 0)).toBe(true);

    const pixRecebido = result.transactions.find((t) =>
      t.description.includes("Maria Clemilda Ventura Correia"),
    );
    expect(pixRecebido).toMatchObject({
      date: "2026-05-25",
      amount: 70,
      type: "income",
    });

    const transferencia = result.transactions.find((t) =>
      t.description.includes("Caixa Economica Federal"),
    );
    expect(transferencia).toMatchObject({
      date: "2026-03-02",
      amount: 1144.78,
      type: "income",
    });

    const faturaInter = result.transactions.find((t) =>
      t.description.includes("Fatura cartão Inter"),
    );
    expect(faturaInter).toMatchObject({
      date: "2026-02-03",
      amount: -419.61,
      type: "expense",
    });

    const devolvido = result.transactions.find(
      (t) =>
        t.date === "2026-02-06" &&
        t.description.includes("Barbara Vicente") &&
        t.amount < 0,
    );
    expect(devolvido?.amount).toBe(-150);
  });
});
