import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Send, r as Radio } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CNIiQmvq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY = "beacon-checkin-v1";
var BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var MAX_NOTE = 280;
var QUICK_NOTES = [
	"At my desk",
	"Heads down",
	"Out walking",
	"Shipping",
	"Off for the day"
];
function timeZone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}
function makeStationId() {
	const bytes = /* @__PURE__ */ new Uint8Array(38);
	crypto.getRandomValues(bytes);
	let body = "";
	for (let i = 0; i < bytes.length; i++) body += BECH32[bytes[i] % 32];
	return `me1${body}`;
}
function dayKey(ts, zone) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: zone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(ts);
}
function shiftDay(key, delta) {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + delta)).toISOString().slice(0, 10);
}
function streakInfo(checkins, zone, now = Date.now()) {
	const days = new Set(checkins.map((c) => dayKey(c.at, zone)));
	const today = dayKey(now, zone);
	const yesterday = shiftDay(today, -1);
	const anchor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
	if (!anchor) return {
		days: 0,
		markedToday: false
	};
	let n = 0;
	let cursor = anchor;
	while (days.has(cursor)) {
		n += 1;
		cursor = shiftDay(cursor, -1);
	}
	return {
		days: n,
		markedToday: days.has(today)
	};
}
function weekDays(zone, now = Date.now()) {
	const today = dayKey(now, zone);
	return Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
}
function formatWhen(ts, zone) {
	return new Intl.DateTimeFormat(void 0, {
		timeZone: zone,
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(ts);
}
function receiptText(checkin) {
	return [
		"MsgCheckIn",
		`check_in_address: ${checkin.address}`,
		`check_in_message: ${checkin.message}`,
		`check_in_timezone: ${checkin.timezone}`
	].join("\n");
}
function uid() {
	return crypto.randomUUID();
}
function text(role, body, at) {
	return {
		id: uid(),
		role,
		kind: "text",
		text: body,
		at
	};
}
function greeting(zone, now) {
	const hour = Number(new Intl.DateTimeFormat("en-GB", {
		timeZone: zone,
		hour: "numeric",
		hourCycle: "h23"
	}).format(now));
	if (hour < 12) return "Morning.";
	if (hour < 17) return "Afternoon.";
	return "Evening.";
}
function welcome(zone, now = Date.now()) {
	return `${greeting(zone, now)} Beacon is on the log. Send a note and I will file a check-in with three fields: station id, message, and timezone. The record stays in this browser. Ask for help any time.`;
}
function freshLog(address, zone, now = Date.now()) {
	return {
		address,
		nextHeight: 1,
		checkins: [],
		messages: [text("bot", welcome(zone, now), now)]
	};
}
function interpret(raw) {
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
		trimmed
	};
}
function streakSentence(info) {
	if (info.days === 0) return "No live streak. A note starts day 1.";
	const unit = info.days === 1 ? "day" : "days";
	if (info.markedToday) return `${info.days} ${unit} on the streak, and today is already marked.`;
	return `${info.days} ${unit} on the streak. Check in today to keep it.`;
}
function helpText() {
	return "Send any note to check in. You can also ask for streak, log, address, or timezone. reset log clears this browser and keeps the same station id.";
}
function applyInput(log, raw, zone, now = Date.now()) {
	const intent = interpret(raw);
	if (intent.type === "empty") return {
		...log,
		messages: [...log.messages, text("bot", "I need a note, or you can ask for help.", now)]
	};
	const you = text("you", raw.trim(), now);
	if (intent.type === "reset") {
		const next = freshLog(log.address, zone, now + 1);
		return {
			...next,
			messages: [
				you,
				text("bot", "Log cleared. The station id stays. The streak starts over.", now),
				...next.messages
			]
		};
	}
	if (intent.type === "help") return {
		...log,
		messages: [
			...log.messages,
			you,
			text("bot", helpText(), now)
		]
	};
	if (intent.type === "streak") return {
		...log,
		messages: [
			...log.messages,
			you,
			text("bot", streakSentence(streakInfo(log.checkins, zone, now)), now)
		]
	};
	if (intent.type === "address") return {
		...log,
		messages: [
			...log.messages,
			you,
			text("bot", `Station id ${log.address}. Local only. Not a key and not a wallet.`, now)
		]
	};
	if (intent.type === "timezone") return {
		...log,
		messages: [
			...log.messages,
			you,
			text("bot", `Check-ins stamp ${zone}.`, now)
		]
	};
	if (intent.type === "log") {
		const recent = [...log.checkins].reverse().slice(0, 5);
		const body = recent.length === 0 ? "The log is empty." : [
			"Latest pings",
			...recent.map((c) => `· ${formatWhen(c.at, zone)} — ${c.message}`),
			`${log.checkins.length} on the log.`
		].join("\n");
		return {
			...log,
			messages: [
				...log.messages,
				you,
				text("bot", body, now)
			]
		};
	}
	const before = streakInfo(log.checkins, zone, now);
	const checkin = {
		id: uid(),
		message: intent.message,
		timezone: zone,
		address: log.address,
		at: now,
		height: log.nextHeight
	};
	const checkins = [...log.checkins, checkin];
	const after = streakInfo(checkins, zone, now);
	const todayCount = checkins.filter((c) => dayKey(c.at, zone) === dayKey(now, zone)).length;
	const lapsed = before.days === 0 && log.checkins.length > 0;
	let caption;
	if (lapsed) caption = "Filed. The run had lapsed, so this starts day 1.";
	else if (todayCount === 1) caption = `Filed. Day ${after.days} is marked.`;
	else {
		const unit = after.days === 1 ? "day" : "days";
		caption = `Another ping today. The streak stays at ${after.days} ${unit}.`;
	}
	if (intent.trimmed) caption += " I kept the first 280 characters.";
	const receipt = {
		id: uid(),
		role: "bot",
		kind: "receipt",
		caption,
		checkin,
		at: now
	};
	return {
		...log,
		nextHeight: log.nextHeight + 1,
		checkins,
		messages: [
			...log.messages,
			you,
			receipt
		]
	};
}
function loadLog() {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed.address !== "string" || !Array.isArray(parsed.messages)) return null;
		if (!Array.isArray(parsed.checkins) || typeof parsed.nextHeight !== "number") return null;
		return parsed;
	} catch {
		return null;
	}
}
function saveLog(log) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
	} catch {}
}
function BeaconApp() {
	const [log, setLog] = (0, import_react.useState)(null);
	const [zone, setZone] = (0, import_react.useState)("UTC");
	const [draft, setDraft] = (0, import_react.useState)("");
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [copied, setCopied] = (0, import_react.useState)(null);
	const [confirmReset, setConfirmReset] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const field = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const tz = timeZone();
		setZone(tz);
		setLog(loadLog() ?? freshLog(makeStationId(), tz));
	}, []);
	(0, import_react.useEffect)(() => {
		if (log) saveLog(log);
	}, [log]);
	(0, import_react.useEffect)(() => {
		const node = scroller.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [log?.messages.length]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 6e4);
		return () => window.clearInterval(id);
	}, []);
	function send(raw) {
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
	async function copyReceipt(id, text) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(id);
			window.setTimeout(() => setCopied((current) => current === id ? null : current), 1600);
		} catch {
			setCopied(null);
		}
	}
	const intro = "Beacon is on the log. Send a note and I will file a check-in with three fields: station id, message, and timezone. The record stays in this browser.";
	if (!log) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col bg-bg text-fg md:flex-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-80 shrink-0 flex-col border-r border-line bg-surface px-6 py-7 md:flex",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakBlock, {
					days: 0,
					markedToday: false,
					todayCount: 0
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-8 text-sm leading-relaxed text-faint",
					children: "Same three fields as a check-in message. Nothing is broadcast."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-h-0 min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { compact: true }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-sm tabular-nums text-primary",
						children: "0d"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-xl text-pretty",
						children: intro
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-line px-4 py-3 md:px-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-faint",
						children: "Opening the log…"
					})
				})
			]
		})]
	});
	const streak = streakInfo(log.checkins, zone, now);
	const marked = new Set(log.checkins.map((c) => dayKey(c.at, zone)));
	const days = weekDays(zone, now);
	const todayCount = log.checkins.filter((c) => dayKey(c.at, zone) === dayKey(now, zone)).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col bg-bg text-fg md:flex-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-80 shrink-0 flex-col border-r border-line bg-surface px-6 py-7 md:flex",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakBlock, {
					days: streak.days,
					markedToday: streak.markedToday,
					todayCount
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Week, {
					days,
					marked,
					today: dayKey(now, zone)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-8 space-y-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-faint",
						children: "Station id"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 break-all font-mono text-xs leading-relaxed text-muted",
						children: log.address
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-faint",
						children: "Timezone"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 text-muted",
						children: zone
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-sm leading-relaxed text-faint",
					children: "Same three fields as a check-in message. Nothing is broadcast."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: resetFromRail,
					className: "mt-auto min-h-11 rounded-full border border-line px-4 text-sm text-muted hover:border-primary hover:text-fg",
					children: confirmReset ? "Confirm reset" : "Reset log"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-h-0 min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { compact: true }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-sm tabular-nums text-primary",
						children: [
							streak.days,
							"d",
							streak.markedToday ? " · today" : ""
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					className: "min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-8",
					"aria-live": "polite",
					children: log.messages.map((msg) => msg.kind === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: msg.role === "you" ? "ml-auto max-w-lg rounded-2xl bg-raised px-4 py-3 text-pretty whitespace-pre-wrap" : "max-w-xl text-pretty whitespace-pre-wrap",
						children: msg.text
					}, msg.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "max-w-xl border-l-2 border-primary pl-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-pretty",
								children: msg.caption
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								className: "mt-3 overflow-x-auto rounded-2xl bg-surface p-4 font-mono text-xs leading-relaxed text-muted",
								children: receiptText(msg.checkin)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex items-center gap-3 text-xs text-faint",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tabular-nums",
										children: ["local height ", msg.checkin.height]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatWhen(msg.checkin.at, zone) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "min-h-11 text-muted underline-offset-2 hover:text-fg hover:underline",
										onClick: () => copyReceipt(msg.id, receiptText(msg.checkin)),
										children: copied === msg.id ? "Copied" : "Copy fields"
									})
								]
							})
						]
					}, msg.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "border-t border-line px-4 py-3 md:px-8",
					onSubmit: (event) => {
						event.preventDefault();
						send(draft);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "no-scrollbar mb-3 flex gap-2 overflow-x-auto",
							children: QUICK_NOTES.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => send(note),
								className: "min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-muted hover:border-primary hover:text-fg",
								children: note
							}, note))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end gap-2 rounded-2xl border border-line bg-surface p-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "sr-only",
									htmlFor: "note",
									children: "Check-in note"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									id: "note",
									ref: field,
									rows: 1,
									value: draft,
									maxLength: 400,
									placeholder: "A note, or ask for streak, log, help",
									onChange: (event) => setDraft(event.target.value),
									onKeyDown: (event) => {
										if (event.key === "Enter" && !event.shiftKey) {
											event.preventDefault();
											send(draft);
										}
									},
									className: "max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-fg outline-none placeholder:text-faint"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: !draft.trim(),
									"aria-label": "Send",
									className: "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg disabled:opacity-40",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
										className: "size-4",
										"aria-hidden": true
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: resetFromRail,
							className: "mt-2 min-h-11 text-xs text-faint md:hidden",
							children: confirmReset ? "Tap again to reset the log" : "Reset log"
						})
					]
				})
			]
		})]
	});
}
function Wordmark({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "flex size-9 items-center justify-center rounded-full border border-line bg-raised text-primary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {
				className: "size-4",
				"aria-hidden": true
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium tracking-widest",
			children: "BEACON"
		}), compact ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Check-in bot"
		})] })]
	});
}
function StreakBlock({ days, markedToday, todayCount }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-5xl tabular-nums text-primary",
				children: days
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [days === 1 ? "day" : "days", " in a row"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-faint",
				children: markedToday ? `Marked today · ${todayCount} ${todayCount === 1 ? "ping" : "pings"}` : "Not yet today"
			})
		]
	});
}
function Week({ days, marked, today }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-xs text-faint",
			children: "Last 7 days"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-2",
			children: days.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				title: day,
				className: `size-3 rounded-full ${marked.has(day) ? "bg-primary" : "border border-faint"} ${day === today ? "ring-1 ring-fg ring-offset-2 ring-offset-surface" : ""}`
			}, day))
		})]
	});
}
var SplitComponent = BeaconApp;
//#endregion
export { SplitComponent as component };
