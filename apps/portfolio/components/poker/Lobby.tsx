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
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-primary mb-1">
            Poker Royale
          </h1>
          <p className="font-mono text-sm text-muted">
            Texas Hold'em · Power Cards · Private Rooms
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-lg border border-border bg-surface flex flex-col gap-3">
            <p className="font-mono text-xs text-muted">New game</p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 rounded-md bg-accent text-white font-sans text-sm font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create room"}
            </button>
          </div>

          <div className="p-5 rounded-lg border border-border bg-surface flex flex-col gap-3">
            <p className="font-mono text-xs text-muted">Join existing room</p>
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              maxLength={4}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary font-mono text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors duration-200 uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={loading || !roomCode.trim()}
              className="w-full py-3 rounded-md border border-border text-primary font-sans text-sm font-medium hover:border-accent transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join room"}
            </button>
          </div>

          {error && (
            <p className="font-mono text-xs text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}