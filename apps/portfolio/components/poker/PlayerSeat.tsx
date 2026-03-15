import type { PlayerState } from "./GameTable.types";

type Props = {
  player: PlayerState;
  isActive: boolean;
  isSelf: boolean;
};

const TIER_COLORS: Record<string, string> = {
  rare: "text-teal-400",
  epic: "text-blue-400",
  mythic: "text-purple-400",
  legendary: "text-amber-400",
  ultra: "text-red-400",
};

export function PlayerSeat({ player, isActive, isSelf }: Props) {
  const powerCount = typeof player.power_cards === "number"
    ? player.power_cards
    : player.power_cards.length;

  return (
    <div className={`p-4 rounded-lg border transition-colors duration-200 ${
      player.folded
        ? "border-border bg-surface opacity-40"
        : isActive
        ? "border-accent bg-surface"
        : "border-border bg-surface"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-sans text-sm font-medium text-primary">
          {player.username}
          {isSelf && <span className="font-mono text-xs text-muted ml-2">(you)</span>}
        </span>
        <span className="font-mono text-xs text-muted">
          ${player.chips}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        {player.hole_cards.map((card, i) => (
          <div
            key={i}
            className={`w-8 h-11 rounded-sm border flex items-center justify-center font-mono text-xs font-medium ${
              card === "?"
                ? "border-border bg-surface text-muted"
                : "border-border bg-background text-primary"
            }`}
          >
            {card}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-muted">⚡</span>
          <span className="font-mono text-xs text-primary">{player.momentum}</span>
          <span className="font-mono text-xs text-muted ml-2">🃏 {powerCount}</span>
        </div>
        {player.bet > 0 && (
          <span className="font-mono text-xs text-accent">${player.bet}</span>
        )}
      </div>

      {player.active_effects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {player.active_effects.map(effect => (
            <span
              key={effect}
              className="font-mono text-xs px-1.5 py-0.5 rounded-sm bg-surface border border-border text-muted"
            >
              {effect.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}