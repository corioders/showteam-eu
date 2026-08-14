export const applicationDisciplines = ["Narty", "Snowboard", "Sporty wodne", "Inne"] as const;
export const applicationLevels = ["Od podstaw", "Doskonalenie", "Jazda sportowa"] as const;
export const applicationTransport = ["Tak", "Nie", "Nie dotyczy"] as const;

export function applicationReference(id: string) {
  return `ZGL-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function applicationAge(birthDate: string, onDate: string) {
  const birth = birthDate.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const current = onDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!birth || !current) return undefined;
  const [, birthYear, birthMonth, birthDay] = birth.map(Number);
  const [, currentYear, currentMonth, currentDay] = current.map(Number);
  return currentYear - birthYear - (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay) ? 1 : 0);
}

export function safeSpreadsheetCell(value: unknown) {
  const text = String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${safeSpreadsheetCell(value).replaceAll('"', '""')}"`;
}
