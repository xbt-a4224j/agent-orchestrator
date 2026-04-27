"use client";

import { useEffect, useRef, useState } from "react";

interface CostTickerProps {
  targetCents: number;
}

export default function CostTicker({ targetCents }: CostTickerProps) {
  const [displayCents, setDisplayCents] = useState(0);
  const rafRef = useRef<number | null>(null);
  const currentRef = useRef(0);

  useEffect(() => {
    const target = targetCents;

    function tick() {
      const diff = target - currentRef.current;
      if (Math.abs(diff) < 0.5) {
        currentRef.current = target;
        setDisplayCents(target);
        return;
      }
      currentRef.current += diff * 0.15;
      setDisplayCents(Math.round(currentRef.current));
      rafRef.current = requestAnimationFrame(tick);
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [targetCents]);

  const dollars = (displayCents / 100).toFixed(4);

  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-4 text-center overflow-hidden">
      {/* subtle rotating gradient border animation */}
      <div className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, #bfdbfe, transparent)",
          animation: "shimmer 2s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
      <div className="relative">
        <div className="text-lg font-mono tabular-nums text-slate-300">
          ${dollars}
        </div>
        <div className="text-xs text-slate-300 mt-1 uppercase tracking-wide">cost</div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
