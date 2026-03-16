"use client";

import { useState } from "react";
import { pokerCreateRoom, pokerJoinRoom } from "@/lib/api";
import type { LobbyProps } from "./Lobby.types";

export function Lobby({ playerId, username }: LobbyProps) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const { room_code } = await pokerCreateRoom(playerId, username);
      window.location.href = `/poker/${room_code}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!roomCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await pokerJoinRoom(roomCode.toUpperCase(), playerId, username);
      window.location.href = `/poker/${roomCode.toUpperCase()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lobby-root">
      {/* Felt texture overlay */}
      <div className="felt-overlay" aria-hidden />

      {/* Card suit decorations */}
      <div className="suit-deco suit-deco--tl" aria-hidden>♠</div>
      <div className="suit-deco suit-deco--tr" aria-hidden>♥</div>
      <div className="suit-deco suit-deco--bl" aria-hidden>♣</div>
      <div className="suit-deco suit-deco--br" aria-hidden>♦</div>

      <div className="lobby-inner">
        {/* Logo / title */}
        <div className="lobby-header">
          <div className="lobby-crown" aria-hidden>♛</div>
          <h1 className="lobby-title">Nah I'd Gamble</h1>
          <p className="lobby-sub">Texas Hold'em · Private Rooms</p>
          <div className="lobby-divider" />
        </div>

        {/* Cards */}
        <div className="lobby-cards">
          {/* Create */}
          <div className="lobby-card">
            <span className="lobby-card-label">New game</span>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn btn--primary"
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <span className="btn-icon">♠</span>
                  Create room
                </>
              )}
            </button>
          </div>

          {/* Join */}
          <div className="lobby-card">
            <span className="lobby-card-label">Join existing room</span>
            <div className="code-input-wrap">
              <input
                type="text"
                placeholder="ABCD"
                value={roomCode}
                maxLength={4}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                className="code-input"
                spellCheck={false}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading || !roomCode.trim()}
              className="btn btn--secondary"
            >
              {loading ? <span className="btn-spinner" /> : "Join room"}
            </button>
          </div>
        </div>

        {error && (
          <p className="lobby-error">{error}</p>
        )}

        <div className="lobby-lb-wrap">
          <a href="/poker/leaderboard" className="lobby-lb-btn">
            🏆 Hall of Fame
          </a>
        </div>
      </div>

      <style>{`
        .lobby-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d2b1a;
          position: relative;
          overflow: hidden;
          font-family: 'Georgia', serif;
        }
        .felt-overlay {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 40%, #17422a 0%, #0a1f12 70%),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.012) 2px,
              rgba(255,255,255,0.012) 4px
            );
          pointer-events: none;
        }
        .suit-deco {
          position: absolute;
          font-size: 9rem;
          opacity: 0.04;
          user-select: none;
          pointer-events: none;
          line-height: 1;
        }
        .suit-deco--tl { top: 1.5rem; left: 2rem; }
        .suit-deco--tr { top: 1.5rem; right: 2rem; color: #c0392b; }
        .suit-deco--bl { bottom: 1.5rem; left: 2rem; }
        .suit-deco--br { bottom: 1.5rem; right: 2rem; color: #c0392b; }

        .lobby-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 0 1.5rem;
        }
        .lobby-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .lobby-crown {
          font-size: 2.2rem;
          color: #d4af37;
          margin-bottom: 0.4rem;
          display: block;
          filter: drop-shadow(0 0 12px rgba(212,175,55,0.5));
        }
        .lobby-title {
          font-size: 2.6rem;
          font-weight: 700;
          color: #f5e6c0;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-shadow: 0 2px 20px rgba(212,175,55,0.25);
          margin: 0 0 0.35rem;
        }
        .lobby-sub {
          font-family: 'Courier New', monospace;
          font-size: 0.72rem;
          color: #7a9e7e;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 1.4rem;
        }
        .lobby-divider {
          width: 60px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
          margin: 0 auto;
        }

        .lobby-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .lobby-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(212,175,55,0.2);
          border-radius: 12px;
          padding: 1.4rem 1.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          backdrop-filter: blur(8px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 4px 24px rgba(0,0,0,0.35);
        }
        .lobby-card-label {
          font-family: 'Courier New', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #7a9e7e;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          font-family: 'Georgia', serif;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.18s ease;
          border: none;
          outline: none;
        }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn--primary {
          background: linear-gradient(135deg, #d4af37 0%, #b8922a 100%);
          color: #1a0f00;
          box-shadow: 0 2px 12px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .btn--primary:not(:disabled):hover {
          background: linear-gradient(135deg, #e2c04a 0%, #c9a033 100%);
          box-shadow: 0 4px 20px rgba(212,175,55,0.45);
          transform: translateY(-1px);
        }
        .btn--primary:not(:disabled):active { transform: translateY(0); }
        .btn--secondary {
          background: transparent;
          color: #f5e6c0;
          border: 1px solid rgba(212,175,55,0.35);
        }
        .btn--secondary:not(:disabled):hover {
          background: rgba(212,175,55,0.08);
          border-color: rgba(212,175,55,0.6);
        }
        .btn-icon { font-size: 1rem; }
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .code-input-wrap {
          position: relative;
        }
        .code-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(212,175,55,0.25);
          border-radius: 8px;
          color: #f5e6c0;
          font-family: 'Courier New', monospace;
          font-size: 1.4rem;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          text-align: center;
          outline: none;
          transition: border-color 0.15s;
        }
        .code-input::placeholder {
          color: rgba(245,230,192,0.2);
          letter-spacing: 0.5em;
        }
        .code-input:focus {
          border-color: rgba(212,175,55,0.6);
          box-shadow: 0 0 0 3px rgba(212,175,55,0.1);
        }

        .lobby-error {
          margin-top: 1rem;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #e07070;
          letter-spacing: 0.04em;
        }
        .lobby-lb-wrap {
          margin-top: 1.75rem;
          text-align: center;
        }
        .lobby-lb-btn {
          display: inline-block;
          font-family: 'Courier New', monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #d4af37;
          text-decoration: none;
          padding: 0.55rem 1.4rem;
          border: 1px solid rgba(212,175,55,0.3);
          border-radius: 20px;
          background: rgba(212,175,55,0.06);
          transition: all 0.18s ease;
        }
        .lobby-lb-btn:hover {
          background: rgba(212,175,55,0.14);
          border-color: rgba(212,175,55,0.65);
          box-shadow: 0 0 14px rgba(212,175,55,0.2);
          color: #f5e6c0;
        }
      `}</style>
    </main>
  );
}