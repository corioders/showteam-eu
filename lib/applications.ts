export const applicationDisciplines = ["Narty", "Snowboard", "Sporty wodne", "Inne"] as const;
export const applicationLevels = ["Od podstaw", "Doskonalenie", "Jazda sportowa"] as const;
export const applicationTransport = ["Tak", "Nie", "Nie dotyczy"] as const;

export function applicationReference(id: string) {
  return `ZGL-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function safeSpreadsheetCell(value: unknown) {
  const text = String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${safeSpreadsheetCell(value).replaceAll('"', '""')}"`;
}
