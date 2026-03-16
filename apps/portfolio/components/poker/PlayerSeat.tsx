import type { PlayerState } from "./GameTable.types";
import { PlayingCard } from "./PlayingCard";

type Props = {
  player: PlayerState;
  isActive: boolean;
  isSelf: boolean;
};

export function PlayerSeat({ player, isActive, isSelf }: Props) {
  const seatClass = [
    "player-seat",
    player.folded ? "player-seat--folded" : "",
    isActive ? "player-seat--active" : "",
    isSelf ? "player-seat--self" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={seatClass}>
      {isActive && <div className="active-glow" aria-hidden />}

      {/* Header */}
      <div className="seat-header">
        <div className="seat-avatar">
          {player.username[0]?.toUpperCase()}
          {player.disconnected && <span className="dc-dot" title="Disconnected" />}
        </div>
        <div className="seat-info">
          <span className="seat-name">
            {player.username}
            {isSelf && <span className="seat-you"> YOU</span>}
          </span>
          <span className="seat-chips">
            <span className="chip-icon" aria-hidden>⬤</span>
            {player.chips.toLocaleString()}
          </span>
        </div>
        {player.bet > 0 && (
          <div className="seat-bet">
            <span className="bet-chip" aria-hidden>⬤</span>
            <span className="bet-amount">${player.bet}</span>
          </div>
        )}
      </div>

      {/* Hole cards */}
      <div className="seat-cards">
        {player.hole_cards.length === 0 ? (
          <>
            <PlayingCard card="?" size="sm" />
            <PlayingCard card="?" size="sm" />
          </>
        ) : (
          player.hole_cards.map((card, i) => (
            <PlayingCard key={i} card={card} size="sm" />
          ))
        )}
        {player.folded && <span className="folded-badge">FOLDED</span>}
      </div>

      {/* Stats row */}
      <div className="seat-stats">
        <div className="stat-item" title="Chips">
          <span className="stat-icon">⬤</span>
          <span className="stat-val">{player.chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Active effects */}
      {player.active_effects.length > 0 && (
        <div className="seat-effects">
          {player.active_effects.map(effect => (
            <span key={effect} className="effect-tag">
              {effect.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .player-seat {
          position: relative;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 0.9rem 1rem;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .player-seat--active {
          border-color: rgba(212,175,55,0.55);
          background: rgba(212,175,55,0.06);
        }
        .player-seat--folded {
          opacity: 0.4;
        }
        .player-seat--self {
          border-color: rgba(100,200,120,0.35);
          background: rgba(100,200,120,0.04);
        }
        .player-seat--self.player-seat--active {
          border-color: rgba(212,175,55,0.7);
          background: rgba(212,175,55,0.09);
        }
        .active-glow {
          position: absolute;
          inset: 0;
          border-radius: 14px;
          box-shadow: inset 0 0 20px rgba(212,175,55,0.12);
          pointer-events: none;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%,100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .seat-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.7rem;
        }
        .seat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4a2a, #0d2b1a);
          border: 1px solid rgba(212,175,55,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Georgia', serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: #d4af37;
          flex-shrink: 0;
          position: relative;
        }
        .dc-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e07070;
          border: 1.5px solid #0d2b1a;
        }
        .seat-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .seat-name {
          font-family: 'Georgia', serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: #f5e6c0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .seat-you {
          font-family: 'Courier New', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.1em;
          color: #7ac487;
          background: rgba(100,200,120,0.12);
          padding: 1px 5px;
          border-radius: 3px;
          margin-left: 5px;
          vertical-align: middle;
        }
        .seat-chips {
          font-family: 'Courier New', monospace;
          font-size: 0.7rem;
          color: #7a9e7e;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .chip-icon { font-size: 0.45rem; color: #d4af37; }

        .seat-bet {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
        }
        .bet-chip {
          font-size: 0.5rem;
          color: #e2c04a;
          filter: drop-shadow(0 0 4px rgba(212,175,55,0.6));
        }
        .bet-amount {
          font-family: 'Courier New', monospace;
          font-size: 0.68rem;
          color: #d4af37;
          font-weight: 700;
        }

        .seat-cards {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 0.65rem;
          position: relative;
        }
        .folded-badge {
          font-family: 'Courier New', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          color: #e07070;
          border: 1px solid rgba(224,112,112,0.35);
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(224,112,112,0.08);
          margin-left: 4px;
        }

        .seat-stats {
          display: flex;
          gap: 0.85rem;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .stat-icon { font-size: 0.7rem; }
        .stat-val {
          font-family: 'Courier New', monospace;
          font-size: 0.7rem;
          color: #a0b8a4;
        }

        .seat-effects {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 0.5rem;
        }
        .effect-tag {
          font-family: 'Courier New', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(192,132,252,0.1);
          border: 1px solid rgba(192,132,252,0.25);
          color: #c084fc;
        }
      `}</style>
    </div>
  );
}