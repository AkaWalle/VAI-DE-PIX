import { describe, it, expect } from "vitest";
import { parseBankCsv } from "@/lib/bank-csv-parser";

const ITAU_SAMPLE = `Lançamentos da Conta;
Data;Histórico;Docto.;Crédito;Débito;Saldo
02/01/2026;PAGTO SALARIO;;3458,00;;739,99
02/01/2026;APLICACAO COFRINHOS;;;2000,00;739,99
03/01/2026;SALDO DO DIA;;;;1000,00
03/01/2026;PIX RECEBIDO;;100,00;;1100,00`;

describe("parseBankCsv — Itaú", () => {
  it("detecta formato Itaú e mapeia crédito/débito", () => {
    const result = parseBankCsv(ITAU_SAMPLE);

    expect(result.format).toBe("itau");
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
