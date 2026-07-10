import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStats } from "@/lib/petition.functions";
import { useLang } from "@/i18n/context";
import { cn } from "@/lib/utils";

type Props = {
  orientation?: "vertical" | "horizontal" | "circular";
  className?: string;
};

function Lamp({ pct, size }: { pct: number; size: number }) {
  // Flame grows from a small ember to a full jyoti as the petition fills.
  const flameScale = 0.35 + (pct / 100) * 0.95;
  const glowOpacity = 0.25 + (pct / 100) * 0.7;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent blur-2xl animate-glow pointer-events-none"
        style={{ width: size * 1.1, height: size * 1.1, opacity: glowOpacity }}
        aria-hidden
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative"
        aria-hidden
      >
        <defs>
          <linearGradient id="lamp-flame" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="60%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="lamp-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {/* Flame */}
        <g
          style={{
            transformOrigin: "32px 30px",
            transform: `scale(${flameScale})`,
            transition: "transform 800ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <path
            d="M32 6 C 26 16 22 22 22 28 a10 10 0 0 0 20 0 c 0 -6 -4 -12 -10 -22 Z"
            fill="url(#lamp-flame)"
          />
          <ellipse cx="32" cy="26" rx="3" ry="6" fill="var(--background)" opacity="0.55" />
        </g>
        {/* Wick */}
        <rect x="31" y="34" width="2" height="6" rx="1" fill="var(--foreground)" opacity="0.6" />
        {/* Diya body */}
        <path
          d="M6 42 Q32 34 58 42 L52 54 Q32 60 12 54 Z"
          fill="url(#lamp-body)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <path
          d="M6 42 Q32 46 58 42"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.7"
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
}

export function SignatureProgressLamp({ orientation = "vertical", className }: Props) {
  const { lang } = useLang();
  const fetchStats = useServerFn(getStats);
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });
  const total = data?.total ?? 0;
  const goal = data?.goal ?? 100000;
  const pct = Math.min(100, Math.round((total / Math.max(goal, 1)) * 100));
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const eyebrow = lang === "ta" ? "ஒளி ஏற்றப்படுகிறது" : "Lighting the jyoti";
  const goalLabel = lang === "ta" ? "இலக்கு" : "Goal";
  const signedLabel = lang === "ta" ? "கையொப்பங்கள்" : "signatures";

  const bar = (
    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
        style={{ width: `${Math.max(pct, 1)}%` }}
      />
    </div>
  );

  if (orientation === "horizontal") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm px-3 py-2 flex items-center gap-3",
          className,
        )}
        aria-label={eyebrow}
      >
        <Lamp pct={pct} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent truncate">
              {eyebrow}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {pct}%
            </span>
          </div>
          <div className="mt-1 text-sm font-display font-bold text-foreground leading-tight truncate">
            {total.toLocaleString(locale)}
            <span className="text-muted-foreground font-mono text-[10px] font-normal ml-1">
              / {goal.toLocaleString(locale)} {signedLabel}
            </span>
          </div>
          <div className="mt-1">{bar}</div>
        </div>
      </div>
    );
  }

  if (orientation === "circular") {
    const ringSize = 220;
    const stroke = 10;
    const radius = (ringSize - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - pct / 100);
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm p-4 aspect-square flex flex-col items-center justify-center gap-3",
          className,
        )}
        aria-label={eyebrow}
      >
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent text-center">
          {eyebrow}
        </div>
        <div className="relative" style={{ width: ringSize, height: ringSize, maxWidth: "100%" }}>
          <svg
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="absolute inset-0 w-full h-full -rotate-90"
            aria-hidden
          >
            <defs>
              <linearGradient id="lamp-ring" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth={stroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#lamp-ring)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <Lamp pct={pct} size={Math.round(ringSize * 0.45)} />
            <div className="text-xl font-display font-bold text-foreground leading-none">
              {total.toLocaleString(locale)}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {pct}%
            </div>
          </div>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground text-center">
          {goalLabel} {goal.toLocaleString(locale)} {signedLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm p-4",
        className,
      )}
      aria-label={eyebrow}
    >
      <div className="flex items-center gap-3">
        <Lamp pct={pct} size={64} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent truncate">
            {eyebrow}
          </div>
          <div className="mt-1 text-2xl font-display font-bold text-foreground leading-none">
            {total.toLocaleString(locale)}
          </div>
          <div className="mt-1 text-[11px] font-mono text-muted-foreground truncate">
            {goalLabel} {goal.toLocaleString(locale)} · {pct}%
          </div>
        </div>
      </div>
      <div className="mt-3">{bar}</div>
    </div>
  );
}