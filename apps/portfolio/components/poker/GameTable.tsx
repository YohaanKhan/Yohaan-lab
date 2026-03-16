"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { BettingControls } from "./BettingControls";
import { PlayingCard } from "./PlayingCard";
import { WinnerPopup } from "./WinnerPopup";
import { LeaderboardUpdater } from "./LeaderboardUpdater";
import { usePokerSounds } from "./usePokerSounds";
import type { GameState, GameTableProps } from "./GameTable.types";

export function GameTable({ roomCode, playerId, username }: GameTableProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [turnTimeLeft, setTurnTimeLeft] = useState(60);
    const [showWinnerPopup, setShowWinnerPopup] = useState(false);
    const [allInFlash, setAllInFlash] = useState<string | null>(null);

    const prevPotRef = useRef<number>(0);
    const prevChipsRef = useRef<Record<string, number>>({});
    const potRowRef = useRef<HTMLDivElement | null>(null);
    const { playSound } = usePokerSounds();

    /* ── Derived State ── */
    const self = gameState?.players[playerId];

    useEffect(() => {
        const s = io(process.env.NEXT_PUBLIC_POKER_ENGINE_URL!, { transports: ["websocket"] });
        s.on("connect", () => s.emit("join_room", { room_code: roomCode, player_id: playerId }));
        s.on("game_state", (state: GameState) => setGameState(state));
        s.on("error", (data: { message: string }) => setError(data.message));
        setSocket(s);
        return () => { s.disconnect(); };
    }, [roomCode, playerId]);

    useEffect(() => {
        if (!gameState?.active_player_id) return;
        setTurnTimeLeft(60);
        const interval = setInterval(() => {
            setTurnTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState?.active_player_id, gameState?.hand_number]);

    useEffect(() => {
        if (gameState?.phase === "showdown" || gameState?.phase === "hand_complete") {
            setShowWinnerPopup(true);
        } else {
            setShowWinnerPopup(false);
        }
    }, [gameState?.phase, gameState?.hand_number]);

    // ── Sound & Animation effects ──
    useEffect(() => {
        if (!gameState) return;

        // Pot increase → sound only
        if (gameState.pot > prevPotRef.current && prevPotRef.current > 0) {
            playSound("coin");
        }
        prevPotRef.current = gameState.pot;

        // Detect all-in (chips just hit 0)
        Object.entries(gameState.players).forEach(([pid, player]) => {
            const prev = prevChipsRef.current[pid];
            if (prev !== undefined && prev > 0 && player.chips === 0 && !player.folded) {
                playSound("allin");
                setAllInFlash(pid);
                setTimeout(() => setAllInFlash(null), 1800);
            }
        });
        prevChipsRef.current = Object.fromEntries(
            Object.entries(gameState.players).map(([pid, p]) => [pid, p.chips])
        );

        // Win sound
        if (gameState.phase === "hand_complete" || gameState.phase === "showdown") {
            if (gameState.winners.includes(playerId)) {
                playSound("win");
            }
        }
    }, [gameState, playerId, playSound]);

    // Handle action sounds
    const handleAction = useCallback((action: string, amount?: number) => {
        if (!socket) return;
        if (action === "fold") playSound("fold");
        else if (action === "raise") playSound("raise");
        else playSound("coin");
        socket.emit("player_action", { room_code: roomCode, player_id: playerId, action, amount });
    }, [socket, roomCode, playerId, playSound]);

    /* ── Loading ── */
    if (!gameState) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060f09", flexDirection: "column", gap: "1rem" }}>
                <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="3" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#d4af37" strokeWidth="3" strokeDasharray="38 112" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 28 28" to="360 28 28" dur="0.9s" repeatCount="indefinite" />
                    </circle>
                    <text x="28" y="33" textAnchor="middle" fontSize="16" fill="#d4af37" fontFamily="Georgia,serif">♠</text>
                </svg>
                <p style={{ fontFamily: "'Courier New',monospace", fontSize: "0.72rem", color: "#5a7a5e", letterSpacing: "0.12em", margin: 0 }}>
                    CONNECTING TO {roomCode}
                </p>
            </div>
        );
    }

    const opponents = gameState.player_order.filter(id => id !== playerId);
    const isMyTurn = gameState.active_player_id === playerId;
    const phaseLabel = gameState.phase.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    /* ── Game Over ── */
    if (gameState.phase === "game_over") {
        const winnerId = gameState.winners[0];
        const winner = winnerId ? gameState.players[winnerId] : null;
        return (
            <div className="gt-gameover">
                <div className="gt-go-bg" />
                <div className="gt-go-rays" />
                <div className="gt-go-card">
                    <div className="gt-go-crown">{winnerId === playerId ? "♛" : "♟"}</div>
                    <h1 className="gt-go-title">{winnerId === playerId ? "Victory!" : "Game Over"}</h1>
                    {winner && (
                        <div className="gt-go-winner-box">
                            <p className="gt-go-lbl">TOURNAMENT WINNER</p>
                            <p className="gt-go-wname">{winner.username}</p>
                            <p className="gt-go-wchips">⬤ {winner.chips.toLocaleString()} chips</p>
                        </div>
                    )}
                    <div className="gt-go-btns">
                        <button className="gt-go-btn gt-go-btn--gold" onClick={() => socket?.emit("restart_game", { room_code: roomCode, player_id: playerId })}>Play Again</button>
                        <button className="gt-go-btn gt-go-btn--ghost" onClick={() => { window.location.href = "/poker"; }}>Leave Table</button>
                    </div>
                </div>
                <style>{goStyles}</style>
            </div>
        );
    }

    /* ── Waiting ── */
    if (gameState.phase === "waiting") {
        return (
            <div className="gt-wait-root">
                <div className="gt-wait-bg" />
                <div className="gt-wait-box">
                    <div className="gt-wait-logo"><span className="gt-wait-crown">♛</span><h1 className="gt-wait-title">Poker Royale</h1></div>
                    <div className="gt-wait-room">
                        <p className="gt-wait-room-lbl">ROOM CODE</p>
                        <p className="gt-wait-room-code">{roomCode}</p>
                    </div>
                    <div className="gt-wait-players">
                        {gameState.player_order.map(id => {
                            const p = gameState.players[id];
                            return (
                                <div key={id} className={`gt-wait-player ${id === playerId ? "gt-wait-player--self" : ""}`}>
                                    <div className="gt-wait-av">{p?.username[0]?.toUpperCase()}</div>
                                    <span className="gt-wait-pname">{p?.username}</span>
                                    {id === gameState.player_order[0] && <span className="gt-wait-host">HOST</span>}
                                </div>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 2 - gameState.player_order.length) }).map((_, i) => (
                            <div key={`e${i}`} className="gt-wait-player gt-wait-player--empty">
                                <div className="gt-wait-av gt-wait-av--empty">?</div>
                                <span className="gt-wait-pname" style={{ opacity: 0.3 }}>Waiting…</span>
                            </div>
                        ))}
                    </div>
                    {playerId === gameState.player_order[0] ? (
                        <button className="gt-wait-start" disabled={gameState.player_order.length < 2}
                            onClick={() => socket?.emit("start_game", { room_code: roomCode, player_id: playerId })}>
                            {gameState.player_order.length < 2 ? "Need 2+ Players" : "Start Game"}
                        </button>
                    ) : (
                        <p className="gt-wait-msg">Waiting for host to start…</p>
                    )}
                </div>
                <style>{waitStyles}</style>
            </div>
        );
    }

    /* ════════════════════════════════
       MAIN GAME — SPLIT LAYOUT
    ════════════════════════════════ */
    return (
        <div className="gt-root">
            <div className="gt-bg" />

            {/* ══════════════ LEFT: TABLE ══════════════ */}
            <div className="gt-left">

                <div className="gt-table-header">
                    <div className="gt-phase-row">
                        <span className="gt-phase-pill">{phaseLabel}</span>
                        <span className="gt-hand-num">Hand #{gameState.hand_number}</span>
                    </div>
                </div>

                {/* ── THE FELT TABLE ── */}
                <div className="gt-table-wrap">
                    <div className="gt-table-outer" />
                    <div className="gt-table-felt">
                        {/* Corner suit watermarks */}
                        <span className="gt-table-suit gt-table-suit--tl" aria-hidden>♠</span>
                        <span className="gt-table-suit gt-table-suit--tr" aria-hidden>♥</span>
                        <span className="gt-table-suit gt-table-suit--bl" aria-hidden>♣</span>
                        <span className="gt-table-suit gt-table-suit--br" aria-hidden>♦</span>



                        {/* Community cards */}
                        <div className="gt-cc-row">
                            {[0, 1, 2, 3, 4].map(i => {
                                const c = gameState.community_cards[i];
                                return c
                                    ? <PlayingCard key={i} card={c} size="lg" className="gt-cc-card" />
                                    : <div key={i} className="gt-cc-empty" aria-hidden />;
                            })}
                        </div>

                        {/* Pot + chips */}
                        <div className="gt-pot-row" ref={potRowRef}>
                            {gameState.pot > 0 ? (
                                <>
                                    <div className="gt-chips-stack">
                                        {Array.from({ length: Math.min(7, Math.ceil(gameState.pot / 60)) }).map((_, i) => (
                                            <svg key={i} width="20" height="20" viewBox="0 0 20 20" aria-hidden
                                                style={{ marginLeft: i > 0 ? -9 : 0, transform: `rotate(${i * 9 - 27}deg) translateY(${i % 2 === 0 ? -2 : 2}px)`, zIndex: i }}>
                                                <circle cx="10" cy="10" r="9" fill="#d4af37" stroke="#7a5a08" strokeWidth="1.5" />
                                                <circle cx="10" cy="10" r="5.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                                <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.15)" />
                                            </svg>
                                        ))}
                                    </div>
                                    <div className="gt-pot-info">
                                        <span className="gt-pot-lbl">POT</span>
                                        <span className="gt-pot-val">${gameState.pot.toLocaleString()}</span>
                                    </div>
                                </>
                            ) : (
                                <span className="gt-pot-empty">Pot empty</span>
                            )}
                        </div>

                        {/* Dealer puck — bottom-left of felt */}
                        <div className="gt-dealer-puck">
                            <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden>
                                <circle cx="19" cy="19" r="18" fill="#ece3c8" stroke="#c0a040" strokeWidth="1.5" />
                                <circle cx="19" cy="19" r="14" fill="none" stroke="#c0a040" strokeWidth="0.8" opacity="0.4" />
                                <circle cx="19" cy="19" r="12.5" fill="#f5f0e0" />
                                <ellipse cx="15" cy="13" rx="4" ry="2.5" fill="rgba(255,255,255,0.5)" transform="rotate(-20,15,13)" />
                                <text x="19" y="17.5" textAnchor="middle" fontSize="4.8" fontWeight="700" fontFamily="Georgia,serif" fill="#5a4010" letterSpacing="0.5">DEALER</text>
                                <line x1="11" y1="19.5" x2="27" y2="19.5" stroke="#b0901c" strokeWidth="0.6" opacity="0.35" />
                                <text x="19" y="27" textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="Georgia,serif" fill="#3a2a06">♠</text>
                            </svg>
                        </div>

                        {/* Current bet — bottom-right */}
                        {gameState.current_bet > 0 && (
                            <div className="gt-cur-bet">
                                <span className="gt-cur-bet-lbl">TO CALL</span>
                                <span className="gt-cur-bet-val">${gameState.current_bet}</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className="gt-error">⚠ {error}</div>}



                {/* Winner popup */}
                {showWinnerPopup && (
                    <WinnerPopup
                        gameState={gameState}
                        onClose={() => setShowWinnerPopup(false)}
                    />
                )}

                {/* Leaderboard updater (headless) */}
                <LeaderboardUpdater socket={socket} playerId={playerId} gameState={gameState} />

            </div>

            {/* ══════════════ RIGHT: MY HAND + CONTROLS ══════════════ */}
            <div className="gt-right">

                <div className="gt-brand-strip">
                    <span className="gt-brand-name">♛ POKER ROYALE</span>
                    <span style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <a href="/poker/leaderboard" className="gt-leaderboard-link" target="_blank">🏆 Board</a>
                        <span className="gt-brand-room">{roomCode}</span>
                    </span>
                </div>

                {/* Opponents moved here */}
                <div className="gt-opps-column">
                    <h3 className="gt-side-label">OPPONENTS</h3>
                    <div className="gt-opps-grid">
                        {opponents.map(id => {
                            const p = gameState.players[id];
                            const active = gameState.active_player_id === id;
                            return (
                                <div key={id} className={`gt-side-opp ${active ? "gt-side-opp--active" : ""} ${p.folded ? "gt-side-opp--folded" : ""} ${p.eliminated ? "gt-side-opp--elim" : ""} ${allInFlash === id ? "gt-side-opp--allin" : ""}`}>
                                    {allInFlash === id && <div className="gt-allin-flash">🔥 ALL IN!</div>}
                                    <div className="gt-side-opp-av">{p.username[0]?.toUpperCase()}</div>
                                    <div className="gt-side-opp-meta">
                                        <div className="gt-side-opp-name-row">
                                            <span className="gt-side-opp-name">{p.username}</span>
                                            {p.disconnected && <span className="gt-side-opp-dc" title="Disconnected" />}
                                        </div>
                                        <span className="gt-side-opp-chips">${p.chips.toLocaleString()}</span>
                                    </div>
                                    <div className="gt-side-opp-status">
                                        {p.chips === 0 && !p.folded ? <span className="gt-side-opp-allin-badge">ALL IN</span> :
                                         p.folded ? <span className="gt-side-opp-folded">FOLDED</span> : 
                                         active ? <span className="gt-side-opp-active">THINKING...</span> : 
                                         p.bet > 0 ? <span className="gt-side-opp-bet">BET ${p.bet}</span> : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="gt-r-divider" />

                {self && (
                    <>
                        {/* My identity + stats */}
                        <div className="gt-me-header">
                            <div className="gt-me-av">{self.username[0]?.toUpperCase()}</div>
                            <div className="gt-me-info">
                                <span className="gt-me-name">{self.username}</span>
                                <div className="gt-me-chips-row">
                                    <svg width="11" height="11" viewBox="0 0 11 11">
                                        <circle cx="5.5" cy="5.5" r="5" fill="#d4af37" stroke="#8a6a10" strokeWidth="1" />
                                    </svg>
                                    <span className="gt-me-chips">{self.chips.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="gt-me-hand-eval">
                                {gameState.current_hand && (
                                    <div className="gt-hand-badge">
                                        <span className="gt-hand-badge-lbl">YOUR HAND</span>
                                        <span className="gt-hand-badge-val">{gameState.current_hand}</span>
                                    </div>
                                )}
                                {self.bet > 0 && <div className="gt-me-badge gt-me-badge--bet">BET ${self.bet}</div>}
                            </div>
                        </div>

                        {/* ── MY HOLE CARDS ── centrepiece of right panel */}
                        <div className={`gt-my-cards ${isMyTurn ? "gt-my-cards--active" : ""} ${self.folded ? "gt-my-cards--folded" : ""}`}>
                            {isMyTurn && <div className="gt-my-turn-aura" />}
                            {self.hole_cards.length === 0 ? (
                                <>
                                    <div className="gt-my-card-slot"><PlayingCard card="?" size="lg" /></div>
                                    <div className="gt-my-card-slot"><PlayingCard card="?" size="lg" /></div>
                                </>
                            ) : (
                                self.hole_cards.map((card, i) => (
                                    <div key={i} className="gt-my-card-slot">
                                        <PlayingCard card={card} size="lg" />
                                    </div>
                                ))
                            )}
                            {self.folded && (
                                <div className="gt-my-folded-cover">FOLDED</div>
                            )}
                            {isMyTurn && !self.folded && (
                                <div className={`gt-my-turn-label ${turnTimeLeft < 15 ? "gt-my-turn-label--low" : ""}`}>
                                    YOUR TURN ({Math.floor(turnTimeLeft / 60)}:{turnTimeLeft % 60 < 10 ? `0${turnTimeLeft % 60}` : turnTimeLeft % 60})
                                </div>
                            )}
                        </div>

                        {/* Effects on self */}
                        {self.active_effects.length > 0 && (
                            <div className="gt-me-effects">
                                {self.active_effects.map(e => (
                                    <span key={e} className="gt-me-effect">{e.replace(/_/g, " ")}</span>
                                ))}
                            </div>
                        )}

                        <div className="gt-r-divider" />

                        {/* Betting controls */}
                        {!self.folded && (
                            <div className="gt-r-section gt-r-controls">
                                <BettingControls
                                    currentBet={gameState.current_bet}
                                    playerBet={self.bet}
                                    playerChips={self.chips}
                                    isActive={isMyTurn}
                                    onAction={handleAction}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{mainStyles}</style>
        </div>
    );
}

/* ─────────────── GAME OVER STYLES ─────────────── */
const goStyles = `
  .gt-gameover { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#040e08; position:relative; overflow:hidden; }
  .gt-go-bg { position:absolute; inset:0; background:radial-gradient(ellipse 80% 70% at 50% 50%, #0f2e1a 0%, #040e08 100%); }
  .gt-go-rays { position:absolute; inset:-50%; background:conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.05) 15deg, transparent 30deg); animation:go-spin 12s linear infinite; }
  @keyframes go-spin { to { transform:rotate(360deg); } }
  .gt-go-card { position:relative; z-index:1; background:rgba(0,0,0,0.5); border:1px solid rgba(212,175,55,0.25); border-radius:24px; padding:2.5rem 2rem; width:90%; max-width:360px; display:flex; flex-direction:column; align-items:center; gap:1.25rem; animation:go-pop .5s cubic-bezier(.34,1.56,.64,1); }
  @keyframes go-pop { from { opacity:0; transform:scale(.85) translateY(20px); } to { opacity:1; transform:none; } }
  .gt-go-crown { font-size:3rem; color:#d4af37; filter:drop-shadow(0 0 16px rgba(212,175,55,.6)); animation:go-crown 2s ease-in-out infinite; }
  @keyframes go-crown { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
  .gt-go-title { font-family:'Outfit',sans-serif; font-size:2.2rem; font-weight:700; color:#f5e6c0; margin:0; letter-spacing:.08em; text-transform:uppercase; }
  .gt-go-winner-box { width:100%; background:rgba(212,175,55,.08); border:1px solid rgba(212,175,55,.25); border-radius:12px; padding:1.25rem; text-align:center; }
  .gt-go-lbl { font-family:'Roboto',monospace; font-size:.6rem; letter-spacing:.25em; color:#d4af37; margin:0 0 .35rem; }
  .gt-go-wname { font-family:'Outfit',sans-serif; font-size:1.7rem; font-weight:700; color:#f5e6c0; margin:0 0 .2rem; }
  .gt-go-wchips { font-family:'Roboto',monospace; font-size:.75rem; color:#7a9e7e; margin:0; }
  .gt-go-btns { width:100%; display:flex; flex-direction:column; gap:.6rem; }
  .gt-go-btn { width:100%; padding:.9rem; border-radius:10px; font-family:'Outfit',sans-serif; font-size:.95rem; font-weight:700; cursor:pointer; transition:all .18s ease; border:none; letter-spacing:.04em; }
  .gt-go-btn--gold { background:linear-gradient(135deg,#d4af37 0%,#b8922a 100%); color:#1a0f00; box-shadow:0 4px 18px rgba(212,175,55,.35); }
  .gt-go-btn--gold:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(212,175,55,.5); }
  .gt-go-btn--ghost { background:transparent; color:#a0b8a4; border:1px solid rgba(255,255,255,.1); }
  .gt-go-btn--ghost:hover { border-color:rgba(212,175,55,.35); color:#f5e6c0; }
`;

/* ─────────────── WAITING STYLES ─────────────── */
const waitStyles = `
  .gt-wait-root { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#060f09; position:relative; overflow:hidden; }
  .gt-wait-bg { position:absolute; inset:0; background:radial-gradient(ellipse 80% 70% at 50% 50%, #112a1a 0%, #050e08 100%); }
  .gt-wait-box { position:relative; z-index:1; background:rgba(0,0,0,.4); border:1px solid rgba(212,175,55,.18); border-radius:20px; padding:2.5rem 2rem; width:90%; max-width:380px; display:flex; flex-direction:column; align-items:center; gap:1.5rem; }
  .gt-wait-logo { display:flex; flex-direction:column; align-items:center; gap:.3rem; }
  .gt-wait-crown { font-size:2rem; color:#d4af37; filter:drop-shadow(0 0 12px rgba(212,175,55,.5)); }
  .gt-wait-title { font-family:'Outfit',sans-serif; font-size:1.8rem; font-weight:700; color:#f5e6c0; margin:0; letter-spacing:.1em; text-transform:uppercase; }
  .gt-wait-room { display:flex; flex-direction:column; align-items:center; gap:.2rem; }
  .gt-wait-room-lbl { font-family:'Roboto',sans-serif; font-size:.6rem; letter-spacing:.25em; color:#5a7a5e; }
  .gt-wait-room-code { font-family:'Roboto',sans-serif; font-size:2.4rem; font-weight:700; color:#d4af37; letter-spacing:.5em; text-shadow:0 0 16px rgba(212,175,55,.3); }
  .gt-wait-players { width:100%; display:flex; flex-direction:column; gap:.5rem; }
  .gt-wait-player { display:flex; align-items:center; gap:.75rem; padding:.6rem .85rem; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:10px; }
  .gt-wait-player--self { border-color:rgba(100,200,120,.25); background:rgba(100,200,120,.04); }
  .gt-wait-player--empty { opacity:.3; }
  .gt-wait-av { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#1a4a2a,#0d2b1a); border:1px solid rgba(212,175,55,.3); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-size:.85rem; font-weight:700; color:#d4af37; flex-shrink:0; }
  .gt-wait-av--empty { border-color:rgba(255,255,255,.1); color:rgba(255,255,255,.2); }
  .gt-wait-pname { font-family:'Roboto',sans-serif; font-size:.88rem; color:#f5e6c0; flex:1; }
  .gt-wait-host { font-family:'Roboto',sans-serif; font-size:.58rem; letter-spacing:.12em; color:#d4af37; background:rgba(212,175,55,.1); border:1px solid rgba(212,175,55,.25); padding:2px 6px; border-radius:3px; }
  .gt-wait-start { width:100%; padding:.9rem; border-radius:10px; background:linear-gradient(135deg,#d4af37 0%,#b8922a 100%); color:#1a0f00; font-family:'Outfit',sans-serif; font-size:1rem; font-weight:700; border:none; cursor:pointer; letter-spacing:.04em; box-shadow:0 4px 18px rgba(212,175,55,.3); transition:all .18s ease; }
  .gt-wait-start:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(212,175,55,.5); }
  .gt-wait-start:disabled { opacity:.4; cursor:not-allowed; }
  .gt-wait-msg { font-family:'Courier New',monospace; font-size:.72rem; color:#7a9e7e; letter-spacing:.08em; margin:0; animation:wm-blink 2s ease-in-out infinite; }
  @keyframes wm-blink { 0%,100%{opacity:.5;} 50%{opacity:1;} }
`;

/* ─────────────── MAIN GAME STYLES ─────────────── */
const mainStyles = `
  .gt-root {
    display: grid;
    grid-template-columns: 1fr 340px;
    min-height: 100vh;
    background: #060f09;
    position: relative;
    overflow: hidden;
    font-family: 'Roboto', 'Inter', sans-serif;
  }
  .gt-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 130% 90% at 35% 50%, #0c2416 0%, #040c08 70%),
      radial-gradient(ellipse 50% 80% at 80% 50%, #081810 0%, transparent 100%);
  }
  .gt-root > *:not(.gt-bg) { position: relative; z-index: 1; }

  /* ══ LEFT ══ */
  .gt-left {
    display: flex; flex-direction: column; gap: 0.85rem;
    padding: 1.25rem 1rem 1.25rem 1.25rem;
    border-right: 1px solid rgba(255,255,255,0.04);
    min-height: 100vh;
    justify-content: center;
  }
  .gt-table-header { position: absolute; top: 1.5rem; left: 1.5rem; z-index: 10; }

  /* Removed old gt-opps styles */

  /* The table */
  .gt-table-wrap {
    width: 100%; max-width: 900px; margin: 0 auto;
    position: relative;
    min-height: 380px;
    border-radius: 180px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.6);
  }
  .gt-table-outer {
    position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(160deg, #5a3c10 0%, #2a1a06 50%, #4a3010 100%);
    box-shadow: 0 0 0 4px rgba(212,175,55,0.22), inset 0 2px 12px rgba(0,0,0,0.7);
  }
  .gt-table-felt {
    position: absolute; inset: 12px; border-radius: 170px;
    background: radial-gradient(ellipse at 40% 40%, #22743f 0%, #185c30 40%, #103e20 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.85rem; padding: 2.5rem 4rem; overflow: hidden;
  }
  .gt-table-felt::before {
    content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
    background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.005) 10px, rgba(255,255,255,0.005) 20px);
  }
  .gt-table-suit {
    position: absolute; font-size: 6rem; opacity: 0.03;
    user-select: none; pointer-events: none; line-height: 1;
  }
  .gt-table-suit--tl { top: 12%; left: 10%; color: #f5e6c0; }
  .gt-table-suit--tr { top: 12%; right: 10%; color: #c0392b; }
  .gt-table-suit--bl { bottom: 12%; left: 10%; color: #f5e6c0; }
  .gt-table-suit--br { bottom: 12%; right: 10%; color: #c0392b; }

  .gt-phase-row {
    display: flex; align-items: center; gap: 0.75rem;
  }
  .gt-phase-pill {
    font-family:'Outfit',sans-serif; font-size:0.65rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
    color:#d4af37; background:rgba(0,0,0,0.4);
    padding:4px 12px; border-radius:20px; border:1px solid rgba(212,175,55,0.3);
    box-shadow: 0 0 15px rgba(212,175,55,0.1);
  }
  .gt-hand-num { font-family:'Roboto',sans-serif; font-size:0.65rem; color:rgba(245,230,192,0.35); letter-spacing:0.08em; }

  .gt-cc-row { position:relative; z-index:2; display:flex; gap:16px; align-items:center; }
  .gt-cc-empty { width:58px; height:82px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px dashed rgba(255,255,255,0.08); }
  .gt-cc-card { box-shadow: 0 8px 20px rgba(0,0,0,0.4); }

  .gt-pot-row { position:relative; z-index:2; display:flex; align-items:center; gap:0.85rem; margin-top: 0.5rem; }
  .gt-pot-info { display:flex; flex-direction:column; gap:2px; }
  .gt-pot-lbl { font-family:'Outfit',sans-serif; font-size:0.55rem; font-weight:700; letter-spacing:0.25em; color:rgba(212,175,55,0.6); }
  .gt-pot-val { font-family:'Roboto',sans-serif; font-size:1.4rem; font-weight:900; color:#f5e6c0; text-shadow:0 0 20px rgba(212,175,55,0.4); }
  
  .gt-dealer-puck { position:absolute; bottom:2.5rem; left:4rem; z-index:3; filter:drop-shadow(0 4px 12px rgba(0,0,0,.8)); }
  .gt-cur-bet {
    position:absolute; bottom:2.5rem; right:4rem; z-index:3;
    background:rgba(0,0,0,0.6); border:1px solid rgba(212,175,55,0.35);
    border-radius:10px; padding:6px 14px;
    display:flex; flex-direction:column; align-items:center; gap:2px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .gt-cur-bet-lbl { font-family:'Outfit',sans-serif; font-size:0.55rem; font-weight:700; letter-spacing:0.2em; color:#d4af37; opacity:0.8; }
  .gt-cur-bet-val { font-family:'Roboto',sans-serif; font-size:1rem; font-weight:800; color:#f5e6c0; }

  /* ══ RIGHT ══ */
  .gt-right {
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, rgba(10,24,16,0.95) 0%, rgba(5,12,8,1) 100%);
    border-left: 1px solid rgba(255,255,255,0.07);
    min-height: 100vh;
  }

  .gt-brand-strip {
    display:flex; align-items:center; justify-content:space-between;
    padding:1rem 1.25rem; background:rgba(0,0,0,0.4);
    border-bottom:1px solid rgba(255,255,255,0.05);
  }
  .gt-brand-name { font-family:'Outfit',sans-serif; font-size:0.75rem; letter-spacing:.15em; color:#d4af37; font-weight:800; }
  .gt-brand-room { font-family:'Roboto',sans-serif; font-size:0.7rem; font-weight:700; color:#7a9e7e; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,.08); padding:3px 10px; border-radius:12px; }

  /* Opponents Column */
  .gt-opps-column { padding: 1.25rem 1.25rem 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .gt-side-label { font-family: 'Outfit', sans-serif; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; color: rgba(255,255,255,0.25); margin: 0; }
  .gt-opps-grid { display: flex; flex-direction: column; gap: 0.5rem; }
  .gt-side-opp {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem; background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    transition: all 0.2s ease;
  }
  .gt-side-opp--active { background: rgba(212,175,55,0.08); border-color: rgba(212,175,55,0.4); box-shadow: inset 0 0 15px rgba(212,175,55,0.05); }
  .gt-side-opp--folded { opacity: 0.4; filter: saturate(0.5); }
  .gt-side-opp--elim { opacity: 0.2; grayscale: 1; }
  
  .gt-side-opp-av {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #1a4a2a, #0d2b1a);
    border: 1px solid rgba(212,175,55,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; font-weight: 700; color: #d4af37; flex-shrink: 0;
  }
  .gt-side-opp-meta { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .gt-side-opp-name-row { display: flex; align-items: center; gap: 5px; }
  .gt-side-opp-name { font-size: 0.82rem; font-weight: 600; color: #f5e6c0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gt-side-opp-dc { width: 6px; height: 6px; border-radius: 50%; background: #e07070; box-shadow: 0 0 6px #e07070; }
  .gt-side-opp-chips { font-family: 'Roboto', monospace; font-size: 0.65rem; color: #7a9e7e; }
  
  .gt-side-opp-status { flex-shrink: 0; text-align: right; }
  .gt-side-opp-folded { font-size: 0.55rem; font-weight: 700; color: #e07070; padding: 2px 6px; border: 1px solid rgba(224,112,112,0.3); border-radius: 4px; }
  .gt-side-opp-active { font-size: 0.55rem; font-weight: 700; color: #d4af37; letter-spacing: 0.05em; animation: side-blink 1.5s ease-in-out infinite; }
  @keyframes side-blink { 50% { opacity: 0.6; } }
  .gt-side-opp-bet { font-size: 0.65rem; font-weight: 800; color: #d4af37; background: rgba(212,175,55,0.1); padding: 3px 8px; border-radius: 6px; }

  .gt-r-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); margin: 0.5rem 1.25rem; }

  .gt-me-header { display:flex; align-items:center; gap:0.9rem; padding:1.25rem 1.25rem 0; }
  .gt-me-av { width:40px; height:40px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,#1e5a32,#0d2b1a); border:2px solid rgba(212,175,55,0.4); display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:800; color:#d4af37; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
  .gt-me-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .gt-me-name { font-size:.95rem; font-weight:700; color:#f5e6c0; letter-spacing: 0.02em; }
  .gt-me-chips-row { display:flex; align-items:center; gap:5px; }
  .gt-me-chips { font-family:'Roboto',monospace; font-size:.78rem; font-weight:600; color:#d4af37; }
  
  .gt-me-hand-eval { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
  .gt-hand-badge { background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.4); border-radius: 8px; padding: 4px 10px; display: flex; flex-direction: column; align-items: flex-end; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
  .gt-hand-badge-lbl { font-size: 0.48rem; font-weight: 800; color: #d4af37; letter-spacing: 0.15em; opacity: 0.8; }
  .gt-hand-badge-val { font-size: 0.85rem; font-weight: 900; color: #f5e6c0; text-transform: uppercase; letter-spacing: 0.03em; }
  
  .gt-me-badge--bet { font-family:'Outfit',sans-serif; font-size:.65rem; font-weight:800; color:#d4af37; background:rgba(212,175,55,.1); border:1px solid rgba(212,175,55,.3); border-radius:6px; padding:3px 8px; }r:#5a7a5e; }
  .gt-me-badges { display:flex; gap:4px; flex-shrink:0; flex-wrap:wrap; }
  .gt-me-badge { display:flex; align-items:center; gap:2px; font-family:'Courier New',monospace; font-size:.65rem; color:#7a9e7e; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:6px; padding:2px 6px; }
  .gt-me-badge span { color:#a0b8a4; }
  .gt-me-badge--bet { color:#d4af37; border-color:rgba(212,175,55,.25); background:rgba(212,175,55,.06); }
  .gt-me-badge--bet span { color:#d4af37; }

  /* My hole cards — the hero element */
  .gt-my-cards {
    position:relative; margin:0.85rem 1.1rem;
    display:flex; justify-content:center; align-items:center; gap:16px;
    padding:1.25rem 1rem;
    background:rgba(0,0,0,0.3);
    border-radius:14px; border:1px solid rgba(255,255,255,.07);
    min-height:110px;
    transition:border-color .25s ease;
  }
  .gt-my-cards--active { border-color:rgba(212,175,55,.45); }
  .gt-my-cards--folded { opacity:.45; }
  .gt-my-turn-aura {
    position:absolute; inset:0; border-radius:14px; pointer-events:none;
    box-shadow:inset 0 0 24px rgba(212,175,55,.12), 0 0 24px rgba(212,175,55,.08);
    animation:my-aura 2s ease-in-out infinite;
  }
  @keyframes my-aura { 0%,100%{opacity:.5;} 50%{opacity:1;} }
  .gt-my-card-slot { transition:transform .2s ease; cursor:default; }
  .gt-my-card-slot:hover { transform:translateY(-8px) rotate(-2deg); }
  .gt-my-card-slot:last-of-type:hover { transform:translateY(-8px) rotate(2deg); }
  .gt-my-folded-cover {
    position:absolute; inset:0; border-radius:14px; z-index:5;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,.6); font-family:'Courier New',monospace;
    font-size:.72rem; letter-spacing:.2em; color:#e07070;
  }
  .gt-my-turn-label {
    position:absolute; bottom:-4px; left:50%; transform:translateX(-50%);
    font-family:'Outfit',sans-serif; font-size:0.95rem; font-weight:700; letter-spacing:.08em;
    color:#000; background:#d4af37; border:1px solid #000;
    padding:4px 14px; border-radius:6px;
    box-shadow:0 0 20px rgba(212,175,55,0.4);
    animation:tl-pulse 1.5s ease-in-out infinite;
    white-space:nowrap;
    z-index:10;
  }
  .gt-my-turn-label--low {
    background:#e07070;
    box-shadow:0 0 20px rgba(224,112,112,0.6);
  }
  @keyframes tl-pulse { 0%,100%{opacity:.7;} 50%{opacity:1;} }

  .gt-me-effects { display:flex; flex-wrap:wrap; gap:4px; padding:0 1.1rem; }
  .gt-me-effect { font-family:'Courier New',monospace; font-size:.6rem; padding:2px 6px; border-radius:3px; background:rgba(192,132,252,.1); border:1px solid rgba(192,132,252,.2); color:#c084fc; }

  .gt-r-divider { height:1px; background:rgba(255,255,255,.05); margin:0.5rem 1.1rem; }
  .gt-r-section { padding:0 1.1rem 0.75rem; }
  .gt-r-controls { padding-bottom:1.25rem; margin-top:auto; }

  /* ── All-in flash ── */
  .gt-side-opp--allin {
    border-color: rgba(255, 100, 30, 0.7) !important;
    background: rgba(255, 80, 20, 0.12) !important;
    box-shadow: 0 0 20px rgba(255,80,20,0.3), inset 0 0 16px rgba(255,80,20,0.08) !important;
    animation: allin-pulse 0.4s ease-in-out 3;
  }
  @keyframes allin-pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255,80,20,0.2); }
    50% { box-shadow: 0 0 40px rgba(255,80,20,0.6), inset 0 0 30px rgba(255,80,20,0.15); }
  }
  .gt-allin-flash {
    position: absolute; inset: 0; border-radius: inherit;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; font-weight: 900; color: #ff6020;
    letter-spacing: 0.08em;
    background: rgba(255, 80, 20, 0.15);
    pointer-events: none; z-index: 10;
    animation: allin-label-in 1.8s ease forwards;
  }
  @keyframes allin-label-in {
    0% { opacity: 0; transform: scale(0.7); }
    20% { opacity: 1; transform: scale(1.1); }
    60% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1); }
  }
  .gt-side-opp-allin-badge {
    font-size: 0.6rem; font-weight: 900; color: #ff6020;
    background: rgba(255,80,20,0.15); border: 1px solid rgba(255,100,30,0.4);
    padding: 2px 7px; border-radius: 4px; letter-spacing: 0.08em;
    animation: badge-glow 1.5s ease-in-out infinite;
  }
  @keyframes badge-glow { 50% { box-shadow: 0 0 8px rgba(255,80,20,0.6); } }

  /* ── Leaderboard link ── */
  .gt-leaderboard-link {
    font-size: 0.65rem; font-weight: 800; letter-spacing: 0.08em;
    color: #d4af37; text-decoration: none;
    background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2);
    padding: 3px 9px; border-radius: 8px;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .gt-leaderboard-link:hover {
    background: rgba(212,175,55,0.16);
    box-shadow: 0 0 10px rgba(212,175,55,0.25);
  }

  /* ── Pot increase animation ── */
  .gt-pot-val {
    transition: color 0.3s ease;
    animation: pot-flash 0.6s ease;
  }
  @keyframes pot-flash {
    0% { text-shadow: 0 0 0px rgba(212,175,55,0); transform: scale(1); }
    40% { text-shadow: 0 0 30px rgba(212,175,55,0.8); transform: scale(1.08); color: #ffe98a; }
    100% { text-shadow: 0 0 20px rgba(212,175,55,0.4); transform: scale(1); }
  }

  /* ── Response bar ── */
  .gt-resp-bar {
    display:flex; align-items:center; gap:0.65rem;
    padding:0.6rem 0.85rem; border-radius:10px;
    background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.25);
    animation:rb-pulse 2s ease-in-out infinite;
  }
  @keyframes rb-pulse { 0%,100%{background:rgba(212,175,55,0.08);} 50%{background:rgba(212,175,55,0.13);} }
  .gt-resp-icon { font-size:0.9rem; animation:ri-flash 1s ease-in-out infinite; }
  @keyframes ri-flash { 0%,100%{opacity:.6;} 50%{opacity:1;} }
  .gt-resp-txt { flex:1; font-family:'Courier New',monospace; font-size:0.7rem; color:#d4af37; letter-spacing:.04em; }
  .gt-resp-timer { position:relative; width:28px; height:28px; flex-shrink:0; }
  .gt-resp-secs { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Courier New',monospace; font-size:0.58rem; font-weight:700; color:#d4af37; }

  /* ── Showdown ── */
  .gt-showdown {
    position:relative; overflow:hidden;
    background:rgba(0,0,0,0.5); border:1px solid rgba(212,175,55,0.4);
    border-radius:14px; padding:0.9rem 1.1rem;
    animation:sd-in .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes sd-in { from{opacity:0;transform:scale(.93) translateY(8px);} to{opacity:1;transform:none;} }
  .gt-sd-glow { position:absolute; inset:0; border-radius:14px; pointer-events:none; background:conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.06) 10deg, transparent 20deg); animation:sd-spin 8s linear infinite; }
  @keyframes sd-spin { to { transform:rotate(360deg); } }
  .gt-sd-inner { position:relative; z-index:1; display:flex; align-items:center; gap:0.85rem; }
  .gt-sd-trophy { font-size:1.6rem; color:#d4af37; filter:drop-shadow(0 0 8px rgba(212,175,55,.5)); flex-shrink:0; }
  .gt-sd-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:0.35rem; }
  .gt-sd-title { font-size:1.1rem; font-weight:700; color:#d4af37; margin:0; }
  .gt-sd-hand { display:flex; align-items:center; gap:0.5rem; }
  .gt-sd-class { font-family:'Courier New',monospace; font-size:0.62rem; color:#7a9e7e; }
  .gt-sd-cards { display:flex; gap:3px; }
  .gt-sd-next { font-family:'Courier New',monospace; font-size:0.58rem; color:rgba(122,158,126,0.45); white-space:nowrap; animation:sd-blink 1.8s ease-in-out infinite; }
  @keyframes sd-blink { 0%,100%{opacity:.35;} 50%{opacity:.85;} }

  .gt-error { padding:.5rem .75rem; background:rgba(192,57,43,.1); border:1px solid rgba(192,57,43,.3); border-radius:8px; font-family:'Courier New',monospace; font-size:.7rem; color:#e07070; }

  @media (max-width:820px) {
    .gt-root { grid-template-columns:1fr; }
    .gt-left { border-right:none; border-bottom:1px solid rgba(255,255,255,.05); min-height:auto; }
    .gt-right { min-height:auto; }
    .gt-table-wrap { min-height:220px; }
  }
`;