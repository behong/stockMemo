const TIME_ZONE = process.env.TZ || "Asia/Seoul";

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DateTimeResult = {
  date: string;
  time: string;
};

function extractParts(
  formatter: Intl.DateTimeFormat,
  date: Date,
): Record<string, string> {
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return values;
}

export function getKstDateTime(now: Date = new Date()): DateTimeResult {
  const parts = extractParts(dateTimeFormatter, now);

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function getKstDate(now: Date = new Date()): string {
  const parts = extractParts(dateOnlyFormatter, now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
