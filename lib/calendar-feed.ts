export type CalendarBooking = {
  reservation_id: string;
  reference: string;
  equipment_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  phone: string;
  status: string;
  customer_notes: string | null;
  staff_notes: string | null;
  updated_at: string;
};

const encoder = new TextEncoder();

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");
}

function foldLine(line: string): string {
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    const limit = lines.length ? 74 : 75;
    if (bytes + characterBytes > limit) {
      lines.push(current);
      current = ` ${character}`;
      bytes = 1 + characterBytes;
    } else {
      current += character;
      bytes += characterBytes;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

function utcTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;
}

function localDateTime(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replaceAll(":", "")}00`;
}

export function buildCalendarFeed(bookings: CalendarBooking[], generatedAt = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SHOWteam//Rezerwacje//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SHOWteam - rezerwacje",
    "X-WR-TIMEZONE:Europe/Warsaw",
  ];

  for (const booking of bookings) {
    const notes = booking.staff_notes || booking.customer_notes;
    const description = [
      `Numer: ${booking.reference}`,
      `Telefon: ${booking.phone}`,
      `Status: ${booking.status}`,
      notes ? `Notatka: ${notes}` : "",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(booking.reservation_id)}@showteam.eu`,
      `DTSTAMP:${utcTimestamp(generatedAt)}`,
      `LAST-MODIFIED:${utcTimestamp(booking.updated_at)}`,
      `DTSTART;TZID=Europe/Warsaw:${localDateTime(booking.booking_date, booking.start_time)}`,
      `DTEND;TZID=Europe/Warsaw:${localDateTime(booking.booking_date, booking.end_time)}`,
      `SUMMARY:${escapeIcs(`${booking.equipment_name} - ${booking.customer_name}`)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
