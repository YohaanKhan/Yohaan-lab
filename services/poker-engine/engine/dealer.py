import random
from engine.state import GameState, Player, Phase

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
            player = state.players[player_id]
            if not player.eliminated:
                card = state.deck.pop(0)
                player.hole_cards.append(card)
    return state

def deal_flop(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    for _ in range(3):
        card = state.deck.pop(0)
        state.community_cards.append(card)
    return state

def deal_turn(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    card = state.deck.pop(0)
    state.community_cards.append(card)
    return state

def deal_river(state: GameState) -> GameState:
    state.deck.pop(0)  # burn card
    card = state.deck.pop(0)
    state.community_cards.append(card)
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
    state.winners = []
    state.hand_summaries = {}

    # Rotate dealer to next non-eliminated player
    for _ in range(len(state.player_order)):
        state.dealer_index = (state.dealer_index + 1) % len(state.player_order)
        if not state.players[state.player_order[state.dealer_index]].eliminated:
            break
            
    # Reset per-player hand state
    for player in state.players.values():
        player.active_effects = []
        player.has_acted = False
        player.disconnected = False # Reset for next hand
        player.hole_cards = [] # Reset cards from previous round

    # Deal hole cards to non-eliminated players
    state = deal_hole_cards(state) # deal_hole_cards should also skip eliminated? Let's check.

    def get_next_valid_index(start_idx):
        idx = (start_idx + 1) % len(state.player_order)
        for _ in range(len(state.player_order)):
            p = state.players[state.player_order[idx]]
            if not p.eliminated and not p.disconnected:
                return idx
            idx = (idx + 1) % len(state.player_order)
        return start_idx

    # Post blinds skipping eliminated/disconnected
    sb_idx = get_next_valid_index(state.dealer_index)
    bb_idx = get_next_valid_index(sb_idx)
    
    small_blind_id = state.player_order[sb_idx]
    big_blind_id = state.player_order[bb_idx]

    state.players[small_blind_id].chips -= state.small_blind
    state.players[small_blind_id].bet = state.small_blind
    state.pot += state.small_blind

    state.players[big_blind_id].chips -= state.big_blind
    state.players[big_blind_id].bet = state.big_blind
    state.pot += state.big_blind

    # First to act pre-flop is player after big blind
    next_id = state.player_order[get_next_valid_index(bb_idx)]
    state.active_player_id = next_id
    state.turn_index = 0 # Reset for new hand

    # Start auto-fold timer for the first player
    import asyncio
    from engine.room import auto_fold_timer, AUTO_FOLD_SECONDS
    asyncio.create_task(
        auto_fold_timer(state.room_code, next_id, state.hand_number, state.turn_index, AUTO_FOLD_SECONDS)
    )

    state.phase = Phase.PRE_FLOP
    return state