"use client";

import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Code2,
  Compass,
  Copy,
  Eye,
  Globe2,
  LockKeyhole,
  Mic2,
  MousePointer2,
  PhoneCall,
  Play,
  Radar,
  Sparkles,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const flow = [
  { label: "Script loaded", icon: Code2, tone: "text-emerald-700" },
  { label: "Callback live", icon: PhoneCall, tone: "text-sky-700" },
  { label: "Cursor context", icon: MousePointer2, tone: "text-amber-700" },
  { label: "Vision answer", icon: Brain, tone: "text-rose-700" },
];

const sampleExplanations = [
  "That is the checkout button. Use it when you are ready to review your items and pay.",
  "This field is asking for the email address where the site should send updates or receipts.",
  "That small menu opens more choices. It is useful when the main page is hiding extra actions.",
  "This looks like a filter. It narrows the page so you only see results that match your choice.",
];

const snippet = `<script
  src="https://your-domain.com/widget.js"
  data-site-id="your_site_id"
  async
></script>`;

export function SaarthiHome() {
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState({ x: 72, y: 44 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((value) => (value + 1) % flow.length);
      setCursor((value) => ({
        x: value.x > 64 ? 32 : value.x + 18,
        y: value.y > 52 ? 28 : value.y + 13,
      }));
    }, 1900);

    return () => window.clearInterval(interval);
  }, []);

  const ActiveIcon = flow[step].icon;
  const explanation = sampleExplanations[step];

  const bars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        height: 22 + ((index * 17 + step * 11) % 54),
      })),
    [step],
  );

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#172033]">
      <section className="min-h-screen border-b border-[#172033]/10 bg-[radial-gradient(circle_at_18%_12%,rgba(34,197,94,.13),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(14,165,233,.13),transparent_26%),linear-gradient(180deg,#fffaf2_0%,#f7f4ee_100%)]">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a className="flex items-center gap-3" href="#top" aria-label="Saarthi home">
            <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#172033] text-sm font-black text-[#d9f99d]">
              S
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.16em]">
                Saarthi
              </span>
              <span className="block text-xs text-[#647084]">voice web guide</span>
            </span>
          </a>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
            <a className="nav-link" href="#flow">
              Flow
            </a>
            <a className="nav-link" href="#embed">
              Embed
            </a>
            <a className="nav-link" href="/embed-test">
              Demo
            </a>
          </nav>

          <a className="icon-command" href="/embed-test">
            <Play size={17} aria-hidden="true" />
            <span>Open demo</span>
          </a>
        </header>

        <div
          id="top"
          className="mx-auto grid min-h-[calc(100vh-82px)] w-full max-w-7xl items-center gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[0.86fr_1.14fr]"
        >
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-[8px] border border-emerald-700/15 bg-white/70 px-3 py-2 text-sm font-bold text-emerald-900 shadow-sm">
              <BadgeCheck size={17} aria-hidden="true" />
              Single script tag. Real phone call. Live page context.
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-[#111827] sm:text-6xl lg:text-7xl">
              Saarthi
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#4b5565]">
              A voice assistant for people who get stuck on websites. They click the
              widget, get an ElevenLabs callback, hover over anything, and ask what it is.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a className="hero-action" href="/embed-test">
                <Compass size={18} aria-hidden="true" />
                <span>Try the live widget</span>
              </a>
              <a className="hero-action secondary" href="#embed">
                <Code2 size={18} aria-hidden="true" />
                <span>Get script tag</span>
              </a>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["3", "screenshots"],
                ["20s", "tool bridge"],
                ["0", "client secrets"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[8px] border border-[#172033]/10 bg-white/65 p-4 shadow-sm"
                >
                  <div className="text-2xl font-black text-[#172033]">{value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#6b7280]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="tool-shell">
              <div className="tool-topbar">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                  <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                </div>
                <span className="text-xs font-bold text-[#647084]">
                  saarthi active session
                </span>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
                <div className="relative min-h-[430px] overflow-hidden rounded-[8px] border border-[#172033]/10 bg-white">
                  <div
                    className="h-44 w-full bg-cover bg-center"
                    role="img"
                    aria-label="Laptop on a desk showing a web workflow"
                    style={{
                      backgroundImage:
                        "url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=78)",
                    }}
                  />
                  <div className="grid gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                          Billing page
                        </div>
                        <h2 className="mt-2 text-2xl font-black">Choose a plan</h2>
                      </div>
                      <span className="rounded-[8px] bg-[#fef3c7] px-3 py-2 text-xs font-black text-[#92400e]">
                        confused user
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Starter", "Team", "Enterprise"].map((plan, index) => (
                        <button
                          key={plan}
                          className={`min-h-28 rounded-[8px] border p-4 text-left transition ${
                            index === step % 3
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-[#172033]/10 bg-[#f8fafc]"
                          }`}
                          type="button"
                        >
                          <span className="block text-sm font-black">{plan}</span>
                          <span className="mt-2 block text-xs leading-5 text-[#647084]">
                            Website controls, account settings, and purchase steps.
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-[8px] border border-[#172033]/10 bg-[#f8fafc] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black">Payment method</span>
                        <button className="inline-flex items-center gap-2 rounded-[8px] bg-[#172033] px-3 py-2 text-sm font-black text-white">
                          <LockKeyhole size={15} aria-hidden="true" />
                          Continue
                        </button>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#dbe3ee]">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${38 + step * 15}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="pointer-events-none absolute grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-500 bg-white/50 text-emerald-700 shadow-[0_0_0_12px_rgba(34,197,94,.13)] transition-all duration-700"
                    style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                  >
                    <MousePointer2 size={20} aria-hidden="true" />
                  </div>
                </div>

                <aside className="grid content-start gap-3 rounded-[8px] border border-[#172033]/10 bg-[#172033] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black">Voice bridge</span>
                    <Radar className="text-[#d9f99d]" size={20} aria-hidden="true" />
                  </div>

                  {flow.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-[8px] border p-3 transition ${
                          index === step
                            ? "border-[#d9f99d]/50 bg-white/12"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white text-[#172033]">
                          <Icon className={item.tone} size={18} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-bold">{item.label}</span>
                      </div>
                    );
                  })}

                  <div className="mt-1 rounded-[8px] bg-[#f7f4ee] p-4 text-[#172033]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      <ActiveIcon size={15} aria-hidden="true" />
                      spoken back
                    </div>
                    <p className="mt-3 text-sm leading-6">{explanation}</p>
                  </div>

                  <div className="flex h-24 items-end gap-1 rounded-[8px] bg-white/7 px-3 py-4">
                    {bars.map((bar) => (
                      <span
                        key={bar.id}
                        className="flex-1 rounded-full bg-[#d9f99d] transition-all duration-500"
                        style={{ height: `${bar.height}%` }}
                      />
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="flow" className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-4">
        {[
          [PhoneCall, "Inbound flow", "The widget starts an ElevenLabs outbound callback from your configured phone agent."],
          [Eye, "Element context", "The browser captures viewport, local crops, and safe DOM metadata only when asked."],
          [Brain, "Vision reasoning", "OpenAI receives the images server-side and returns a short explanation for speech."],
          [Globe2, "Any website", "The embed is one public script tag with isolated styles and no client-side secrets."],
        ].map(([Icon, title, body]) => (
          <article key={String(title)} className="rounded-[8px] border border-[#172033]/10 bg-white p-5 shadow-sm">
            <Icon className="text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="mt-5 text-lg font-black">{title as string}</h2>
            <p className="mt-3 text-sm leading-6 text-[#586476]">{body as string}</p>
          </article>
        ))}
      </section>

      <section id="embed" className="border-y border-[#172033]/10 bg-[#172033] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[8px] bg-white/10 px-3 py-2 text-sm font-bold text-[#d9f99d]">
              <Sparkles size={17} aria-hidden="true" />
              Embed in seconds
            </div>
            <h2 className="mt-5 text-4xl font-black leading-tight">A website guide that calls back.</h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              Keep Saarthi on every page where users hesitate: checkout, onboarding,
              portals, dashboards, application forms, and support flows.
            </p>
            <div className="mt-6 flex gap-3">
              <a className="dark-action" href="/embed-test">
                <Mic2 size={18} aria-hidden="true" />
                <span>Launch demo</span>
              </a>
              <a className="dark-action muted" href="https://elevenlabs.io/docs/api-reference/twilio/outbound-call">
                <Waves size={18} aria-hidden="true" />
                <span>ElevenLabs API</span>
              </a>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/12 bg-[#0d1320] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-white/80">script tag</span>
              <button className="copy-button" type="button" onClick={copySnippet}>
                <Copy size={16} aria-hidden="true" />
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="overflow-x-auto rounded-[8px] bg-black/35 p-4 text-sm leading-7 text-[#d9f99d]">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#647084] sm:px-8 md:flex-row md:items-center md:justify-between">
        <span>Saarthi is MIT licensed and built for privacy-first voice assistance.</span>
        <a className="inline-flex items-center gap-2 font-black text-[#172033]" href="https://github.com/harsh-raj-singh/saarthi">
          <span>GitHub repo</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
