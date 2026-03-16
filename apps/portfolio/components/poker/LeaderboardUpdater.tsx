"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { supabase } from "@/lib/supabase";
import type { GameState } from "./GameTable.types";

type HandResult = {
  winner_id: string;
  username: string;
  chips_won: number;
};

type Props = {
  socket: Socket | null;
  playerId: string;
  gameState: GameState | null;
};

async function upsertLeaderboard(winner_id: string, username: string, chips_won: number) {
  try {
    const { error } = await supabase.rpc("upsert_poker_leaderboard", {
      p_player_id: winner_id,
      p_username: username,
      p_chips_won: chips_won,
    });
    if (error) console.warn("[Leaderboard]", error.message);
  } catch {
    // Non-critical
  }
}

export function LeaderboardUpdater({ socket, playerId, gameState }: Props) {
  const updatedHand = useRef<number>(-1);

  // Listen for per-hand results from the backend
  useEffect(() => {
    if (!socket) return;

    const handleHandResult = (result: HandResult) => {
      // Only the winner's client writes to avoid duplicate rows
      if (result.winner_id !== playerId) return;
      upsertLeaderboard(result.winner_id, result.username, result.chips_won);
    };

    socket.on("hand_result", handleHandResult);
    return () => { socket.off("hand_result", handleHandResult); };
  }, [socket, playerId]);

  // Also catch game_over (tournament winner)
  useEffect(() => {
    if (!gameState || gameState.phase !== "game_over") return;
    if (!gameState.winners.includes(playerId)) return;
    if (updatedHand.current === gameState.hand_number) return;
    updatedHand.current = gameState.hand_number;

    const player = gameState.players[playerId];
    if (!player) return;
    upsertLeaderboard(playerId, player.username, player.chips);
  }, [gameState, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // headless
}
