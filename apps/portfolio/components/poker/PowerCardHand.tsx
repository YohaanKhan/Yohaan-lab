"use client";

import { useState } from "react";
import type { PowerCard } from "./GameTable.types";

type Props = {
  cards: PowerCard[];
  momentum: number;
  onActivate: (cardId: string, targets: Record<string, unknown>) => void;
  disabled: boolean;
};

const TIER_STYLES: Record<string, string> = {
  rare: "border-teal-800 bg-teal-950",
  epic: "border-blue-800 bg-blue-950",
  mythic: "border-purple-800 bg-purple-950",
  legendary: "border-amber-800 bg-amber-950",
  ultra: "border-red-800 bg-red-950",
};

const TIER_TEXT: Record<string, string> = {
  rare: "text-teal-400",
  epic: "text-blue-400",
  mythic: "text-purple-400",
  legendary: "text-amber-400",
  ultra: "text-red-400",
};

export function PowerCardHand({ cards, momentum, onActivate, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(cardId: string) {
    if (disabled) return;
    setSelected(prev => prev === cardId ? null : cardId);
  }

  function handleActivate(card: PowerCard) {
    if (momentum < card.cost) return;
    // For now activate with empty targets — target selection UI comes later
    onActivate(card.id, {});
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs text-muted">
        Power cards · <span className="text-primary">{momentum}</span> momentum
      </p>

      <div className="flex gap-3 flex-wrap">
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => handleSelect(card.id)}
            className={`w-36 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
              TIER_STYLES[card.tier]
            } ${selected === card.id ? "scale-105" : "hover:scale-102"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-mono text-xs font-medium ${TIER_TEXT[card.tier]}`}>
                {card.tier}
              </span>
              <span className={`font-mono text-xs ${
                momentum >= card.cost ? "text-primary" : "text-red-400"
              }`}>
                ⚡{card.cost}
              </span>
            </div>

            <p className="font-sans text-xs font-medium text-primary mb-1">
              {card.name}
            </p>
            <p className="font-mono text-xs text-muted leading-relaxed">
              {card.desc}
            </p>

            {selected === card.id && (
              <button
                onClick={e => { e.stopPropagation(); handleActivate(card); }}
                disabled={momentum < card.cost}
                className="mt-2 w-full py-1 rounded-sm font-mono text-xs border border-accent text-accent hover:bg-accent hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Activate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}