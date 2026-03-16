"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CoinBurstProps = {
  x: number;  // page X of burst origin
  y: number;  // page Y of burst origin
  onDone: () => void;
};

const COINS = 14;
const DURATION = 900; // ms

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function CoinBurst({ x, y, onDone }: CoinBurstProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(onDone, DURATION + 100);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!mounted) return null;

  const coins = Array.from({ length: COINS }, (_, i) => {
    const angle = (i / COINS) * 360;
    const distance = randomBetween(55, 110);
    const dx = Math.cos((angle * Math.PI) / 180) * distance;
    const dy = Math.sin((angle * Math.PI) / 180) * distance - 30;
    const delay = randomBetween(0, 80);
    const size = randomBetween(12, 20);
    return { dx, dy, delay, size, angle };
  });

  const el = (
    <>
      <style>{`
        @keyframes coin-fly {
          0%   { transform: translate(0,0) scale(1)    rotate(0deg);  opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.5) rotate(360deg); opacity: 0; }
        }
        .coin-particle {
          position: fixed;
          left: var(--ox);
          top:  var(--oy);
          width: var(--sz);
          height: var(--sz);
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ffe569, #d4af37 55%, #8a6910);
          box-shadow: 0 0 6px rgba(212,175,55,0.8), inset 0 1px 0 rgba(255,255,255,0.5);
          pointer-events: none;
          z-index: 9999;
          animation: coin-fly var(--dur)ms var(--delay)ms cubic-bezier(.22,1,.36,1) forwards;
        }
      `}</style>
      {coins.map((c, i) => (
        <div
          key={i}
          className="coin-particle"
          style={{
            // @ts-expect-error – CSS custom properties
            "--ox": `${x}px`,
            "--oy": `${y}px`,
            "--dx": `${c.dx}px`,
            "--dy": `${c.dy}px`,
            "--dur": DURATION,
            "--delay": c.delay,
            "--sz": `${c.size}px`,
            marginLeft: `-${c.size / 2}px`,
            marginTop: `-${c.size / 2}px`,
          }}
        />
      ))}
    </>
  );

  return createPortal(el, document.body);
}
