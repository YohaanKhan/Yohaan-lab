"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { PlayerSeat } from "./PlayerSeat";
import { PowerCardHand } from "./PowerCardHand";
import { BettingControls } from "./BettingControls";
import type { GameState, GameTableProps, PowerCard } from "./GameTable.types";

export function GameTable({ roomCode, playerId, username }: GameTableProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseWindow, setResponseWindow] = useState(false);
  const [responseDeadline, setResponseDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_POKER_ENGINE_URL!, {
      transports: ["websocket"],
    });

    s.on("connect", () => {
      s.emit("join_room", { room_code: roomCode, player_id: playerId });
    });

    s.on("game_state", (state: GameState) => {
      setGameState(state);
    });

    s.on("power_activated", (data: { player_id: string; power_id: string; deadline: number }) => {
      if (data.player_id !== playerId) {
        setResponseWindow(true);
        setResponseDeadline(data.deadline);
      }
    });

    s.on("error", (data: { message: string }) => {
      setError(data.message);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [roomCode, playerId]);

  // Response window countdown
  useEffect(() => {
    if (!responseDeadline) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil(responseDeadline - Date.now() / 1000));
      setTimeLeft(left);
      if (left === 0) {
        setResponseWindow(false);
        setResponseDeadline(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [responseDeadline]);

  const handleAction = useCallback((action: string, amount?: number, powerId?: string, powerTargets?: Record<string, unknown>) => {
    if (!socket) return;
    socket.emit("player_action", {
      room_code: roomCode,
      player_id: playerId,
      action,
      amount,
      power_id: powerId,
      power_targets: powerTargets ?? {},
    });
  }, [socket, roomCode, playerId]);

  const handlePowerActivate = useCallback((cardId: string, targets: Record<string, unknown>) => {
    if (!socket) return;
    if (responseWindow) {
      socket.emit("power_response", {
        room_code: roomCode,
        player_id: playerId,
        power_id: cardId,
        power_targets: targets,
      });
      setResponseWindow(false);
    } else {
      // Power will be sent alongside next betting action
      // Store it temporarily — sent with handleAction
      handleAction("check", undefined, cardId, targets);
    }
  }, [socket, roomCode, playerId, responseWindow, handleAction]);

  if (!gameState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Connecting to room {roomCode}...</p>
      </main>
    );
  }

  const self = gameState.players[playerId];
  const opponents = gameState.player_order.filter(id => id !== playerId);
  const isMyTurn = gameState.active_player_id === playerId;
  const selfPowerCards = typeof self?.power_cards !== "number"
    ? self.power_cards as PowerCard[]
    : [];

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-lg font-semibold text-primary">
            Poker Royale
          </h1>
          <p className="font-mono text-xs text-muted">
            Room {roomCode} · Hand #{gameState.hand_number} · {gameState.phase.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-sm text-primary">Pot: ${gameState.pot}</span>
          <span className="font-mono text-xs text-muted">Bet: ${gameState.current_bet}</span>
        </div>
      </div>

      {/* Response window banner */}
      {responseWindow && (
        <div className="p-3 rounded-md border border-accent bg-surface flex items-center justify-between">
          <p className="font-mono text-sm text-accent">
            Opponent played a power card — respond or pass
          </p>
          <span className="font-mono text-sm text-primary">{timeLeft}s</span>
        </div>
      )}

      {/* Opponents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {opponents.map(id => (
          <PlayerSeat
            key={id}
            player={gameState.players[id]}
            isActive={gameState.active_player_id === id}
            isSelf={false}
          />
        ))}
      </div>

      {/* Showdown / Hand Complete Banner */}
      {(gameState.phase === "showdown" || gameState.phase === "hand_complete") && gameState.winners.length > 0 && (
        <div className="p-4 rounded-lg border-2 border-accent bg-accent/10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
          <h2 className="font-sans text-xl font-bold text-accent mb-2">
            {gameState.winners.length > 1 ? "Split Pot!" : `${gameState.players[gameState.winners[0]]?.username} Wins!`}
          </h2>
          <div className="flex gap-4">
            {gameState.winners.map(wid => {
              const summary = gameState.hand_summaries?.[wid];
              const p = gameState.players[wid];
              return (
                <div key={wid} className="flex flex-col items-center">
                  <p className="font-mono text-sm text-primary font-semibold">{p?.username}</p>
                  <p className="font-mono text-xs text-muted mb-2">{summary?.hand_class || "Winning Hand"}</p>
                  <div className="flex gap-1 justify-center">
                    {summary?.hole_cards?.map((card, i) => (
                      <div key={i} className="w-8 h-12 rounded-sm border border-border bg-background flex items-center justify-center font-mono text-xs font-medium text-primary">
                        {card}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="font-mono text-xs text-muted mt-3 animate-pulse">Next hand starting soon...</p>
        </div>
      )}

      {/* Main Table Area (Community + Power History) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Community cards */}
        <div className="md:col-span-2 p-4 rounded-lg border border-border bg-surface">
          <p className="font-mono text-xs text-muted mb-3">Community cards</p>
          <div className="flex gap-3 flex-wrap">
            {gameState.community_cards.length === 0 ? (
              <p className="font-mono text-xs text-muted">Not dealt yet</p>
              ) : (
              gameState.community_cards.map((card, i) => (
                <div
                  key={i}
                  className="w-10 h-14 rounded-sm border border-border bg-background flex items-center justify-center font-mono text-sm font-medium text-primary"
                >
                  {card}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Power History */}
        <div className="p-4 rounded-lg border border-border bg-surface flex flex-col h-full max-h-[160px]">
          <p className="font-mono text-xs text-muted mb-2">Power Log (Hand #{gameState.hand_number})</p>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {gameState.power_history?.length === 0 ? (
              <p className="font-mono text-xs text-muted/50 italic">No powers used yet.</p>
            ) : (
              gameState.power_history?.map((hist, i) => {
                const player = gameState.players[hist.player_id];
                return (
                  <div key={i} className="text-xs font-mono pb-2 border-b border-border/50 last:border-0 last:pb-0">
                    <span className="text-primary font-semibold">{player?.username}</span> used{' '}
                    <span className="text-accent">{hist.power_id.replace(/_/g, ' ')}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Self */}
      {self && (
        <PlayerSeat
          player={self}
          isActive={isMyTurn}
          isSelf={true}
        />
      )}

      {/* Power cards */}
      {selfPowerCards.length > 0 && (
        <PowerCardHand
          cards={selfPowerCards}
          momentum={self?.momentum ?? 0}
          onActivate={handlePowerActivate}
          disabled={!isMyTurn && !responseWindow}
        />
      )}

      {/* Betting controls */}
      {self && !self.folded && (
        <BettingControls
          currentBet={gameState.current_bet}
          playerBet={self.bet}
          playerChips={self.chips}
          isActive={isMyTurn}
          onAction={handleAction}
        />
      )}

      {/* Waiting for players */}
      {gameState.phase === "waiting" && (
        <div className="p-6 rounded-lg border border-border bg-surface flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-sm text-muted">
            Waiting for players... ({gameState.player_order.length}/4)
          </p>
          <p className="font-mono text-xs text-muted mb-2">
            Share room code: <span className="text-accent font-bold text-base ml-1">{roomCode}</span>
          </p>
          {playerId === gameState.player_order[0] ? (
            <button
              onClick={() => socket?.emit("start_game", { room_code: roomCode, player_id: playerId })}
              disabled={gameState.player_order.length < 2}
              className="px-6 py-2 rounded-md bg-accent text-white font-sans text-sm font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gameState.player_order.length < 2 ? "Need 2+ players" : "Start Game"}
            </button>
          ) : (
            <p className="font-mono text-xs text-primary animate-pulse">Waiting for host to start...</p>
          )}
        </div>
      )}

      {error && (
        <p className="font-mono text-xs text-red-400 text-center">{error}</p>
      )}
    </main>
  );
}