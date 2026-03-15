export type PowerCard = {
  id: string;
  name: string;
  tier: "rare" | "epic" | "mythic" | "legendary" | "ultra";
  cost: number;
  type: "offensive" | "defensive";
  category: string;
  desc: string;
};

export type PlayerState = {
  id: string;
  username: string;
  chips: number;
  hole_cards: string[];
  power_cards: PowerCard[] | number;
  momentum: number;
  bet: number;
  folded: boolean;
  disconnected: boolean;
  active_effects: string[];
};

export type GamePhase =
  | "waiting"
  | "dealing"
  | "pre_flop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "hand_complete";

export type GameState = {
  room_code: string;
  phase: GamePhase;
  players: Record<string, PlayerState>;
  community_cards: string[];
  pot: number;
  current_bet: number;
  active_player_id: string;
  awaiting_response: boolean;
  player_order: string[];
  hand_number: number;
  power_history: {
    player_id: string;
    power_id: string;
    targets: Record<string, unknown>;
  }[];
  winners: string[];
  hand_summaries: Record<string, {
    hand_class: string;
    rank: number;
    hole_cards: string[];
  }>;
};

export type GameTableProps = {
  roomCode: string;
  playerId: string;
  username: string;
};