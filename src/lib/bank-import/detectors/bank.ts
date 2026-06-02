import type { BankDetection, BankId, FileType } from "../types";
import { normalizeText } from "../utils";

interface BankSignature {
  bank: BankId;
  keywords: string[];
  weight: number;
}

/** Nível 1 — metadados explícitos no cabeçalho do arquivo */
const LEVEL1_METADATA: [BankId, string[]][] = [
  ["inter", ["banco inter", "instituicao: banco inter", "banco intermedium", "intermedium s/a"]],
  ["itau", ["banco itau", "itau unibanco", "www.itau.com.br", "itau.com.br"]],
  ["nubank", ["nubank", "nu pagamentos"]],
  ["bradesco", ["banco bradesco"]],
  ["santander", ["banco santander"]],
  ["caixa", ["caixa economica federal", "caixa economica"]],
  ["bb", ["banco do brasil"]],
  ["sicredi", ["sicredi"]],
  ["sicoob", ["sicoob"]],
  ["btg", ["btg pactual"]],
  ["c6", ["c6 bank"]],
  ["original", ["banco original"]],
  ["xp", ["xp investimentos"]],
];

/** Marcador exclusivo Itaú — não é layout compartilhado */
const ITAU_EXCLUSIVE_MARKERS = ["lancamentos da conta"];

const BANK_SIGNATURES: BankSignature[] = [
  {
    bank: "itau",
    keywords: ["itau unibanco", "banco itau", "www.itau.com.br", "conta universitaria itau"],
    weight: 3,
  },
  {
    bank: "inter",
    keywords: ["banco inter", "banco intermedium", "intermedium s/a", "instituicao: banco inter"],
    weight: 3,
  },
  {
    bank: "nubank",
    keywords: ["nubank", "nu pagamentos", "nu financeira"],
    weight: 3,
  },
  {
    bank: "bradesco",
    keywords: ["bradesco", "banco bradesco"],
    weight: 3,
  },
  {
    bank: "santander",
    keywords: ["santander", "banco santander"],
    weight: 3,
  },
  {
    bank: "caixa",
    keywords: ["caixa economica federal", "caixa economica"],
    weight: 3,
  },
  {
    bank: "bb",
    keywords: ["banco do brasil", "bb.com.br"],
    weight: 3,
  },
  {
    bank: "sicredi",
    keywords: ["sicredi"],
    weight: 2,
  },
  {
    bank: "sicoob",
    keywords: ["sicoob"],
    weight: 2,
  },
  {
    bank: "btg",
    keywords: ["btg pactual"],
    weight: 2,
  },
  {
    bank: "c6",
    keywords: ["c6 bank"],
    weight: 2,
  },
  {
    bank: "original",
    keywords: ["banco original"],
    weight: 2,
  },
  {
    bank: "xp",
    keywords: ["xp investimentos"],
    weight: 2,
  },
];

const FID_MAP: Record<string, BankId> = {
  "001": "bb",
  "033": "santander",
  "077": "inter",
  "104": "caixa",
  "237": "bradesco",
  "260": "nubank",
  "341": "itau",
};

function scoreBank(norm: string): Map<BankId, number> {
  const scores = new Map<BankId, number>();

  for (const sig of BANK_SIGNATURES) {
    let score = 0;
    for (const kw of sig.keywords) {
      if (norm.includes(normalizeText(kw))) {
        score += sig.weight;
      }
    }
    if (score > 0) scores.set(sig.bank, (scores.get(sig.bank) ?? 0) + score);
  }

  const fidMatch = norm.match(/<fid>(\d{3})<\/fid>/i);
  if (fidMatch?.[1] && FID_MAP[fidMatch[1]] && norm.includes("<ofx>")) {
    const bank = FID_MAP[fidMatch[1]];
    scores.set(bank, (scores.get(bank) ?? 0) + 10);
  }

  const orgMatch = norm.match(/<org>([^<]+)<\/org>/i);
  if (orgMatch?.[1]) {
    const orgNorm = normalizeText(orgMatch[1]);
    if (orgNorm.includes("inter")) {
      scores.set("inter", (scores.get("inter") ?? 0) + 10);
    }
    if (orgNorm.includes("itau")) {
      scores.set("itau", (scores.get("itau") ?? 0) + 10);
    }
  }

  return scores;
}

function detectLevel1Metadata(norm: string): BankId | null {
  for (const [bank, patterns] of LEVEL1_METADATA) {
    if (patterns.some((p) => norm.includes(normalizeText(p)))) {
      return bank;
    }
  }
  for (const marker of ITAU_EXCLUSIVE_MARKERS) {
    if (norm.includes(normalizeText(marker))) {
      return "itau";
    }
  }
  return null;
}

function detectBankCsv(content: string): BankDetection {
  const headerBlock = content.split(/\r?\n/).slice(0, 20).join("\n");
  const norm = normalizeText(headerBlock);

  const level1 = detectLevel1Metadata(norm);
  if (level1) {
    return { bank: level1, confidence: "high" };
  }

  const scores = scoreBank(norm);
  if (scores.size > 0) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [bank, topScore] = sorted[0];
    const secondScore = sorted[1]?.[1] ?? 0;

    if (topScore >= 5 && topScore > secondScore) {
      return {
        bank,
        confidence: topScore >= 10 ? "high" : "medium",
      };
    }
  }

  return { bank: "generic", confidence: "low" };
}

function detectBankPdfOrOfx(
  content: string,
  fileType: "pdf" | "ofx",
): BankDetection {
  const sliceLen = fileType === "pdf" ? 15000 : 8000;
  const norm = normalizeText(content.slice(0, sliceLen));
  const scores = scoreBank(norm);

  const institutionBoosts: [BankId, string[]][] = [
    ["inter", ["instituicao: banco inter", "banco inter,"]],
    ["itau", ["itau unibanco", "banco itau", "www.itau.com.br"]],
    ["nubank", ["nubank", "nu pagamentos"]],
    ["bradesco", ["banco bradesco"]],
    ["santander", ["banco santander"]],
    ["caixa", ["caixa economica federal", "caixa economica"]],
    ["bb", ["banco do brasil"]],
  ];

  for (const [bank, keywords] of institutionBoosts) {
    if (keywords.some((kw) => norm.includes(normalizeText(kw)))) {
      scores.set(bank, (scores.get(bank) ?? 0) + 15);
    }
  }

  if (fileType !== "ofx") {
    scores.forEach((_, bank) => {
      if (bank === "caixa" && !norm.includes("caixa economica")) {
        scores.delete(bank);
      }
    });
  }

  if (scores.size === 0) {
    return { bank: "unknown", confidence: "low" };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [bank, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;

  const confidence =
    topScore >= 10 && topScore > secondScore * 2
      ? "high"
      : topScore >= 5
        ? "medium"
        : "low";

  return { bank, confidence };
}

export function detectBank(
  content: string,
  fileType?: FileType,
): BankDetection {
  if (fileType === "csv") {
    return detectBankCsv(content);
  }

  if (fileType === "pdf" || fileType === "ofx") {
    return detectBankPdfOrOfx(content, fileType);
  }

  const norm = normalizeText(content.slice(0, 8000));
  const level1 = detectLevel1Metadata(norm);
  if (level1) return { bank: level1, confidence: "high" };

  const scores = scoreBank(norm);
  if (scores.size === 0) return { bank: "unknown", confidence: "low" };

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return { bank: sorted[0][0], confidence: "medium" };
}

export function resolveBankLabel(bank: BankId): string {
  if (bank === "generic") return "Genérico";
  if (bank === "unknown") return "Não identificado";
  return bank;
}
