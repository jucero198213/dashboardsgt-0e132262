/// <reference lib="webworker" />

type RowData = Record<string, string | number | null | undefined>;
type FinanceStatus = "Em Aberto" | "Vencido" | "Parcial";

interface IndicadorComparativo {
  id: string;
  nome: string;
  percentualReal: number;
  percentualEsperado: number;
}

interface ContaReceber {
  id: string;
  documento: string;
  cliente: string;
  vencimento: string;
  valor: number;
  status: FinanceStatus;
}

interface ContaPagar {
  id: string;
  documento: string;
  fornecedor: string;
  vencimento: string;
  valor: number;
  status: FinanceStatus;
}

interface ResumoFinanceiro {
  contasReceber: {
    valorAReceber: number;
    valorRecebido: number;
    saldoAReceber: number;
  };
  contasPagar: {
    valorAPagar: number;
    valorPago: number;
    saldoAPagar: number;
  };
}

const EXPECTED_INDICATORS: Record<string, number> = {
  "Compra de Ativo": 33,
  "Óleo Diesel": 26,
  Folha: 21,
  Imposto: 5,
  Pedágio: 5,
  Administrativo: 5,
  Manutenção: 15,
};

const normalizeHeader = (value: string) =>
  value.replace(/^\uFEFF/, "").replace(/^ï»¿/, "").trim();

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const parseCsvLine = (line: string, delimiter = ";"): string[] => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCSV = (text: string): RowData[] => {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: RowData = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return 0;

  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value: unknown): Date | null => {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: unknown): string => {
  const date = toDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getColumnValue = (row: RowData, candidates: string[]): unknown => {
  const entries = Object.entries(row);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);

    const exact = entries.find(
      ([key]) => normalizeText(key) === normalizedCandidate
    );
    if (exact) return exact[1];
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);

    const partial = entries.find(([key]) =>
      normalizeText(key).includes(normalizedCandidate)
    );
    if (partial) return partial[1];
  }

  return undefined;
};

const getRequiredColumnsPresent = (rows: RowData[]) => {
  if (!rows.length) return false;

  const first = rows[0];

  return (
    getColumnValue(first, ["DOCUMENTO"]) !== undefined &&
    getColumnValue(first, ["NOME_PARCEIRO"]) !== undefined &&
    getColumnValue(first, ["DATA_VENCIMENTO"]) !== undefined &&
    getColumnValue(first, ["VLR_LIQUIDO"]) !== undefined &&
    getColumnValue(first, ["VLR_PAGO"]) !== undefined
  );
};

const getOrigem = (row: RowData): string =>
  String(getColumnValue(row, ["ORIGEM"]) ?? "")
    .trim()
    .toUpperCase();

const getSituacao = (row: RowData): string =>
  String(getColumnValue(row, ["SITUACAO"]) ?? "")
    .trim()
    .toUpperCase();

const calculateStatus = (
  vencimentoValue: unknown,
  valorLiquido: number,
  valorPago: number,
  situacaoRaw?: string
): FinanceStatus => {
  const saldo = Math.max(valorLiquido - valorPago, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (saldo <= 0) return "Parcial";
  if (valorPago > 0) return "Parcial";

  const situacao = normalizeText(situacaoRaw);
  if (situacao.includes("venc")) return "Vencido";

  const vencimento = toDate(vencimentoValue);
  if (vencimento && vencimento < today) return "Vencido";

  return "Em Aberto";
};

const buildIndicadorSourceText = (row: RowData): string =>
  [
    getColumnValue(row, ["NOME_PARCEIRO"]),
    getColumnValue(row, ["CENTRO_GASTO"]),
    getColumnValue(row, ["CENTRO_CUSTO"]),
    getColumnValue(row, ["SINTETICA"]),
    getColumnValue(row, ["ANALITICA"]),
    getColumnValue(row, ["TIPO_DOCUMENTO"]),
  ]
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();

const matchesIndicator = (indicatorName: string, row: RowData): boolean => {
  const text = buildIndicadorSourceText(row);

  const rules: Record<string, string[]> = {
    "Compra de Ativo": ["ativo", "invest", "imobil", "compra de ativo"],
    "Óleo Diesel": ["diesel", "oleo diesel", "combustivel"],
    Folha: ["folha", "pagto", "pagamento", "salarial", "rh"],
    Imposto: ["imposto", "tribut", "fiscal", "taxa"],
    Pedágio: ["pedagio", "pedágio"],
    Administrativo: ["administrativo", "adm"],
    Manutenção: ["manut", "oficina", "peca", "peça", "reparo"],
  };

  const keywords = rules[indicatorName] ?? [indicatorName.toLowerCase()];
  return keywords.some((keyword) => text.includes(keyword));
};

self.onmessage = (event: MessageEvent<{ text: string }>) => {
  try {
    console.log("[WORKER] recebeu mensagem");
    const rows = parseCSV(event.data.text);
    console.log("[WORKER] linhas parseadas:", rows.length);

    if (!rows.length || !getRequiredColumnsPresent(rows)) {
      throw new Error("O arquivo não possui as colunas esperadas.");
    }

    const receberRows = rows.filter((row) => {
      const origem = getOrigem(row);
      return !origem || origem === "CR";
    });

    const pagarRows = rows.filter((row) => {
      const origem = getOrigem(row);
      if (origem && origem !== "CP") return false;
      const situacao = getSituacao(row);
      if (situacao && situacao !== "D" && situacao !== "P") return false;
      const dataPagamento = String(getColumnValue(row, ["DATA_PAGAMENTO"]) ?? "").trim();
      if (dataPagamento && dataPagamento.toLowerCase() !== "null") return false;
      return true;
    });

    const contasReceber: ContaReceber[] = receberRows.map((row, index) => {
      const valor = toNumber(getColumnValue(row, ["VLR_LIQUIDO", "VLRDOC"]));
      const valorRecebido = toNumber(
        getColumnValue(row, ["VLR_PAGO", "VLR_PARCELA"])
      );

      return {
        id: String(index + 1),
        documento: String(
          getColumnValue(row, ["DOCUMENTO", "NUMERO_DOCUMENTO"]) ??
            `CR-${index + 1}`
        ),
        cliente: String(
          getColumnValue(row, ["NOME_PARCEIRO", "CLIENTE", "RAZAO"]) ?? "N/A"
        ),
        vencimento:
          formatDate(getColumnValue(row, ["DATA_VENCIMENTO"])) || "2024-01-01",
        valor,
        status: calculateStatus(
          getColumnValue(row, ["DATA_VENCIMENTO"]),
          valor,
          valorRecebido,
          getSituacao(row)
        ),
      };
    });

    const contasPagar: ContaPagar[] = pagarRows.map((row, index) => {
      const valor = toNumber(getColumnValue(row, ["VLR_PARCELA", "VLR_LIQUIDO", "VLRDOC"]));
      const valorPago = toNumber(
        getColumnValue(row, ["VLR_PAGO"])
      );

      return {
        id: String(index + 1),
        documento: String(
          getColumnValue(row, ["DOCUMENTO", "NUMERO_DOCUMENTO"]) ??
            `CP-${index + 1}`
        ),
        fornecedor: String(
          getColumnValue(row, ["NOME_PARCEIRO", "FORNECEDOR", "RAZAO"]) ?? "N/A"
        ),
        vencimento:
          formatDate(getColumnValue(row, ["DATA_VENCIMENTO"])) || "2024-01-01",
        valor,
        status: calculateStatus(
          getColumnValue(row, ["DATA_VENCIMENTO"]),
          valor,
          valorPago,
          getSituacao(row)
        ),
      };
    });

    const totalReceber = receberRows.reduce(
      (sum, row) =>
        sum + toNumber(getColumnValue(row, ["VLR_LIQUIDO", "VLRDOC"])),
      0
    );

    const recebido = receberRows.reduce(
      (sum, row) =>
        sum + toNumber(getColumnValue(row, ["VLR_PAGO", "VLR_PARCELA"])),
      0
    );

    const totalPagar = pagarRows.reduce(
      (sum, row) =>
        sum + toNumber(getColumnValue(row, ["VLR_PARCELA", "VLR_LIQUIDO", "VLRDOC"])),
      0
    );

    const pago = pagarRows.reduce(
      (sum, row) =>
        sum + toNumber(getColumnValue(row, ["VLR_PAGO"])),
      0
    );

    const resumo: ResumoFinanceiro = {
      contasReceber: {
        valorAReceber: totalReceber,
        valorRecebido: recebido,
        saldoAReceber: Math.max(totalReceber - recebido, 0),
      },
      contasPagar: {
        valorAPagar: totalPagar,
        valorPago: pago,
        saldoAPagar: Math.max(totalPagar - pago, 0),
      },
    };

    const indicadores: IndicadorComparativo[] = Object.entries(
      EXPECTED_INDICATORS
    ).map(([nome, percentualEsperado], index) => {
      const matchedTotal = pagarRows
        .filter((row) => matchesIndicator(nome, row))
        .reduce(
          (sum, row) =>
            sum + toNumber(getColumnValue(row, ["VLR_PARCELA", "VLR_LIQUIDO", "VLRDOC"])),
          0
        );

      const percentualReal =
        totalPagar > 0 ? (matchedTotal / totalPagar) * 100 : 0;

      return {
        id: String(index + 1),
        nome,
        percentualReal: Math.round(percentualReal * 10) / 10,
        percentualEsperado,
      };
    });

    console.log("[WORKER] processamento concluído, enviando resposta");

    self.postMessage({
      ok: true,
      data: {
        resumo,
        contasReceber,
        contasPagar,
        indicadores,
      },
    });
    } catch (error) {
    console.error("[WORKER] erro:", error);

    self.postMessage({
      ok: false,
      error:
        error instanceof Error ? error.message : "Erro ao processar arquivo.",
    });
  }
};