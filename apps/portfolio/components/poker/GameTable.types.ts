export type PlayerState = {
  id: string;
  username: string;
  chips: number;
  hole_cards: string[];
  bet: number;
  folded: boolean;
  disconnected: boolean;
  active_effects: string[];
  eliminated: boolean;
};

export type GamePhase =
  | "waiting"
  | "dealing"
  | "pre_flop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "hand_complete"
  | "game_over";

export type GameState = {
  room_code: string;
  phase: GamePhase;
  players: Record<string, PlayerState>;
  community_cards: string[];
  pot: number;
  current_bet: number;
  active_player_id: string;
  player_order: string[];
  hand_number: number;
  winners: string[];
  current_hand?: string;
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