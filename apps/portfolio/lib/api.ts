const AI_ASSISTANT_URL = process.env.NEXT_PUBLIC_AI_ASSISTANT_URL;
const DOODLE_MODEL_URL = process.env.NEXT_PUBLIC_DOODLE_MODEL_URL;
const CODE_EXPLORER_URL = process.env.NEXT_PUBLIC_CODE_EXPLORER_URL;
const POKER_ENGINE_URL = process.env.NEXT_PUBLIC_POKER_ENGINE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  reply: string;
};

export type DoodlePrediction = {
  label: string;
  confidence: number;
};

export type CodeQuery = {
  repo_url: string;
  question: string;
};

export type CodeAnswer = {
  answer: string;
  sources: string[];
};

export type PokerRoomResponse = {
  room_code: string;
};

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export async function chatSendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${AI_ASSISTANT_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  return res.json();
}

// ─── Doodle Model ─────────────────────────────────────────────────────────────

export async function doodlePredict(imageBase64: string): Promise<DoodlePrediction> {
  const res = await fetch(`${DOODLE_MODEL_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!res.ok) throw new Error(`Doodle API error: ${res.status}`);
  return res.json();
}

// ─── Code Explorer ────────────────────────────────────────────────────────────

export async function codeExplorerQuery(query: CodeQuery): Promise<CodeAnswer> {
  const res = await fetch(`${CODE_EXPLORER_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`Code Explorer API error: ${res.status}`);
  return res.json();
}

// ─── Poker Engine ─────────────────────────────────────────────────────────────

export async function pokerCreateRoom(
  playerId: string,
  username: string
): Promise<PokerRoomResponse> {
  const res = await fetch(`${POKER_ENGINE_URL}/room/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, username }),
  });
  if (!res.ok) throw new Error(`Failed to create room: ${res.status}`);
  return res.json();
}

export async function pokerJoinRoom(
  roomCode: string,
  playerId: string,
  username: string
): Promise<void> {
  const res = await fetch(`${POKER_ENGINE_URL}/room/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_code: roomCode, player_id: playerId, username }),
  });
  if (!res.ok) throw new Error(`Failed to join room: ${res.status}`);
}