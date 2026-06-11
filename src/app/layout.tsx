import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { DISCLAIMER } from "@/lib/types";

export const metadata: Metadata = {
  title: "World Cup Value Finder — Prediction Analytics & Value Bets",
  description:
    "Select a World Cup match, see prediction analytics from public data, and compare bookmaker odds to find potential value bets. Informational only — gamble responsibly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-black">⚽</span>
              <span>WC Value <span className="grad">Finder</span></span>
            </Link>
            <span className="hidden text-xs text-muted sm:block">Prediction analytics & value-bet detection</span>
          </div>
        </header>

        {children}

        <footer className="mt-16 border-t border-line bg-panel">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
            <div className="rounded-lg border border-warn/30 bg-warn/5 p-4 text-xs leading-relaxed text-muted">
              <strong className="text-warn">Disclaimer.</strong> {DISCLAIMER}
            </div>
            <p className="mt-4 text-[11px] text-muted">
              Data is aggregated from publicly accessible sources with attribution. We respect robots.txt, rate limits and site terms,
              and never bypass paywalls, logins, captchas or anti-bot systems. Predictions are estimates, not guarantees.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
