/**
 * PlayingCard — renders a single playing card or card back.
 *
 * Card string format from engine: rank + suit letter
 *   Ranks: A 2 3 4 5 6 7 8 9 10 J Q K
 *   Suits: h (hearts) d (diamonds) c (clubs) s (spades)
 *   Hidden: "?"
 *
 * Sizes:
 *   "sm"  — 34×48px  (player seat hole cards)
 *   "md"  — 46×64px  (community cards on table)
 *   "lg"  — 58×82px  (showdown / winner reveal)
 *   "xl"  — 72×102px (hero sized reveal)
 */

type CardSize = "sm" | "md" | "lg" | "xl";

type Props = {
  card: string;       // e.g. "Ah", "Kd", "10c", "?"
  size?: CardSize;
  faceDown?: boolean; // force card back even if card is known
  className?: string;
};

const SIZE: Record<CardSize, { w: number; h: number; rank: number; suit: number; pip: number; rx: number }> = {
  sm: { w: 34, h: 48,  rank: 9,  suit: 10, pip: 14, rx: 5  },
  md: { w: 46, h: 64,  rank: 11, suit: 13, pip: 20, rx: 6  },
  lg: { w: 58, h: 82,  rank: 14, suit: 16, pip: 26, rx: 7  },
  xl: { w: 72, h: 102, rank: 18, suit: 20, pip: 32, rx: 9  },
};

// Map letter suit to display glyph + color
const SUIT_META: Record<string, { glyph: string; color: string; label: string }> = {
  h: { glyph: "♥", color: "#c0392b", label: "hearts"   },
  d: { glyph: "♦", color: "#c0392b", label: "diamonds" },
  c: { glyph: "♣", color: "#1a1a1a", label: "clubs"    },
  s: { glyph: "♠", color: "#1a1a1a", label: "spades"   },
};

// Fancy display rank (J/Q/K get face-card letter)
const RANK_DISPLAY: Record<string, string> = {
  A: "A", J: "J", Q: "Q", K: "K",
};

function parseSuit(card: string): string {
  return card.slice(-1).toLowerCase();
}
function parseRank(card: string): string {
  return card.slice(0, -1).toUpperCase();
}

// SVG suit path — crisp at small sizes, no font dependency
function SuitSVG({ suit, size, color }: { suit: string; size: number; color: string }) {
  const s = size;
  const h = s;

  if (suit === "h") {
    // Heart — two circles + bottom triangle
    const r = s * 0.28;
    const cx1 = s * 0.28, cx2 = s * 0.72, cy = s * 0.35;
    const btmX = s * 0.5, btmY = s * 0.92;
    const lx = s * 0.02, rx = s * 0.98;
    return (
      <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} fill={color} aria-hidden>
        <path d={`
          M ${btmX} ${btmY}
          L ${lx} ${cy + r * 0.3}
          A ${r} ${r} 0 0 1 ${cx1} ${cy - r}
          A ${r} ${r} 0 0 1 ${btmX} ${cy + r * 0.5}
          A ${r} ${r} 0 0 1 ${cx2} ${cy - r}
          A ${r} ${r} 0 0 1 ${rx} ${cy + r * 0.3}
          Z
        `} />
      </svg>
    );
  }

  if (suit === "d") {
    // Diamond — four-point shape
    const mx = s * 0.5, top = s * 0.04, bot = s * 0.96, left = s * 0.05, right = s * 0.95, mid = s * 0.5;
    return (
      <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} fill={color} aria-hidden>
        <polygon points={`${mx},${top} ${right},${mid} ${mx},${bot} ${left},${mid}`} />
      </svg>
    );
  }

  if (suit === "c") {
    // Club — three circles + stem
    const r = s * 0.24;
    const topCy = s * 0.28, botCy = s * 0.52;
    const lcx = s * 0.25, rcx = s * 0.75, topCx = s * 0.5;
    const stemW = s * 0.12, stemTop = s * 0.62, stemBot = s * 0.9;
    const footL = s * 0.2, footR = s * 0.8;
    return (
      <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} fill={color} aria-hidden>
        <circle cx={lcx}  cy={botCy} r={r} />
        <circle cx={rcx}  cy={botCy} r={r} />
        <circle cx={topCx} cy={topCy} r={r * 1.05} />
        <rect x={topCx - stemW/2} y={stemTop} width={stemW} height={stemBot - stemTop} />
        <path d={`M ${footL} ${stemBot} Q ${topCx} ${stemBot + s*0.06} ${footR} ${stemBot} Z`} />
      </svg>
    );
  }

  if (suit === "s") {
    // Spade — inverted heart + stem
    const r = s * 0.26;
    const tipX = s * 0.5, tipY = s * 0.04;
    const lx = s * 0.04, rx = s * 0.96, cy = s * 0.56;
    const stemW = s * 0.11, stemTop = s * 0.63, stemBot = s * 0.88;
    const footL = s * 0.2, footR = s * 0.8;
    return (
      <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} fill={color} aria-hidden>
        <path d={`
          M ${tipX} ${tipY}
          L ${lx} ${cy - r * 0.3}
          A ${r} ${r} 0 0 0 ${s*0.28} ${cy + r}
          A ${r} ${r} 0 0 0 ${tipX} ${cy - r * 0.5}
          A ${r} ${r} 0 0 0 ${s*0.72} ${cy + r}
          A ${r} ${r} 0 0 0 ${rx} ${cy - r * 0.3}
          Z
        `} />
        <rect x={tipX - stemW/2} y={stemTop} width={stemW} height={stemBot - stemTop} />
        <path d={`M ${footL} ${stemBot} Q ${tipX} ${stemBot + s*0.07} ${footR} ${stemBot} Z`} />
      </svg>
    );
  }

  return null;
}

export function PlayingCard({ card, size = "md", faceDown, className = "" }: Props) {
  const dim = SIZE[size];
  const isHidden = card === "?" || faceDown;

  if (isHidden) {
    return (
      <div
        className={`playing-card playing-card--back playing-card--${size} ${className}`}
        style={{ width: dim.w, height: dim.h, borderRadius: dim.rx }}
        aria-label="Card face down"
      >
        <div className="card-back-pattern" />
        <style>{cardStyles}</style>
      </div>
    );
  }

  const suitKey = parseSuit(card);
  const rank = parseRank(card);
  const meta = SUIT_META[suitKey] ?? { glyph: "?", color: "#1a1a1a", label: "unknown" };
  const displayRank = RANK_DISPLAY[rank] ?? rank;
  const isFace = ["J", "Q", "K"].includes(rank);

  return (
    <div
      className={`playing-card playing-card--face playing-card--${size} ${className}`}
      style={{
        width: dim.w,
        height: dim.h,
        borderRadius: dim.rx,
        color: meta.color,
      }}
      aria-label={`${displayRank} of ${meta.label}`}
    >
      {/* Top-left rank + suit */}
      <div className="card-corner card-corner--tl">
        <span className="card-rank" style={{ fontSize: dim.rank }}>{displayRank}</span>
        <span className="card-corner-suit" style={{ fontSize: dim.rank - 1 }}>{meta.glyph}</span>
      </div>

      {/* Center suit icon */}
      <div className="card-center">
        {isFace ? (
          <span className="card-face-letter" style={{ fontSize: dim.pip * 1.1, color: meta.color }}>
            {displayRank}
          </span>
        ) : (
          <SuitSVG suit={suitKey} size={dim.pip} color={meta.color} />
        )}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div className="card-corner card-corner--br">
        <span className="card-rank" style={{ fontSize: dim.rank }}>{displayRank}</span>
        <span className="card-corner-suit" style={{ fontSize: dim.rank - 1 }}>{meta.glyph}</span>
      </div>

      <style>{cardStyles}</style>
    </div>
  );
}

const cardStyles = `
  .playing-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    user-select: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9);
  }
  .playing-card--face {
    background: #faf7f0;
    border: 1px solid rgba(0,0,0,0.18);
    font-family: 'Roboto', 'Inter', sans-serif;
    font-weight: 700;
  }
  .playing-card--back {
    background: #1e3a5f;
    border: 1px solid rgba(100,160,220,0.3);
    overflow: hidden;
  }
  .card-back-pattern {
    position: absolute;
    inset: 3px;
    border-radius: inherit;
    background:
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 3px,
        rgba(255,255,255,0.06) 3px,
        rgba(255,255,255,0.06) 6px
      ),
      linear-gradient(135deg, #1a3a6a 0%, #0d2240 50%, #1a3a6a 100%);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .card-corner {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.05;
    gap: 0px;
  }
  .card-corner--tl { top: 3px; left: 4px; }
  .card-corner--br {
    bottom: 3px;
    right: 4px;
    transform: rotate(180deg);
  }
  .card-rank {
    font-weight: 700;
    line-height: 1;
    color: inherit;
  }
  .card-corner-suit {
    line-height: 1;
    color: inherit;
  }

  .card-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    width: 100%;
  }
  .card-face-letter {
    font-weight: 700;
    line-height: 1;
    font-family: 'Roboto', sans-serif;
    opacity: 0.9;
  }
`;