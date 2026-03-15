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

class PlayerAction(str, Enum):
    FOLD  = "fold"
    CHECK = "check"
    CALL  = "call"
    RAISE = "raise"

@dataclass
class PowerCard:
    id: str
    name: str
    tier: str        # rare, epic, mythic, legendary, ultra
    cost: int        # momentum cost
    type: str        # offensive, defensive
    category: str    # suit, rank, hand, deck, board, pot, wild, power, bet, global
    desc: str

@dataclass
class Player:
    id: str
    username: str
    chips: int
    hole_cards: list[str]        # e.g. ["Ah", "Kd"]
    power_cards: list[PowerCard]
    momentum: int = 5
    bet: int = 0
    folded: bool = False
    disconnected: bool = False
    active_effects: list[str] = field(default_factory=list)  # effect ids currently applied
    powers_used_this_hand: int = 0
    has_acted: bool = False

@dataclass
class GameState:
    room_code: str
    phase: Phase
    players: dict[str, Player]   # player_id → Player
    dealer_index: int            # index into player order
    player_order: list[str]      # ordered list of player_ids
    community_cards: list[str]   # up to 5 cards e.g. ["As", "2h", "7c"]
    original_community_cards: list[str]  # before any board manipulation powers
    deck: list[str]
    pot: int
    current_bet: int
    active_player_id: str
    awaiting_response: bool      # true during power response window
    response_deadline: Optional[float]  # unix timestamp for response timeout
    power_history: list[dict] = field(default_factory=list) # history of powers used this hand
    small_blind: int = 5
    big_blind: int = 10
    hand_number: int = 0
    winners: list[str] = field(default_factory=list)
    hand_summaries: dict[str, dict] = field(default_factory=dict)