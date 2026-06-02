import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseBankImportCsv,
  parseBankImportBuffer,
  parseBankImportOfx,
  parseBankImportPdfText,
  buildImportPreview,
  detectCsvFormat,
  detectBank,
  detectFileType,
  detectLayout,
} from "@/lib/bank-import";
import { parseBankCsv } from "@/lib/bank-csv-parser";

const FIXTURES = join(process.cwd(), "tests/fixtures");
const SAMPLES = join(process.cwd(), "samples");

const ITAU_LANCAMENTOS_SAMPLE = `Lançamentos da Conta;
Data;Histórico;Docto.;Crédito;Débito;Saldo
02/01/2026;PAGTO SALARIO;;3458,00;;739,99
02/01/2026;APLICACAO COFRINHOS;;;2000,00;739,99
03/01/2026;SALDO DO DIA;;;;1000,00
03/01/2026;PIX RECEBIDO;;100,00;;1100,00`;

const SHARED_EXTRATO_SAMPLE = `Extrato Conta Corrente
Conta ;000000001
Período ;01/02/2026 a 25/05/2026
Saldo ;153,67

Data Lançamento;Histórico;Descrição;Valor;Saldo
25/05/2026;Pix recebido;CLIENTE EXEMPLO 002;70,00;153,67
19/05/2026;Deb Cartao + Protegido;Cartão + Protegido;-1,90;39,67
19/05/2026;Pix enviado ;CLIENTE EXEMPLO 003;-29,00;41,57`;

const ITAU_EXPLICIT_SAMPLE = `Banco Itaú S.A.
Extrato Conta Corrente
Conta ;000000001

Data Lançamento;Histórico;Descrição;Valor;Saldo
25/05/2026;Pix recebido;CLIENTE EXEMPLO 002;70,00;153,67`;

const INTER_EXPLICIT_SAMPLE = `Banco Inter
Extrato Conta Corrente
Conta ;000000001

Data Lançamento;Histórico;Descrição;Valor;Saldo
01/06/2026;Pix recebido;CLIENTE EXEMPLO 001;50,00;59,23`;

const PDF_TEXT_SAMPLE = `extrato conta / lançamentos
data lançamentos valor (R$) saldo (R$)
01/06/2026 SALDO DO DIA 401,32
01/06/2026 PIX QRS KOMPRAO KOC01/06 -31,94
25/05/2026 PIX QRS PADARIA E C23/05 -93,61
25/05/2026 REND PAGO APLIC AUT MAIS 0,01
04/05/2026 REMUNERACAO/SALARIO salario 3.209,00
02/01/2026 PAGTO SALARIO 3.458,00
02/01/2026 APLICACAO COFRINHOS -2.000,00`;

function readBuffer(path: string): ArrayBuffer {
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("detecção de banco — hierarquia CSV", () => {
  it("layout compartilhado sem metadados retorna generic", () => {
    expect(detectBank(SHARED_EXTRATO_SAMPLE, "csv").bank).toBe("generic");
    const result = parseBankImportCsv(SHARED_EXTRATO_SAMPLE);
    expect(result.bank).toBe("generic");
    expect(result.layout).toBe("extrato_conta_corrente");
    expect(buildImportPreview(result).bank).toBe("Genérico");
  });

  it("CSV com Banco Itaú retorna itau", () => {
    expect(detectBank(ITAU_EXPLICIT_SAMPLE, "csv").bank).toBe("itau");
    const result = parseBankImportCsv(ITAU_EXPLICIT_SAMPLE);
    expect(result.bank).toBe("itau");
    expect(buildImportPreview(result).bank).toBe("Itaú");
  });

  it("CSV com Banco Inter retorna inter", () => {
    expect(detectBank(INTER_EXPLICIT_SAMPLE, "csv").bank).toBe("inter");
    const result = parseBankImportCsv(INTER_EXPLICIT_SAMPLE);
    expect(result.bank).toBe("inter");
    expect(buildImportPreview(result).bank).toBe("Inter");
  });

  it("Lançamentos da Conta continua identificando Itaú", () => {
    expect(detectBank(ITAU_LANCAMENTOS_SAMPLE, "csv").bank).toBe("itau");
  });
});

describe("universal — detecção de arquivo", () => {
  it("detecta CSV, PDF e OFX", () => {
    expect(detectFileType("extrato.csv").fileType).toBe("csv");
    expect(detectFileType("extrato.pdf").fileType).toBe("pdf");
    expect(detectFileType("extrato.ofx").fileType).toBe("ofx");
    expect(detectFileType("x.ofx", "<OFX><STMTTRN><TRNAMT>-1").fileType).toBe(
      "ofx",
    );
  });
});

describe("universal — detecção de banco", () => {
  it("detecta Itaú e Inter em OFX", () => {
    expect(detectBank(ITAU_LANCAMENTOS_SAMPLE).bank).toBe("itau");
    const interOfx = readFileSync(join(FIXTURES, "inter-extrato.ofx"), "utf-8");
    expect(detectBank(interOfx, "ofx").bank).toBe("inter");
  });
});

describe("universal — detecção de layout", () => {
  it("detecta layouts Itaú", () => {
    expect(detectLayout(ITAU_LANCAMENTOS_SAMPLE, "itau", "csv").layout).toBe(
      "lancamentos_conta",
    );
    expect(
      detectLayout(SHARED_EXTRATO_SAMPLE, "generic", "csv").layout,
    ).toBe("extrato_conta_corrente");
  });
});

describe("bank-import — detecção CSV", () => {
  it("detecta Itaú Crédito/Débito", () => {
    expect(detectCsvFormat(ITAU_LANCAMENTOS_SAMPLE)).toBe("itau_credit_debit");
  });

  it("detecta Itaú Extrato Conta Corrente", () => {
    expect(detectCsvFormat(SHARED_EXTRATO_SAMPLE)).toBe("itau_extrato");
  });

  it("detecta CSV convertido de PDF", () => {
    const csv = readFileSync(
      join(FIXTURES, "itau_extrato_convertido.csv"),
      "utf-8",
    );
    expect(detectCsvFormat(csv)).toBe("converted_pdf_csv");
  });
});

describe("CSV — Itaú Crédito/Débito", () => {
  it("parseia crédito e débito corretamente", () => {
    const result = parseBankImportCsv(ITAU_LANCAMENTOS_SAMPLE);

    expect(result.fileType).toBe("csv");
    expect(result.bank).toBe("itau");
    expect(result.format).toBe("itau_credit_debit");
    expect(result.transactions).toHaveLength(3);
  });
});

describe("CSV — Itaú Extrato Conta Corrente", () => {
  it("parseia coluna Valor assinada", () => {
    const result = parseBankImportCsv(SHARED_EXTRATO_SAMPLE);

    expect(result.format).toBe("itau_extrato");
    expect(result.layout).toBe("extrato_conta_corrente");
    expect(result.bank).toBe("generic");
    expect(result.transactions).toHaveLength(3);
  });

  it("parseia fixture real Itaú", () => {
    const csv = readFileSync(
      join(FIXTURES, "Extrato-01-02-2026-a-25-05-2026-CSV.csv"),
      "utf-8",
    );
    const result = parseBankImportCsv(csv);
    expect(result.transactions).toHaveLength(96);
    expect(result.bank).toBe("generic");
  });
});

describe("CSV — Inter", () => {
  it("parseia extrato Inter (layout conta corrente) como generic", () => {
    const csv = readFileSync(join(FIXTURES, "inter-extrato.csv"), "utf-8");
    const result = parseBankImportCsv(csv);

    expect(result.fileType).toBe("csv");
    expect(result.bank).toBe("generic");
    expect(result.layout).toBe("extrato_conta_corrente");
    expect(result.transactions.length).toBe(125);

    const incomes = result.transactions.filter((t) => t.type === "income");
    const expenses = result.transactions.filter((t) => t.type === "expense");
    expect(incomes.length).toBe(42);
    expect(expenses.length).toBe(83);
  });
});

describe("CSV — convertido de PDF", () => {
  it("parseia Data,Descricao,Valor", () => {
    const csv = readFileSync(
      join(FIXTURES, "itau_extrato_convertido.csv"),
      "utf-8",
    );
    const result = parseBankImportCsv(csv);

    expect(result.format).toBe("converted_pdf_csv");
    expect(result.bank).toBe("generic");
    expect(result.transactions.length).toBe(124);

    const pix = result.transactions.find((t) =>
      t.description.includes("KOMPRAO"),
    );
    expect(pix).toMatchObject({
      date: "2026-06-01",
      amount: -31.94,
      type: "expense",
    });
  });
});

describe("PDF — Itaú", () => {
  it("parseia texto layout Valor assinado", () => {
    const result = parseBankImportPdfText(PDF_TEXT_SAMPLE);

    expect(result.source).toBe("pdf");
    expect(result.format).toBe("itau_extrato");
    expect(result.transactions.length).toBeGreaterThanOrEqual(5);
  });

  it("parseia PDF real itau_extrato_012026.pdf", async () => {
    const result = await parseBankImportBuffer(
      readBuffer(join(FIXTURES, "itau_extrato_012026.pdf")),
      "itau_extrato_012026.pdf",
    );

    expect(result.bank).toBe("itau");
    expect(result.transactions.length).toBe(124);
  });
});

describe("PDF — Inter", () => {
  it("parseia PDF real Inter", async () => {
    const result = await parseBankImportBuffer(
      readBuffer(join(FIXTURES, "inter-extrato.pdf")),
      "inter-extrato.pdf",
    );

    expect(result.bank).toBe("inter");
    expect(result.format).toBe("inter_extrato");
    expect(result.transactions.length).toBeGreaterThan(50);

    const preview = buildImportPreview(result);
    expect(preview.bank).toBe("Inter");
    expect(preview.totalCount).toBe(result.transactions.length);
  });
});

describe("OFX — universal", () => {
  it("parseia OFX Inter", () => {
    const ofx = readFileSync(join(FIXTURES, "inter-extrato.ofx"), "utf-8");
    const result = parseBankImportOfx(ofx);

    expect(result.fileType).toBe("ofx");
    expect(result.bank).toBe("inter");
    expect(result.format).toBe("ofx_standard");
    expect(result.transactions.length).toBe(125);

    const incomes = result.transactions.filter((t) => t.type === "income");
    const expenses = result.transactions.filter((t) => t.type === "expense");
    expect(incomes.every((t) => t.amount > 0)).toBe(true);
    expect(expenses.every((t) => t.amount < 0)).toBe(true);

    const pix = result.transactions.find((t) =>
      t.description.includes("CLIENTE EXEMPLO 001"),
    );
    expect(pix).toMatchObject({
      date: "2026-06-01",
      amount: 50,
      type: "income",
    });
  });
});

describe("preview universal", () => {
  it("inclui banco, formato e layout", () => {
    const result = parseBankImportCsv(ITAU_LANCAMENTOS_SAMPLE);
    const preview = buildImportPreview(result);

    expect(preview.totalCount).toBe(3);
    expect(preview.bank).toBe("Itaú");
    expect(preview.fileType).toBe("CSV");
    expect(preview.layout).toBe("lancamentos_conta");
  });
});

describe("bank-csv-parser — compatibilidade retroativa", () => {
  it("parseBankCsv delega para bank-import", () => {
    const result = parseBankCsv(ITAU_LANCAMENTOS_SAMPLE);
    expect(result.format).toBe("itau");
    expect(result.itauVariant).toBe("lancamentos_conta");
    expect(result.transactions).toHaveLength(3);
  });
});

describe("samples — inventário", () => {
  it("samples/inventory.json existe e lista amostras", () => {
    const inventory = JSON.parse(
      readFileSync(join(SAMPLES, "inventory.json"), "utf-8"),
    );
    expect(Array.isArray(inventory)).toBe(true);
    expect(inventory.length).toBeGreaterThan(0);
  });
});
