import random
from engine.state import GameState, Player, Phase
from engine.momentum import reset_momentum
from engine.powers import deal_power_cards

RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
SUITS = ["h", "d", "c", "s"]

def build_deck() -> list[str]:
    return [f"{rank}{suit}" for rank in RANKS for suit in SUITS]

def shuffle_deck(deck: list[str]) -> list[str]:
    d = deck.copy()
    random.shuffle(d)
    return d

def deal_hole_cards(state: GameState) -> GameState:
    # Deal 2 hole cards to each player in order
    # We deal one card at a time around the table, twice — standard poker dealing
    for _ in range(2):
        for player_id in state.player_order:
            card = state.deck.pop(0)
            state.players[player_id].hole_cards.append(card)
    return state

def deal_flop(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    for _ in range(3):
        card = state.deck.pop(0)
        state.community_cards.append(card)
        state.original_community_cards.append(card)
    return state

def deal_turn(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    card = state.deck.pop(0)
    state.community_cards.append(card)
    state.original_community_cards.append(card)
    return state

def deal_river(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    card = state.deck.pop(0)
    state.community_cards.append(card)
    state.original_community_cards.append(card)
    return state

def start_new_hand(state: GameState) -> GameState:
    # Reset all per-hand state
    state.deck = shuffle_deck(build_deck())
    state.community_cards = []
    state.original_community_cards = []
    state.pot = 0
    state.current_bet = state.big_blind
    state.hand_number += 1
    state.phase = Phase.DEALING
    state.awaiting_response = False
    state.response_deadline = None

    # Rotate dealer
    state.dealer_index = (state.dealer_index + 1) % len(state.player_order)

    # Reset per-player hand state
    for player in state.players.values():
        player.hole_cards = []
        player.power_cards = []
        player.bet = 0
        player.folded = False
        player.active_effects = []
        player.powers_used_this_hand = 0
        player.has_acted = False
        reset_momentum(player)

    # Deal hole cards and power cards
    state = deal_hole_cards(state)
    state = deal_power_cards(state)

    # Post blinds
    small_blind_id = state.player_order[
        (state.dealer_index + 1) % len(state.player_order)
    ]
    big_blind_id = state.player_order[
        (state.dealer_index + 2) % len(state.player_order)
    ]

    state.players[small_blind_id].chips -= state.small_blind
    state.players[small_blind_id].bet = state.small_blind
    state.pot += state.small_blind

    state.players[big_blind_id].chips -= state.big_blind
    state.players[big_blind_id].bet = state.big_blind
    state.pot += state.big_blind

    # First to act pre-flop is player after big blind
    state.active_player_id = state.player_order[
        (state.dealer_index + 3) % len(state.player_order)
    ]

    state.phase = Phase.PRE_FLOP
    return state