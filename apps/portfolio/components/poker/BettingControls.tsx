"use client";

import { useState } from "react";

type Props = {
  currentBet: number;
  playerBet: number;
  playerChips: number;
  isActive: boolean;
  onAction: (action: string, amount?: number) => void;
};

export function BettingControls({
  currentBet,
  playerBet,
  playerChips,
  isActive,
  onAction,
}: Props) {
  const [raiseAmount, setRaiseAmount] = useState(currentBet * 2);
  const callAmount = currentBet - playerBet;
  const canCheck = currentBet === playerBet;

  if (!isActive) {
    return (
      <div className="p-4 rounded-lg border border-border bg-surface">
        <p className="font-mono text-xs text-muted text-center">
          Waiting for your turn...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-surface flex flex-col gap-3">
      <p className="font-mono text-xs text-muted">Your action</p>

      <div className="flex gap-2">
        <button
          onClick={() => onAction("fold")}
          className="flex-1 py-2 rounded-md border border-border text-muted font-sans text-sm hover:border-red-400 hover:text-red-400 transition-colors duration-200"
        >
          Fold
        </button>

        {canCheck ? (
          <button
            onClick={() => onAction("check")}
            className="flex-1 py-2 rounded-md border border-border text-primary font-sans text-sm hover:border-accent transition-colors duration-200"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction("call")}
            disabled={playerChips < callAmount}
            className="flex-1 py-2 rounded-md border border-border text-primary font-sans text-sm hover:border-accent transition-colors duration-200 disabled:opacity-50"
          >
            Call ${callAmount}
          </button>
        )}

        <button
          onClick={() => onAction("raise", raiseAmount)}
          disabled={playerChips < raiseAmount}
          className="flex-1 py-2 rounded-md bg-accent text-white font-sans text-sm hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
        >
          Raise
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={currentBet * 2}
          max={playerChips + playerBet}
          step={10}
          value={raiseAmount}
          onChange={e => setRaiseAmount(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono text-xs text-primary min-w-12">
          ${raiseAmount}
        </span>
      </div>
    </div>
  );
}