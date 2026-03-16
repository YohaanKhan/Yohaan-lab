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
  const minRaise = Math.max(currentBet + 10, 10);
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const callAmount = currentBet - playerBet;
  const canCheck = currentBet === playerBet;

  if (!isActive) {
    return (
      <div className="bctl-waiting">
        <span className="bctl-waiting-dot" aria-hidden />
        <span className="bctl-waiting-dot" aria-hidden />
        <span className="bctl-waiting-dot" aria-hidden />
        <p className="bctl-waiting-text">Waiting for your turn</p>
        <style>{waitingStyles}</style>
      </div>
    );
  }

  const quickRaises = [
    { label: "2×", value: Math.max(currentBet * 2, minRaise) },
    { label: "3×", value: Math.max(currentBet * 3, minRaise) },
    { label: "½ pot", value: Math.max(Math.floor(playerChips / 2), minRaise) },
    { label: "All in", value: playerChips + playerBet },
  ];

  return (
    <div className="bctl-root">
      <div className="bctl-header">
        <span className="bctl-turn-badge">YOUR TURN</span>
        <div className="bctl-pot-info">
          <span className="bctl-pot-label">to call</span>
          <span className="bctl-pot-val">${callAmount}</span>
        </div>
      </div>

      {/* Primary actions */}
      <div className="bctl-actions">
        <button
          onClick={() => onAction("fold")}
          className="bctl-btn bctl-btn--fold"
        >
          <span className="bctl-btn-icon">✗</span>
          Fold
        </button>

        {canCheck ? (
          <button
            onClick={() => onAction("check")}
            className="bctl-btn bctl-btn--check"
          >
            <span className="bctl-btn-icon">✓</span>
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction("call")}
            disabled={playerChips < callAmount}
            className="bctl-btn bctl-btn--call"
          >
            <span className="bctl-btn-icon">→</span>
            Call ${callAmount}
          </button>
        )}

        <button
          onClick={() => onAction("raise", raiseAmount)}
          disabled={playerChips < raiseAmount}
          className="bctl-btn bctl-btn--raise"
        >
          <span className="bctl-btn-icon">↑</span>
          Raise ${raiseAmount}
        </button>
      </div>

      {/* Quick raise chips */}
      <div className="bctl-quick">
        {quickRaises.map(q => (
          <button
            key={q.label}
            onClick={() => setRaiseAmount(Math.min(q.value, playerChips + playerBet))}
            className={`bctl-quick-btn ${raiseAmount === Math.min(q.value, playerChips + playerBet) ? "bctl-quick-btn--active" : ""}`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Raise slider */}
      <div className="bctl-slider-row">
        <input
          type="range"
          min={minRaise}
          max={playerChips + playerBet}
          step={10}
          value={raiseAmount}
          onChange={e => setRaiseAmount(Number(e.target.value))}
          className="bctl-slider"
        />
        <div className="bctl-slider-val">${raiseAmount.toLocaleString()}</div>
      </div>

      <style>{activeStyles}</style>
    </div>
  );
}

const waitingStyles = `
  .bctl-waiting {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 1rem 1.5rem;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
  }
  .bctl-waiting-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #7a9e7e;
    animation: bctl-dot-pulse 1.4s ease-in-out infinite;
  }
  .bctl-waiting-dot:nth-child(2) { animation-delay: 0.2s; }
  .bctl-waiting-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bctl-dot-pulse {
    0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  .bctl-waiting-text {
    font-family: 'Roboto', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7a9e7e;
    margin: 0;
  }
`;

const activeStyles = `
  .bctl-root {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(212,175,55,0.3);
    border-radius: 14px;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 30px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .bctl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .bctl-turn-badge {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #000;
    background: #d4af37;
    border: 1px solid #d4af37;
    padding: 3px 10px;
    border-radius: 4px;
    animation: bctl-badge-pulse 2s ease-in-out infinite;
  }
  @keyframes bctl-badge-pulse {
    0%,100% { opacity: 0.8; }
    50% { opacity: 1; }
  }
  .bctl-pot-info {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .bctl-pot-label {
    font-family: 'Roboto', sans-serif;
    font-size: 0.65rem;
    color: #7a9e7e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .bctl-pot-val {
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    color: #f5e6c0;
    font-weight: 700;
  }

  .bctl-actions {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1.4fr;
    gap: 0.5rem;
  }
  .bctl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0.8rem 0.6rem;
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 1px solid transparent;
    outline: none;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .bctl-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .bctl-btn-icon {
    font-size: 0.9rem;
    font-style: normal;
    font-family: monospace;
  }
  .bctl-btn--fold {
    background: #6b1a1a;
    border-color: rgba(255,255,255,0.1);
    color: #f8b8b8;
    box-shadow: 0 4px 0 #4a1111;
  }
  .bctl-btn--fold:hover {
    background: #7e2121;
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #4a1111;
  }
  .bctl-btn--fold:active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #4a1111;
  }
  .bctl-btn--check, .bctl-btn--call {
    background: #0d2e1c;
    border-color: rgba(122,196,135,0.2);
    color: #7ac487;
    box-shadow: 0 4px 0 #06180e;
  }
  .bctl-btn--check:hover, .bctl-btn--call:not(:disabled):hover {
    background: #144229;
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #06180e;
  }
  .bctl-btn--check:active, .bctl-btn--call:not(:disabled):active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #06180e;
  }
  .bctl-btn--raise {
    background: linear-gradient(135deg, #d4af37, #b8922a);
    border-color: rgba(0,0,0,0.2);
    color: #1a0f00;
    box-shadow: 0 4px 0 #8a6a10;
  }
  .bctl-btn--raise:not(:disabled):hover {
    background: linear-gradient(135deg, #e5c158, #d4af37);
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #8a6a10, 0 0 20px rgba(212,175,55,0.3);
  }
  .bctl-btn--raise:not(:disabled):active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #8a6a10;
  }

  .bctl-quick {
    display: flex;
    gap: 6px;
  }
  .bctl-quick-btn {
    flex: 1;
    padding: 4px 0;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.05em;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #a0b8a4;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .bctl-quick-btn:hover {
    border-color: rgba(212,175,55,0.35);
    color: #d4af37;
  }
  .bctl-quick-btn--active {
    background: rgba(212,175,55,0.1);
    border-color: rgba(212,175,55,0.45);
    color: #d4af37;
  }

  .bctl-slider-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .bctl-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 3px;
    border-radius: 3px;
    background: rgba(212,175,55,0.2);
    outline: none;
    cursor: pointer;
  }
  .bctl-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #d4af37;
    border: 2px solid #0d2b1a;
    box-shadow: 0 0 6px rgba(212,175,55,0.5);
    cursor: grab;
  }
  .bctl-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #d4af37;
    border: 2px solid #0d2b1a;
    cursor: grab;
  }
  .bctl-slider-val {
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #d4af37;
    font-weight: 700;
    min-width: 64px;
    text-align: right;
  }
`;