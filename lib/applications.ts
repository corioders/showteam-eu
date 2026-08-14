export const applicationDisciplines = ["Narty", "Snowboard", "Sporty wodne", "Inne"] as const;
export const applicationLevels = ["Od podstaw", "Doskonalenie", "Jazda sportowa"] as const;
export const applicationTransport = ["Tak", "Nie", "Nie dotyczy"] as const;

export function applicationReference(id: string) {
  return `ZGL-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function participantIdentity(input: { email: string; participantEmail?: string; participantName: string; birthDate: string }) {
  const participantEmail = normalizeEmail(input.participantEmail || "");
  if (participantEmail) return `email:${participantEmail}`;
  const name = input.participantName.trim().toLowerCase().replace(/\s+/g, " ");
  return `contact:${normalizeEmail(input.email)}|${name}|${input.birthDate.slice(0, 10)}`;
}

export function safeSpreadsheetCell(value: unknown) {
  const text = String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${safeSpreadsheetCell(value).replaceAll('"', '""')}"`;
}
