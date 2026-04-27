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
    <div className="card p-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-slate-800">
        ${dollars}
      </div>
      <div className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wide">Estimated cost</div>
    </div>
  );
}
