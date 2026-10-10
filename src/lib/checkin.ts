const STORAGE_KEY = "beacon-checkin-v1";
const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const MAX_NOTE = 280;

export type CheckIn = {
  id: string;
  message: string;
  timezone: string;
  address: string;
  at: number;
  height: number;
};

export type TextMsg = {
  id: string;
  role: "bot" | "you";
  kind: "text";
  text: string;
  at: number;
};

export type ReceiptMsg = {
  id: string;
  role: "bot";
  kind: "receipt";
  caption: string;
  checkin: CheckIn;
  at: number;
};

export type ChatMsg = TextMsg | ReceiptMsg;

export type Log = {
  address: string;
  nextHeight: number;
  checkins: CheckIn[];
  messages: ChatMsg[];
};

export const QUICK_NOTES = [
  "At my desk",
  "Heads down",
  "Out walking",
  "Shipping",
  "Off for the day",
] as const;

export function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function makeStationId(): string {
  const bytes = new Uint8Array(38);
  crypto.getRandomValues(bytes);
  let body = "";
  for (let i = 0; i < bytes.length; i++) body += BECH32[bytes[i]! % 32];
  return `me1${body}`;
}

export function dayKey(ts: number, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ts);
}

export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + delta));
  return utc.toISOString().slice(0, 10);
}

export type Streak = { days: number; markedToday: boolean };

export function streakInfo(checkins: CheckIn[], zone: string, now = Date.now()): Streak {
  const days = new Set(checkins.map((c) => dayKey(c.at, zone)));
  const today = dayKey(now, zone);
  const yesterday = shiftDay(today, -1);
  const anchor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!anchor) return { days: 0, markedToday: false };
  let n = 0;
  let cursor = anchor;
  while (days.has(cursor)) {
    n += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { days: n, markedToday: days.has(today) };
}

export function weekDays(zone: string, now = Date.now()): string[] {
  const today = dayKey(now, zone);
  return Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
}

export function formatWhen(ts: number, zone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}

export function receiptText(checkin: CheckIn): string {
  return [
    "MsgCheckIn",
    `check_in_address: ${checkin.address}`,
    `check_in_message: ${checkin.message}`,
    `check_in_timezone: ${checkin.timezone}`,
  ].join("\n");
}

function uid(): string {
  return crypto.randomUUID();
}

function text(role: "bot" | "you", body: string, at: number): TextMsg {
  return { id: uid(), role, kind: "text", text: body, at };
}

function greeting(zone: string, now: number): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 12) return "Morning.";
  if (hour < 17) return "Afternoon.";
  return "Evening.";
}

export function welcome(zone: string, now = Date.now()): string {
  return `${greeting(zone, now)} Beacon is on the log. Send a note and I will file a check-in with three fields: station id, message, and timezone. The record stays in this browser. Ask for help any time.`;
}

export function freshLog(address: string, zone: string, now = Date.now()): Log {
  return {
    address,
    nextHeight: 1,
    checkins: [],
    messages: [text("bot", welcome(zone, now), now)],
  };
}

type Intent =
  | { type: "help" }
  | { type: "streak" }
  | { type: "log" }
  | { type: "address" }
  | { type: "timezone" }
  | { type: "reset" }
  | { type: "empty" }
  | { type: "checkin"; message: string; trimmed: boolean };

function interpret(raw: string): Intent {
  const textBody = raw.trim();
  if (!textBody) return { type: "empty" };
  const key = textBody.toLowerCase().replace(/[.!?]+$/g, "");
  if (key === "help" || key === "?" || key === "commands") return { type: "help" };
  if (key === "streak" || key === "my streak") return { type: "streak" };
  if (key === "log" || key === "history" || key === "pings") return { type: "log" };
  if (key === "address" || key === "station" || key === "id") return { type: "address" };
  if (key === "timezone" || key === "tz" || key === "zone") return { type: "timezone" };
  if (key === "reset log") return { type: "reset" };
  const trimmed = textBody.length > MAX_NOTE;
  return {
    type: "checkin",
    message: textBody.slice(0, MAX_NOTE),
    trimmed,
  };
}

function streakSentence(info: Streak): string {
  if (info.days === 0) return "No live streak. A note starts day 1.";
  const unit = info.days === 1 ? "day" : "days";
  if (info.markedToday) return `${info.days} ${unit} on the streak, and today is already marked.`;
  return `${info.days} ${unit} on the streak. Check in today to keep it.`;
}

function helpText(): string {
  return "Send any note to check in. You can also ask for streak, log, address, or timezone. reset log clears this browser and keeps the same station id.";
}

export function applyInput(log: Log, raw: string, zone: string, now = Date.now()): Log {
  const intent = interpret(raw);
  if (intent.type === "empty") {
    return {
      ...log,
      messages: [...log.messages, text("bot", "I need a note, or you can ask for help.", now)],
    };
  }

  const you = text("you", raw.trim(), now);

  if (intent.type === "reset") {
    const next = freshLog(log.address, zone, now + 1);
    return {
      ...next,
      messages: [
        you,
        text("bot", "Log cleared. The station id stays. The streak starts over.", now),
        ...next.messages,
      ],
    };
  }

  if (intent.type === "help") {
    return { ...log, messages: [...log.messages, you, text("bot", helpText(), now)] };
  }
  if (intent.type === "streak") {
    return {
      ...log,
      messages: [...log.messages, you, text("bot", streakSentence(streakInfo(log.checkins, zone, now)), now)],
    };
  }
  if (intent.type === "address") {
    return {
      ...log,
      messages: [
        ...log.messages,
        you,
        text("bot", `Station id ${log.address}. Local only. Not a key and not a wallet.`, now),
      ],
    };
  }
  if (intent.type === "timezone") {
    return {
      ...log,
      messages: [...log.messages, you, text("bot", `Check-ins stamp ${zone}.`, now)],
    };
  }
  if (intent.type === "log") {
    const recent = [...log.checkins].reverse().slice(0, 5);
    const body =
      recent.length === 0
        ? "The log is empty."
        : [
            "Latest pings",
            ...recent.map((c) => `· ${formatWhen(c.at, zone)} — ${c.message}`),
            `${log.checkins.length} on the log.`,
          ].join("\n");
    return { ...log, messages: [...log.messages, you, text("bot", body, now)] };
  }

  const before = streakInfo(log.checkins, zone, now);
  const checkin: CheckIn = {
    id: uid(),
    message: intent.message,
    timezone: zone,
    address: log.address,
    at: now,
    height: log.nextHeight,
  };
  const checkins = [...log.checkins, checkin];
  const after = streakInfo(checkins, zone, now);
  const todayCount = checkins.filter((c) => dayKey(c.at, zone) === dayKey(now, zone)).length;
  const lapsed = before.days === 0 && log.checkins.length > 0;
  let caption: string;
  if (lapsed) caption = "Filed. The run had lapsed, so this starts day 1.";
  else if (todayCount === 1) caption = `Filed. Day ${after.days} is marked.`;
  else {
    const unit = after.days === 1 ? "day" : "days";
    caption = `Another ping today. The streak stays at ${after.days} ${unit}.`;
  }
  if (intent.trimmed) caption += " I kept the first 280 characters.";

  const receipt: ReceiptMsg = {
    id: uid(),
    role: "bot",
    kind: "receipt",
    caption,
    checkin,
    at: now,
  };

  return {
    ...log,
    nextHeight: log.nextHeight + 1,
    checkins,
    messages: [...log.messages, you, receipt],
  };
}

export function loadLog(): Log | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Log;
    if (!parsed || typeof parsed.address !== "string" || !Array.isArray(parsed.messages)) return null;
    if (!Array.isArray(parsed.checkins) || typeof parsed.nextHeight !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLog(log: Log): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* private mode or a full disk — the session still works */
  }
}
