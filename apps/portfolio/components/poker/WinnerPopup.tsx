"use client";

import { useEffect, useState } from "react";
import { PlayingCard } from "./PlayingCard";
import type { GameState } from "./GameTable.types";

type WinnerPopupProps = {
  gameState: GameState;
  onClose: () => void;
};

export function WinnerPopup({ gameState, onClose }: WinnerPopupProps) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onClose]);

  if (gameState.winners.length === 0) return null;

  return (
    <div className="wp-overlay">
      <div className="wp-modal">
        <div className="wp-header">
          <span className="wp-crown">♛</span>
          <h2 className="wp-title">
            {gameState.winners.length > 1 ? "Pot Split!" : "Hand Winner!"}
          </h2>
        </div>

        <div className="wp-winners">
          {gameState.winners.map(id => {
            const player = gameState.players[id];
            const summary = gameState.hand_summaries?.[id];
            return (
              <div key={id} className="wp-winner-card">
                <div className="wp-winner-info">
                  <div className="wp-avatar">{player?.username[0]?.toUpperCase()}</div>
                  <div className="wp-name-box">
                    <span className="wp-name">{player?.username}</span>
                    <span className="wp-hand-class">{summary?.hand_class || "Winning Hand"}</span>
                  </div>
                </div>
                <div className="wp-cards">
                  {summary?.hole_cards?.map((card, i) => (
                    <PlayingCard key={i} card={card} size="sm" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button className="wp-close-btn" onClick={onClose}>
          Continue ({countdown})
        </button>
      </div>

      <style>{`
        .wp-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: wp-fade-in 0.3s ease-out;
        }

        @keyframes wp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wp-modal {
          background: #0c1a11;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 24px;
          padding: 2.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212,175,55,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          animation: wp-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes wp-pop-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .wp-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .wp-crown {
          font-size: 3rem;
          color: #d4af37;
          filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.4));
        }

        .wp-title {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #f5e6c0;
          margin: 0;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .wp-winners {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .wp-winner-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .wp-winner-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .wp-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e5a32, #0d2b1a);
          border: 1px solid #d4af37;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          color: #d4af37;
        }

        .wp-name-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wp-name {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #f5e6c0;
        }

        .wp-hand-class {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #7a9e7e;
          letter-spacing: 0.05em;
        }

        .wp-cards {
          display: flex;
          gap: 6px;
        }

        .wp-close-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #d4af37 0%, #b8922a 100%);
          color: #1a0f00;
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.25);
        }

        .wp-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4);
        }

        .wp-close-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
