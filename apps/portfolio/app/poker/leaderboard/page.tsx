import { supabase } from "@/lib/supabase";

type LeaderboardRow = {
  player_id: string;
  username: string;
  hands_won: number;
  chips_won: number;
  games_played: number;
};

async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("poker_leaderboard")
    .select("player_id, username, hands_won, chips_won, games_played")
    .order("chips_won", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    return [];
  }
  return (data ?? []) as LeaderboardRow[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <main style={{ minHeight: "100vh", background: "#060f09", padding: "0", fontFamily: "'Outfit', 'Roboto', sans-serif" }}>
      <style>{pageStyles}</style>

      <div className="lb-page">
        {/* Header */}
        <div className="lb-header">
          <div className="lb-header-glow" />
          <span className="lb-crown">♛</span>
          <h1 className="lb-title">Poker Royale</h1>
          <p className="lb-subtitle">TOP 10 — ALL TIME HALL OF FAME</p>
        </div>

        {/* Table */}
        <div className="lb-card">
          {rows.length === 0 ? (
            <div className="lb-empty">
              <span style={{ fontSize: "3rem" }}>🃏</span>
              <p>No games played yet. Be the first!</p>
              <a href="/poker" className="lb-play-btn">Play Now</a>
            </div>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Hands Won</th>
                  <th>Total Chips</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.player_id} className={i < 3 ? `lb-row--top lb-row--top-${i + 1}` : ""}>
                    <td className="lb-rank">
                      {MEDALS[i] ?? <span className="lb-rank-num">{i + 1}</span>}
                    </td>
                    <td className="lb-player">
                      <div className="lb-avatar">{row.username[0]?.toUpperCase()}</div>
                      <span className="lb-username">{row.username}</span>
                    </td>
                    <td className="lb-center">{row.hands_won.toLocaleString()}</td>
                    <td className="lb-chips">
                      <span className="lb-chip-icon">⬤</span>
                      {row.chips_won.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="lb-back">
          <a href="/poker" className="lb-back-btn">← Back to Lobby</a>
        </div>
      </div>
    </main>
  );
}

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap');

  .lb-page {
    max-width: 720px; margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
    display: flex; flex-direction: column; align-items: center; gap: 2rem;
  }

  .lb-header {
    position: relative; text-align: center;
    padding: 2rem 2.5rem 1.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  }
  .lb-header-glow {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .lb-crown {
    font-size: 3rem; color: #d4af37;
    filter: drop-shadow(0 0 20px rgba(212,175,55,0.6));
    animation: crown-bob 3s ease-in-out infinite;
  }
  @keyframes crown-bob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
  .lb-title {
    font-family: 'Outfit', sans-serif; font-size: 2.5rem; font-weight: 900;
    color: #f5e6c0; margin: 0; letter-spacing: 0.05em;
    text-shadow: 0 0 40px rgba(212,175,55,0.25);
  }
  .lb-subtitle {
    font-size: 0.65rem; font-weight: 700; letter-spacing: 0.3em;
    color: #5a7a5e; margin: 0;
  }

  .lb-card {
    width: 100%;
    background: rgba(10,22,14,0.9);
    border: 1px solid rgba(212,175,55,0.15);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03);
  }

  .lb-table {
    width: 100%; border-collapse: collapse;
  }
  .lb-table thead tr {
    background: rgba(0,0,0,0.4);
    border-bottom: 1px solid rgba(212,175,55,0.12);
  }
  .lb-table thead th {
    padding: 0.9rem 1.25rem;
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em;
    color: rgba(212,175,55,0.6); text-align: left; text-transform: uppercase;
  }
  .lb-table tbody tr {
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s ease;
  }
  .lb-table tbody tr:hover { background: rgba(255,255,255,0.025); }
  .lb-table tbody tr:last-child { border-bottom: none; }
  .lb-table td { padding: 0.9rem 1.25rem; }

  .lb-row--top-1 { background: rgba(212,175,55,0.08); }
  .lb-row--top-2 { background: rgba(192,192,192,0.05); }
  .lb-row--top-3 { background: rgba(205,127,50,0.05); }

  .lb-rank { font-size: 1.1rem; width: 3.5rem; }
  .lb-rank-num { font-size: 0.9rem; font-weight: 700; color: #4a6a4e; }

  .lb-player { display: flex; align-items: center; gap: 0.85rem; }
  .lb-avatar {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #1a4a2a, #0d2b1a);
    border: 1px solid rgba(212,175,55,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; font-weight: 700; color: #d4af37;
  }
  .lb-username { font-size: 0.95rem; font-weight: 600; color: #f5e6c0; }

  .lb-center { text-align: center; font-weight: 700; color: #7a9e7e; font-size: 0.95rem; }

  .lb-chips {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Roboto', monospace; font-size: 0.95rem;
    font-weight: 700; color: #d4af37;
  }
  .lb-chip-icon { font-size: 0.5rem; }

  .lb-empty {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding: 3.5rem 1rem;
    font-size: 1rem; color: #5a7a5e;
  }
  .lb-play-btn {
    display: inline-block;
    background: linear-gradient(135deg, #d4af37, #b8922a);
    color: #1a0f00; font-weight: 800; font-size: 0.9rem;
    padding: 0.75rem 2rem; border-radius: 10px;
    text-decoration: none; letter-spacing: 0.05em;
    box-shadow: 0 4px 20px rgba(212,175,55,0.35);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .lb-play-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(212,175,55,0.5); }

  .lb-back { margin-top: 0.5rem; }
  .lb-back-btn {
    font-size: 0.8rem; color: #4a6a4e; text-decoration: none;
    letter-spacing: 0.06em;
    transition: color 0.15s ease;
  }
  .lb-back-btn:hover { color: #d4af37; }
`;
