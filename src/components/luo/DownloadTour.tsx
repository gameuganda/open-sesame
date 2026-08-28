import { useEffect, useState } from "react";

type Step = {
  title: string;
  body: string;
  /** Optional element to spotlight; falls back to a centred card. */
  selector?: string;
};

const STEPS: Step[] = [
  {
    title: "Step 1 — Open the Luo or Luganda library",
    body: "Tap the LUO tab (or LUGANDA) in the bottom bar. Every translated movie and series our VJs upload lands here, newest first.",
    selector: '[data-tour="luo-tab"]',
  },
  {
    title: "Step 2 — Tap the movie poster",
    body: "Tap any poster in the grid to open that movie's page. Series show every season and episode under the player.",
    selector: '[data-tour="first-poster"]',
  },
  {
    title: "Step 3 — Press Play to watch",
    body: "On the movie page press the big Play button to stream the Luo/Luganda translation straight in the browser.",
  },
  {
    title: "Step 4 — Press Download to save it",
    body: "Right next to Play is the Download button. Tap it, choose the quality, and the translated video saves to your phone so you can watch later without data.",
  },
  {
    title: "Step 5 — Never miss a new translation",
    body: "Follow the LUOFILM WhatsApp channel — every new Luo and Luganda translation is posted there with its direct watch and download link.",
  },
];

const KEY = "luofilm-download-tour-v1";

export function DownloadTour({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const controlled = open !== undefined;
  const [selfOpen, setSelfOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);

  const visible = controlled ? open : selfOpen;

  // First-time visitors get the walkthrough automatically.
  useEffect(() => {
    if (controlled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setSelfOpen(true), 700);
    return () => clearTimeout(t);
  }, [controlled]);

  const current = STEPS[step];

  useEffect(() => {
    if (!visible) return;
    const sel = current?.selector;
    if (!sel) {
      setBox(null);
      return;
    }
    const el = document.querySelector(sel);
    if (!el) {
      setBox(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setBox(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [visible, step, current?.selector]);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
    setStep(0);
    setSelfOpen(false);
    onClose?.();
  };

  if (!visible || !current) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      {box && (
        <div
          className="pointer-events-none absolute rounded-2xl ring-4 ring-brand transition-all duration-300"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      )}

      <div
        role="dialog"
        aria-label="How to download Luo translated movies"
        className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-base font-black text-foreground">{current.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-foreground/15"}`}
            />
          ))}
        </div>

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
              onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
              className="rounded-full bg-brand px-5 py-2 text-[13px] font-bold text-brand-foreground transition hover:brightness-110"
            >
              {step === STEPS.length - 1 ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
