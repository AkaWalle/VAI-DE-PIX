// Brazilian currency and date formatting utilities

export function formatCurrency(
  amount: number,
  options?: {
    showSign?: boolean;
    abbreviated?: boolean;
  },
): string {
  const { showSign = true, abbreviated = false } = options || {};

  const absAmount = Math.abs(amount);
  let formattedAmount: string;

  if (abbreviated && absAmount >= 1000000) {
    formattedAmount = `R$ ${(absAmount / 1000000).toFixed(1)}M`;
  } else if (abbreviated && absAmount >= 1000) {
    formattedAmount = `R$ ${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formattedAmount = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(absAmount);
  }

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
  }

  return amount < 0 ? `-${formattedAmount}` : formattedAmount;
}

export function formatDate(
  date: string | Date,
  format: "short" | "medium" | "long" = "medium",
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Verificar se a data é válida
  if (isNaN(dateObj.getTime())) {
    return "Data inválida";
  }

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    case "long":
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        weekday: "long",
      });
    default:
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  }
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Verificar se a data é válida
  if (isNaN(dateObj.getTime())) {
    return "Data inválida";
  }

  return dateObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return "Agora mesmo";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} min atrás`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)}h atrás`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} dias atrás`;

  return formatDate(dateObj);
}

export function getMonthName(monthIndex: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return months[monthIndex];
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
