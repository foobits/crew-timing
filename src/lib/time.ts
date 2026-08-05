export type Milliseconds = number;

export type ParseResult =
  | { ok: true; value: Milliseconds }
  | { ok: false; error: string };

export function isParseFailure(
  result: ParseResult,
): result is { ok: false; error: string } {
  return !result.ok;
}

export type SignedMilliseconds = {
  ms: Milliseconds;
  negative: boolean;
};

const MS_PER_DAY = 86_400_000;

function parseFraction(raw: string | undefined): ParseResult {
  if (raw === undefined || raw === "") {
    return { ok: true, value: 0 };
  }
  if (!/^\d{1,3}$/.test(raw)) {
    return { ok: false, error: "Use no more than three decimal digits." };
  }
  const padded = raw.padEnd(3, "0");
  return { ok: true, value: Number(padded) };
}

function parseDurationParts(
  minutes: number,
  seconds: number,
  fractionMs: number,
): ParseResult {
  if (minutes < 0) {
    return { ok: false, error: "Minutes cannot be negative." };
  }
  if (seconds < 0 || seconds > 59) {
    return { ok: false, error: "Seconds must be between 00 and 59." };
  }
  return { ok: true, value: minutes * 60_000 + seconds * 1_000 + fractionMs };
}

function extractDigits(input: string, maxDigits: number): string {
  return input.replace(/\D/g, "").slice(0, maxDigits);
}

/** Insert HH:MM:SS.SSS separators while typing digits on a decimal keypad. */
export function formatTimestampWhileTyping(input: string): string {
  const digits = extractDigits(input, 9);
  const len = digits.length;
  if (len <= 2) return digits;
  if (len <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (len <= 6) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}.${digits.slice(6)}`;
}

/** Insert MM:SS.SSS separators while typing digits on a decimal keypad. */
export function formatElapsedWhileTyping(input: string): string {
  const digits = extractDigits(input, 11);
  const len = digits.length;
  if (len === 0) return "";
  if (len <= 2) return digits;
  if (len === 3) return `${digits[0]}:${digits.slice(1)}`;
  if (len === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (len === 5) {
    return `${digits.slice(0, len - 4)}:${digits.slice(len - 4, len - 2)}.${digits.slice(len - 2)}`;
  }
  const minutes = digits.slice(0, len - 5);
  const seconds = digits.slice(len - 5, len - 3);
  const frac = digits.slice(len - 3);
  return `${minutes}:${seconds}.${frac}`;
}

/** Sanitize gap input: decimal seconds when a dot is used, MM:SS.SSS otherwise. */
export function formatGapWhileTyping(input: string): string {
  const trimmed = input.trim().replace(/^[+-]/, "");
  if (!trimmed) return "";

  if (trimmed.includes(":") || trimmed.includes(".")) {
    if (trimmed.includes(":")) {
      return formatElapsedWhileTyping(trimmed);
    }

    let sanitized = trimmed.replace(/[^\d.]/g, "");
    const firstDot = sanitized.indexOf(".");
    if (firstDot === -1) return sanitized;

    const whole = sanitized.slice(0, firstDot);
    const fraction = sanitized.slice(firstDot + 1).replace(/\./g, "").slice(0, 3);
    if (fraction.length > 0 || sanitized.endsWith(".")) {
      return `${whole}.${fraction}`;
    }
    return whole;
  }

  const digits = extractDigits(trimmed, 11);
  if (digits.length >= 5) {
    return formatElapsedWhileTyping(digits);
  }
  return digits;
}

/** Parse race start / finish timestamp: HH:MM:SS[.SSS] */
export function parseTimestamp(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a race start timestamp." };
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return {
      ok: false,
      error: "Use HH:MM:SS or HH:MM:SS.SSS (24-hour, no AM/PM).",
    };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = parseFraction(match[4]);
  if (!fraction.ok) return fraction;

  if (hours > 23) {
    return { ok: false, error: "Hours must be between 00 and 23." };
  }
  if (minutes > 59 || seconds > 59) {
    return { ok: false, error: "Minutes and seconds must be between 00 and 59." };
  }

  return {
    ok: true,
    value: hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + fraction.value,
  };
}

/** Parse reference elapsed: MM:SS[.SSS] or M:SS[.SSS] */
export function parseElapsed(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter reference elapsed time." };
  }

  const colonMatch = trimmed.match(/^(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
  if (colonMatch) {
    const fraction = parseFraction(colonMatch[3]);
    if (!fraction.ok) return fraction;
    return parseDurationParts(
      Number(colonMatch[1]),
      Number(colonMatch[2]),
      fraction.value,
    );
  }

  const decimalMatch = trimmed.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (decimalMatch) {
    const fraction = parseFraction(decimalMatch[2]);
    if (!fraction.ok) return fraction;
    const seconds = Number(decimalMatch[1]);
    return { ok: true, value: seconds * 1_000 + fraction.value };
  }

  return {
    ok: false,
    error: "Use MM:SS.SSS or seconds with optional decimals.",
  };
}

/** Parse signed gap from reference. */
export function parseGap(input: string): ParseResult & { signed?: SignedMilliseconds } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a gap from reference." };
  }

  const signMatch = trimmed.match(/^([+-]?)(.+)$/);
  if (!signMatch) {
    return { ok: false, error: "Invalid gap format." };
  }

  const negative = signMatch[1] === "-";
  const body = signMatch[2].trim();
  if (/^[+-]\s/.test(trimmed)) {
    return { ok: false, error: "No space between sign and number." };
  }

  const colonMatch = body.match(/^(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
  let parsed: ParseResult;
  if (colonMatch) {
    const fraction = parseFraction(colonMatch[3]);
    if (!fraction.ok) return fraction;
    parsed = parseDurationParts(
      Number(colonMatch[1]),
      Number(colonMatch[2]),
      fraction.value,
    );
  } else {
    const decimalMatch = body.match(/^(\d+)(?:\.(\d{1,3}))?$/);
    if (!decimalMatch) {
      return { ok: false, error: "Use +MM:SS.SSS, -MM:SS.SSS, or seconds." };
    }
    const fraction = parseFraction(decimalMatch[2]);
    if (!fraction.ok) return fraction;
    parsed = {
      ok: true,
      value: Number(decimalMatch[1]) * 1_000 + fraction.value,
    };
  }

  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: parsed.value,
    signed: { ms: parsed.value, negative },
  };
}

export function formatTimestamp(ms: Milliseconds): string {
  const normalized = ((ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  const hours = Math.floor(normalized / 3_600_000);
  const minutes = Math.floor((normalized % 3_600_000) / 60_000);
  const seconds = Math.floor((normalized % 60_000) / 1_000);
  const millis = normalized % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatElapsed(ms: Milliseconds): string {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const millis = total % 1_000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatGap(signed: SignedMilliseconds): string {
  const prefix = signed.negative ? "-" : "+";
  return `${prefix}${formatElapsed(signed.ms)}`;
}

export function addDurationToTimestamp(
  timestampMs: Milliseconds,
  durationMs: Milliseconds,
): { ms: Milliseconds; dayOffset: number } {
  const total = timestampMs + durationMs;
  const dayOffset = Math.floor(total / MS_PER_DAY);
  const ms = ((total % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  return { ms, dayOffset };
}

export function elapsedBetweenTimestamps(
  startMs: Milliseconds,
  finishMs: Milliseconds,
  dayOffset: number,
): Milliseconds {
  return finishMs - startMs + dayOffset * MS_PER_DAY;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatRestoreTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
