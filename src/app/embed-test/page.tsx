import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Saarthi Embed Demo",
  description: "A local page that embeds the Saarthi widget with a single script tag.",
};

export default function EmbedTestPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#172033]">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <Link className="mb-8 inline-flex w-fit items-center rounded-[8px] bg-white px-3 py-2 text-sm font-black shadow-sm" href="/">
            Saarthi demo
          </Link>
          <h1 className="text-5xl font-black leading-tight">A normal page with one script tag.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#586476]">
            Move your cursor over a control, open the Saarthi widget, and use the demo
            simulation button. In production the same request comes from an ElevenLabs
            phone call when the user asks, “What is this?”
          </p>
          <div className="mt-8 rounded-[8px] border border-[#172033]/10 bg-white p-4 shadow-sm">
            <code className="text-sm text-emerald-800">{`<script src="/widget.js" data-demo="true" async></script>`}</code>
          </div>
        </div>

        <div className="my-auto rounded-[8px] border border-[#172033]/10 bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#172033]/10 pb-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Acme Travel
              </div>
              <h2 className="mt-1 text-2xl font-black">Book your trip</h2>
            </div>
            <button className="rounded-[8px] bg-[#fef3c7] px-3 py-2 text-sm font-black text-[#92400e]" type="button">
              Need help?
            </button>
          </div>

          <div className="grid gap-5 py-5">
            <label>
              <span className="mb-2 block text-sm font-black">Destination</span>
              <input
                className="h-12 w-full rounded-[8px] border border-[#172033]/15 px-3 outline-none focus:border-emerald-500"
                placeholder="City or airport"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Flexible dates", "Direct flights", "Refundable"].map((label) => (
                <button
                  key={label}
                  className="rounded-[8px] border border-[#172033]/10 bg-[#f8fafc] px-4 py-4 text-left text-sm font-black transition hover:border-emerald-500 hover:bg-emerald-50"
                  type="button"
                  aria-label={label}
                >
                  {label}
                  <span className="mt-2 block text-xs font-medium leading-5 text-[#647084]">
                    Narrows the search before results appear.
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-[8px] border border-[#172033]/10 bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black">Traveler details</div>
                  <div className="mt-1 text-sm text-[#647084]">Add passenger names after selecting a fare.</div>
                </div>
                <button
                  className="rounded-[8px] bg-[#172033] px-4 py-3 text-sm font-black text-white"
                  type="button"
                  aria-label="Continue to traveler details"
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-black">Promo code</span>
                <input
                  className="h-12 w-full rounded-[8px] border border-[#172033]/15 px-3 outline-none focus:border-emerald-500"
                  placeholder="Optional"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-black">Email receipt</span>
                <input
                  className="h-12 w-full rounded-[8px] border border-[#172033]/15 px-3 outline-none focus:border-emerald-500"
                  placeholder="name@example.com"
                  type="email"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <script src="/widget.js" data-site-id="demo" data-demo="true" async />
    </main>
  );
}
