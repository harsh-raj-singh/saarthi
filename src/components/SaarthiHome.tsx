"use client";

import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Code2,
  Compass,
  Copy,
  Globe2,
  Mic2,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const flow = [
  { label: "Widget mic", detail: "Records a short browser voice turn.", icon: Mic2, tone: "text-emerald-700" },
  { label: "OpenAI ASR", detail: "Transcribes English, Hindi, or Hinglish.", icon: Waves, tone: "text-cyan-700" },
  { label: "OpenAI mini", detail: "The backend reasons over page context.", icon: Brain, tone: "text-violet-700" },
  { label: "OpenAI TTS", detail: "Speaks the answer back naturally.", icon: Volume2, tone: "text-rose-700" },
];

const sampleExplanations = [
  "That button takes you to traveler details. Press it only after the trip options look right.",
  "This field is for a destination, like a city or airport. You can type the place you want to visit.",
  "That filter narrows the page. Turn it on if you only want flexible choices.",
  "This looks like the next step. Review the details above it first, then continue.",
];

const snippet = `<script
  src="https://your-domain.com/widget.js"
  data-site-id="your_site_id"
  async
></script>`;

export function SaarthiHome() {
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState({ x: 70, y: 54 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((value) => (value + 1) % flow.length);
      setCursor((value) => ({
        x: value.x > 68 ? 30 : value.x + 16,
        y: value.y > 58 ? 34 : value.y + 10,
      }));
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  const ActiveIcon = flow[step].icon;
  const explanation = sampleExplanations[step];

  const bars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        id: index,
        height: 20 + ((index * 13 + step * 19) % 64),
      })),
    [step],
  );

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <section className="border-b border-[#172033]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fb_100%)]">
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
            <a className="nav-link" href="#cost">
              Cost
            </a>
            <a className="nav-link" href="#embed">
              Embed
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
            <div className="mb-6 inline-flex items-center gap-2 rounded-[8px] border border-emerald-700/15 bg-white px-3 py-2 text-sm font-bold text-emerald-900 shadow-sm">
              <BadgeCheck size={17} aria-hidden="true" />
              Single script tag. In-page voice. No phone provider.
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-[#111827] sm:text-6xl lg:text-7xl">
              Saarthi
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#4b5565]">
              A voice assistant for people who get stuck on websites. They press a
              floating mic, ask what something means, and hear a simple answer without
              leaving the page.
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
                ["0", "call providers"],
                ["2", "languages"],
                ["1", "script tag"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[8px] border border-[#172033]/10 bg-white p-4 shadow-sm"
                >
                  <div className="text-2xl font-black text-[#172033]">{value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#6b7280]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-shell">
            <div className="tool-topbar">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
              </div>
              <span className="text-xs font-bold text-[#647084]">saarthi live page</span>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_270px]">
              <div className="relative min-h-[460px] overflow-hidden rounded-[8px] border border-[#172033]/10 bg-white">
                <div
                  className="h-44 w-full bg-cover bg-center"
                  role="img"
                  aria-label="Person using a laptop with a website workflow"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=78)",
                  }}
                />
                <div className="grid gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                        Travel checkout
                      </div>
                      <h2 className="mt-2 text-2xl font-black">Book your trip</h2>
                    </div>
                    <span className="rounded-[8px] bg-[#ecfeff] px-3 py-2 text-xs font-black text-[#155e75]">
                      voice help on
                    </span>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black">Destination</span>
                    <input
                      className="h-12 w-full rounded-[8px] border border-[#172033]/15 px-3 outline-none"
                      placeholder="City or airport"
                      readOnly
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {["Flexible dates", "Direct flights", "Refundable"].map((label, index) => (
                      <button
                        key={label}
                        className={`min-h-28 rounded-[8px] border p-4 text-left transition ${
                          index === step % 3
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-[#172033]/10 bg-[#f8fafc]"
                        }`}
                        type="button"
                      >
                        <span className="block text-sm font-black">{label}</span>
                        <span className="mt-2 block text-xs leading-5 text-[#647084]">
                          Narrows the search before results appear.
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[8px] border border-[#172033]/10 bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-black">Traveler details</span>
                      <button className="inline-flex items-center gap-2 rounded-[8px] bg-[#172033] px-3 py-2 text-sm font-black text-white">
                        Continue
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-500 bg-white/70 text-emerald-700 shadow-[0_0_0_12px_rgba(34,197,94,.13)] transition-all duration-700"
                  style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                >
                  <MousePointer2 size={20} aria-hidden="true" />
                </div>
              </div>

              <aside className="grid content-start gap-3 rounded-[8px] border border-[#172033]/10 bg-[#172033] p-4 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Voice loop</span>
                  <ActiveIcon className={flow[step].tone} size={20} aria-hidden="true" />
                </div>

                {flow.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`rounded-[8px] border p-3 transition ${
                        index === step
                          ? "border-[#d9f99d]/50 bg-white/12"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white text-[#172033]">
                          <Icon className={item.tone} size={18} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-bold">{item.label}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/65">{item.detail}</p>
                    </div>
                  );
                })}

                <div className="mt-1 rounded-[8px] bg-[#f6f8fb] p-4 text-[#172033]">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    <Sparkles size={15} aria-hidden="true" />
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
      </section>

      <section id="flow" className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-4">
        {[
          [Mic2, "In-page voice", "The user presses the floating mic and speaks directly inside the website."],
          [Waves, "OpenAI speech", "OpenAI handles transcription and spoken audio, so there is no local model warmup."],
          [Brain, "Plain guidance", "OpenAI uses the transcript plus safe page context to explain or verbally navigate."],
          [Globe2, "Reusable embed", "The public widget is isolated in Shadow DOM and works from one script tag."],
        ].map(([Icon, title, body]) => (
          <article key={String(title)} className="rounded-[8px] border border-[#172033]/10 bg-white p-5 shadow-sm">
            <Icon className="text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="mt-5 text-lg font-black">{title as string}</h2>
            <p className="mt-3 text-sm leading-6 text-[#586476]">{body as string}</p>
          </article>
        ))}
      </section>

      <section id="cost" className="border-y border-[#172033]/10 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[8px] bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
              <ShieldCheck size={17} aria-hidden="true" />
              Simple production shape
            </div>
            <h2 className="mt-5 text-4xl font-black leading-tight">One website backend. No voice worker.</h2>
            <p className="mt-4 text-base leading-7 text-[#586476]">
              The Next.js app serves the website, widget, and the complete OpenAI voice
              request. Transcription, reasoning, and speech all run through the same
              OpenAI API key, so local model setup disappears.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["No Twilio", "No phone numbers, calls, or telecom compliance for this version."],
              ["No workers", "No Parakeet, Piper, Python service, model download, or CPU warmup."],
              ["Paid OpenAI", "You only pay for OpenAI transcription, reasoning, and speech."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[8px] border border-[#172033]/10 bg-[#f8fafc] p-5">
                <h3 className="text-base font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#586476]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="embed" className="bg-[#172033] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[8px] bg-white/10 px-3 py-2 text-sm font-bold text-[#d9f99d]">
              <Sparkles size={17} aria-hidden="true" />
              Embed in seconds
            </div>
            <h2 className="mt-5 text-4xl font-black leading-tight">Add Saarthi to any site you control.</h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              Put the script before the closing body tag. The widget records short voice
              turns, sends safe page context to your backend, and plays the answer back.
            </p>
            <div className="mt-6 flex gap-3">
              <a className="dark-action" href="/embed-test">
                <Mic2 size={18} aria-hidden="true" />
                <span>Launch demo</span>
              </a>
              <a className="dark-action muted" href="https://github.com/harsh-raj-singh/saarthi">
                <ArrowRight size={18} aria-hidden="true" />
                <span>GitHub</span>
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
