import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Hand, Megaphone } from "lucide-react";

type Step = {
  title: string;
  body: string;
  /** Element to spotlight; the first visible match wins. */
  selector?: string;
  /** When set, the step only completes once the user (or "Do it for me") clicks. */
  requireClick?: boolean;
  /** Auto-complete once the user reached this part of the site. */
  done?: (pathname: string) => boolean;
};

const CHANNEL_URL = "https://whatsapp.com/channel/0029VbCdTbF6buMEQY5wzG3y";

const STEPS: Step[] = [
  {
    title: "Step 1 — Tap LUO (or LUGANDA)",
    body: "Start here on the home page. Tap the highlighted LUO tab to open the library of Luo translated movies and series.",
    selector: '[data-tour="luo-tab"]',
    requireClick: true,
    done: (p) => p.startsWith("/luo") || p.startsWith("/luganda"),
  },
  {
    title: "Step 2 — Tap a movie poster",
    body: "Every translated movie our VJs upload lands in this grid, newest first. Tap the highlighted poster to open it.",
    selector: '[data-tour="first-poster"]',
    requireClick: true,
    done: (p) => /^\/(luo|luganda)\/.+/.test(p),
  },
  {
    title: "Step 3 — Press Play to watch",
    body: "Tap the player to start streaming the Luo/Luganda translation right here in your browser. Series show every season and episode under the player.",
    selector: '[data-tour="play"]',
    requireClick: true,
  },
  {
    title: "Step 4 — Tap Download to save it",
    body: "This is the Download button. Tap it, pick the quality, and the translated video saves to your phone so you can watch later without data.",
    selector: '[data-tour="download"]',
    requireClick: true,
  },
  {
    title: "Step 5 — Never miss a new translation",
    body: "Follow the LUOFILM WhatsApp channel — every new Luo and Luganda translation is posted there with its direct watch and download link.",
  },
];

const KEY = "luofilm-download-tour-v2";

type Saved = { step: number; active: boolean };

function readSaved(): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function findTarget(selector?: string): HTMLElement | null {
  if (!selector || typeof document === "undefined") return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    }) ?? null
  );
}

export function DownloadTour({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const controlled = open !== undefined;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [selfOpen, setSelfOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [clicked, setClicked] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const visible = controlled ? open : selfOpen;
  const current = STEPS[step];

  // Restore an in-progress tour (it runs across pages) or start it for
  // first-time visitors, always from the home page.
  useEffect(() => {
    if (controlled) return;
    const saved = readSaved();
    if (saved?.active) {
      setStep(Math.min(saved.step, STEPS.length - 1));
      setSelfOpen(true);
      return;
    }
    if (saved) return; // already finished/skipped
    const t = setTimeout(() => setSelfOpen(true), 900);
    return () => clearTimeout(t);
  }, [controlled]);

  useEffect(() => {
    if (controlled || typeof window === "undefined") return;
    if (selfOpen) localStorage.setItem(KEY, JSON.stringify({ step, active: true }));
  }, [controlled, selfOpen, step]);

  // Keep the spotlight glued to the target, even while content loads in.
  useEffect(() => {
    if (!visible) return;
    setClicked(false);
    const sync = () => {
      const el = findTarget(current?.selector);
      targetRef.current = el;
      setBox(el ? el.getBoundingClientRect() : null);
    };
    sync();
    const el = targetRef.current;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const id = window.setInterval(sync, 400);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [visible, step, current?.selector]);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  // Real clicks on the highlighted element move the tour forward.
  useEffect(() => {
    if (!visible || !current?.selector) return;
    const sel = current.selector;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest(sel)) {
        setClicked(true);
        window.setTimeout(() => next(), 600);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [visible, current?.selector, next]);

  // Reaching the right page also completes the step (e.g. after tapping LUO).
  useEffect(() => {
    if (!visible || !current?.done) return undefined;
    if (!current.done(pathname)) return undefined;
    const t = window.setTimeout(() => next(), 500);
    return () => window.clearTimeout(t);
  }, [visible, pathname, current, next]);

  const finish = () => {
    if (typeof window !== "undefined")
      localStorage.setItem(KEY, JSON.stringify({ step: 0, active: false }));
    setStep(0);
    setSelfOpen(false);
    onClose?.();
  };

  /** "Do it for me" — clicks exactly what the hand is pointing at. */
  const clickTarget = () => {
    const el = targetRef.current;
    if (!el) return next();
    setClicked(true);
    const video = el.querySelector("video");
    if (video) void (video as HTMLVideoElement).play().catch(() => {});
    el.click();
    window.setTimeout(() => next(), 700);
  };

  if (!visible || !current) return null;

  const hasTarget = !!box;
  const waiting = !!current.requireClick && hasTarget && !clicked;
  // Keep the card away from whatever is highlighted.
  const cardOnTop = hasTarget && box!.top + box!.height / 2 > window.innerHeight * 0.55;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {/* No dimming when there is nothing to highlight — the page must stay
          fully usable/clickable while the tour card is showing. */}

      {hasTarget && (
        <>
          <div
            className="absolute rounded-2xl ring-4 ring-brand transition-all duration-300"
            style={{
              top: box!.top - 6,
              left: box!.left - 6,
              width: box!.width + 12,
              height: box!.height + 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            }}
          />
          <div
            className="absolute rounded-2xl ring-2 ring-brand/60 pulse"
            style={{
              top: box!.top - 14,
              left: box!.left - 14,
              width: box!.width + 28,
              height: box!.height + 28,
            }}
          />
          {/* Animated hand pointing at exactly what to tap. */}
          <div
            className="absolute transition-all duration-300"
            style={{
              top: box!.top + box!.height - 6,
              left: Math.min(
                Math.max(box!.left + box!.width / 2 - 18, 8),
                window.innerWidth - 60,
              ),
            }}
          >
            <span className="relative grid size-11 animate-bounce place-items-center">
              <span className="absolute inset-0 rounded-full bg-brand/30 blur-md" />
              <Hand className="relative size-9 -rotate-12 fill-brand/90 text-brand-foreground drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
            </span>
          </div>
        </>
      )}

      <div
        role="dialog"
        aria-label="How to watch and download Luo translated movies"
        className={`pointer-events-auto absolute inset-x-4 mx-auto max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl ${
          cardOnTop ? "top-24" : "bottom-24"
        } lg:left-1/2 lg:right-auto lg:mx-0 lg:-translate-x-1/2 ${
          cardOnTop ? "lg:top-24" : "lg:bottom-10"
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-base font-black text-foreground">{current.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{current.body}</p>

        {step === STEPS.length - 1 && (
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-[13px] font-bold text-[#06301c]"
          >
            <Megaphone className="size-4" /> Follow WhatsApp channel
          </a>
        )}

        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-foreground/15"}`}
            />
          ))}
        </div>

        {waiting && (
          <p className="mt-3 text-[12px] font-semibold text-brand">
            Tap the highlighted spot to continue.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-3 py-2 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-full bg-foreground/10 px-4 py-2 text-[13px] font-bold text-foreground"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (step === STEPS.length - 1) return finish();
                if (waiting) return clickTarget();
                next();
              }}
              className="rounded-full bg-brand px-5 py-2 text-[13px] font-bold text-brand-foreground transition hover:brightness-110"
            >
              {step === STEPS.length - 1 ? "Got it" : waiting ? "Tap it for me" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
