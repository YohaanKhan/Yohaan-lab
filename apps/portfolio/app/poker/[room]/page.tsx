"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GameTable } from "@/components/poker/GameTable";
import type { User } from "@supabase/supabase-js";

export default function PokerRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.room as string).toUpperCase();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();

      if (profile) setUsername(profile.username);
      setLoading(false);
    }
    getUser();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  return <GameTable roomCode={roomCode} playerId={user.id} username={username} />;
}