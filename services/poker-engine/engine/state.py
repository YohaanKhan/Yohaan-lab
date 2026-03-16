from enum import Enum
from dataclasses import dataclass, field
from typing import Optional

class Phase(str, Enum):
    WAITING    = "waiting"
    DEALING    = "dealing"
    PRE_FLOP   = "pre_flop"
    FLOP       = "flop"
    TURN       = "turn"
    RIVER      = "river"
    SHOWDOWN   = "showdown"
    HAND_COMPLETE = "hand_complete"
    GAME_OVER = "game_over"

class PlayerAction(str, Enum):
    FOLD  = "fold"
    CHECK = "check"
    CALL  = "call"
    RAISE = "raise"

@dataclass
class Player:
    id: str
    username: str
    chips: int
    hole_cards: list[str]        # e.g. ["Ah", "Kd"]
    bet: int = 0
    folded: bool = False
    disconnected: bool = False
    active_effects: list[str] = field(default_factory=list)  # effect ids currently applied
    has_acted: bool = False
    eliminated: bool = False

@dataclass
class GameState:
    room_code: str
    phase: Phase
    players: dict[str, Player]   # player_id → Player
    dealer_index: int            # index into player order
    player_order: list[str]      # ordered list of player_ids
    community_cards: list[str]   # up to 5 cards e.g. ["As", "2h", "7c"]
    deck: list[str]
    pot: int
    current_bet: int
    active_player_id: str
    small_blind: int = 5
    big_blind: int = 10
    hand_number: int = 0
    turn_index: int = 0
    awaiting_response: bool = False
    response_deadline: Optional[float] = None
    winners: list[str] = field(default_factory=list)
    hand_summaries: dict[str, dict] = field(default_factory=dict)
    original_community_cards: list[str] = field(default_factory=list)