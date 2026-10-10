import { useEffect, useRef, useState } from "react";
import { Radio, Send } from "lucide-react";
import {
  QUICK_NOTES,
  applyInput,
  dayKey,
  formatWhen,
  freshLog,
  loadLog,
  makeStationId,
  receiptText,
  saveLog,
  streakInfo,
  timeZone,
  weekDays,
  type Log,
} from "@/lib/checkin";

export function BeaconApp() {
  const [log, setLog] = useState<Log | null>(null);
  const [zone, setZone] = useState("UTC");
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const tz = timeZone();
    setZone(tz);
    setLog(loadLog() ?? freshLog(makeStationId(), tz));
  }, []);

  useEffect(() => {
    if (log) saveLog(log);
  }, [log]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [log?.messages.length]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function send(raw: string) {
    const value = raw.trim();
    if (!value || !log) return;
    setLog(applyInput(log, value, zone));
    setDraft("");
    setConfirmReset(false);
    field.current?.focus();
  }

  function resetFromRail() {
    if (!log) return;
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setLog(applyInput(log, "reset log", zone));
    setConfirmReset(false);
  }

  async function copyReceipt(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  }

  const intro =
    "Beacon is on the log. Send a note and I will file a check-in with three fields: station id, message, and timezone. The record stays in this browser.";

  if (!log) {
    return (
      <main className="flex h-dvh flex-col bg-bg text-fg md:flex-row">
        <aside className="hidden w-80 shrink-0 flex-col border-r border-line bg-surface px-6 py-7 md:flex">
          <Wordmark />
          <StreakBlock days={0} markedToday={false} todayCount={0} />
          <p className="mt-8 text-sm leading-relaxed text-faint">Same three fields as a check-in message. Nothing is broadcast.</p>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden">
            <Wordmark compact />
            <p className="font-mono text-sm tabular-nums text-primary">0d</p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
            <p className="max-w-xl text-pretty">{intro}</p>
          </div>
          <div className="border-t border-line px-4 py-3 md:px-8">
            <p className="text-sm text-faint">Opening the log…</p>
          </div>
        </section>
      </main>
    );
  }

  const streak = streakInfo(log.checkins, zone, now);
  const marked = new Set(log.checkins.map((c) => dayKey(c.at, zone)));
  const days = weekDays(zone, now);
  const todayCount = log.checkins.filter((c) => dayKey(c.at, zone) === dayKey(now, zone)).length;

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg md:flex-row">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-line bg-surface px-6 py-7 md:flex">
        <Wordmark />
        <StreakBlock days={streak.days} markedToday={streak.markedToday} todayCount={todayCount} />
        <Week days={days} marked={marked} today={dayKey(now, zone)} />
        <dl className="mt-8 space-y-4 text-sm">
          <div>
            <dt className="text-faint">Station id</dt>
            <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-muted">{log.address}</dd>
          </div>
          <div>
            <dt className="text-faint">Timezone</dt>
            <dd className="mt-1 text-muted">{zone}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-faint">
          Same three fields as a check-in message. Nothing is broadcast.
        </p>
        <button
          type="button"
          onClick={resetFromRail}
          className="mt-auto min-h-11 rounded-full border border-line px-4 text-sm text-muted hover:border-primary hover:text-fg"
        >
          {confirmReset ? "Confirm reset" : "Reset log"}
        </button>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden">
          <Wordmark compact />
          <p className="font-mono text-sm tabular-nums text-primary">
            {streak.days}d{streak.markedToday ? " · today" : ""}
          </p>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-8" aria-live="polite">
          {log.messages.map((msg) =>
            msg.kind === "text" ? (
              <p
                key={msg.id}
                className={
                  msg.role === "you"
                    ? "ml-auto max-w-lg rounded-2xl bg-raised px-4 py-3 text-pretty whitespace-pre-wrap"
                    : "max-w-xl text-pretty whitespace-pre-wrap"
                }
              >
                {msg.text}
              </p>
            ) : (
              <article key={msg.id} className="max-w-xl border-l-2 border-primary pl-4">
                <p className="text-pretty">{msg.caption}</p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
                  {receiptText(msg.checkin)}
                </pre>
                <div className="mt-2 flex items-center gap-3 text-xs text-faint">
                  <span className="tabular-nums">local height {msg.checkin.height}</span>
                  <span>{formatWhen(msg.checkin.at, zone)}</span>
                  <button
                    type="button"
                    className="min-h-11 text-muted underline-offset-2 hover:text-fg hover:underline"
                    onClick={() => copyReceipt(msg.id, receiptText(msg.checkin))}
                  >
                    {copied === msg.id ? "Copied" : "Copy fields"}
                  </button>
                </div>
              </article>
            ),
          )}
        </div>

        <form
          className="border-t border-line px-4 py-3 md:px-8"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {QUICK_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => send(note)}
                className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-muted hover:border-primary hover:text-fg"
              >
                {note}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2">
            <label className="sr-only" htmlFor="note">
              Check-in note
            </label>
            <textarea
              id="note"
              ref={field}
              rows={1}
              value={draft}
              maxLength={400}
              placeholder="A note, or ask for streak, log, help"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-fg outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={resetFromRail}
            className="mt-2 min-h-11 text-xs text-faint md:hidden"
          >
            {confirmReset ? "Tap again to reset the log" : "Reset log"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full border border-line bg-raised text-primary">
        <Radio className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium tracking-widest">BEACON</p>
        {compact ? null : <p className="text-sm text-muted">Check-in bot</p>}
      </div>
    </div>
  );
}

function StreakBlock({
  days,
  markedToday,
  todayCount,
}: {
  days: number;
  markedToday: boolean;
  todayCount: number;
}) {
  return (
    <div className="mt-10">
      <p className="font-mono text-5xl tabular-nums text-primary">{days}</p>
      <p className="mt-1 text-sm text-muted">{days === 1 ? "day" : "days"} in a row</p>
      <p className="mt-2 text-sm text-faint">
        {markedToday ? `Marked today · ${todayCount} ${todayCount === 1 ? "ping" : "pings"}` : "Not yet today"}
      </p>
    </div>
  );
}

function Week({ days, marked, today }: { days: string[]; marked: Set<string>; today: string }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs text-faint">Last 7 days</p>
      <div className="flex gap-2">
        {days.map((day) => (
          <span
            key={day}
            title={day}
            className={`size-3 rounded-full ${marked.has(day) ? "bg-primary" : "border border-faint"} ${day === today ? "ring-1 ring-fg ring-offset-2 ring-offset-surface" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
