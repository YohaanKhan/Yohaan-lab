from treys import Card, Evaluator, Deck
from engine.state import GameState, Player

evaluator = Evaluator()

from itertools import product
from treys import Card, Evaluator, Deck

evaluator = Evaluator()

def parse_card(card_str: str) -> int:
    # treys expects cards like "Ah", "Kd", "Ts"
    return Card.new(card_str)

def get_best_hand_rank(hole_cards: list[str], community_cards: list[str]) -> int:
    ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
    suits = ["h", "d", "c", "s"]
    all_standard_cards = [f"{r}{s}" for r in ranks for s in suits]

    # Find wild cards in hole cards
    wilds = [c for c in hole_cards if c.endswith("w")]
    standard_hole = [c for c in hole_cards if not c.endswith("w")]

    if not wilds:
        hand = [parse_card(c) for c in standard_hole]
        board = [parse_card(c) for c in community_cards]
        return evaluator.evaluate(board, hand)

    # We have wilds or multiple hole cards (e.g. from powers).
    # To bypass treys' 7-card limit, we evaluate all possible 5-card combinations.
    from itertools import combinations
    
    best_rank = 7463  # worst possible rank is 7462

    # Cards currently in use that mathematically can't be used as wilds
    used_cards = set(standard_hole + community_cards)

    valid_replacements = [c for c in all_standard_cards if c not in used_cards] if wilds else [[]]
    
    # If no wilds, replacement_combo iteration will just yield one empty list
    for replacement_combo in product(valid_replacements, repeat=len(wilds)):
        if wilds and len(set(replacement_combo)) != len(replacement_combo):
            continue

        test_hole = standard_hole + list(replacement_combo)
        all_available_cards = test_hole + community_cards
        
        # Treys can evaluate exactly 5 cards as evaluator.evaluate([], [5 cards])
        for five_card_combo in combinations(all_available_cards, 5):
            hand_objs = [parse_card(c) for c in five_card_combo]
            current_rank = evaluator.evaluate([], hand_objs)
            best_rank = min(best_rank, current_rank)

    return best_rank

def get_hand_class(rank: int) -> str:
    # Returns human readable hand class e.g. "Flush", "Two Pair"
    return evaluator.class_to_string(evaluator.get_rank_class(rank))

def get_hand_rank_with_elevation(
    hole_cards: list[str],
    community_cards: list[str],
    elevated: bool = False
) -> int:
    rank = get_best_hand_rank(hole_cards, community_cards)

    if not elevated:
        return rank

    # Hand Elevation moves rank up one class
    # In treys, lower score = better, so we find the best score
    # in the next hand class up and return that
    rank_class = evaluator.get_rank_class(rank)

    # Royal Flush is class 1 — cannot elevate further
    if rank_class <= 1:
        return rank

    # Return the minimum score (best hand) of the next class up
    class_boundaries = {
        9: 6185,  # High Card floor
        8: 3325,  # One Pair floor
        7: 2467,  # Two Pair floor
        6: 1609,  # Three of a Kind floor
        5: 1599,  # Straight floor
        4: 322,   # Flush floor
        3: 166,   # Full House floor
        2: 10,    # Four of a Kind floor
        1: 1,     # Straight Flush floor
    }

    elevated_class = rank_class - 1
    return class_boundaries.get(elevated_class, rank)

def determine_winner(state: GameState) -> list[str]:
    # Returns list of winner player_ids (list handles splits)
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected
    ]

    if len(active_players) == 1:
        return [active_players[0].id]

    elevated_ids = {
        p.id for p in active_players
        if "hand_elevation" in p.active_effects
    }

    scores: dict[str, int] = {}
    for player in active_players:
        elevated = player.id in elevated_ids
        scores[player.id] = get_hand_rank_with_elevation(
            player.hole_cards,
            state.community_cards,
            elevated=elevated
        )

    best_score = min(scores.values())
    winners = [pid for pid, score in scores.items() if score == best_score]
    return winners

def get_hand_summary(state: GameState) -> dict[str, dict]:
    # Returns a summary of each active player's hand for showdown display
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected
    ]

    summary = {}
    for player in active_players:
        rank = get_best_hand_rank(player.hole_cards, state.community_cards)
        summary[player.id] = {
            "hand_class": get_hand_class(rank),
            "rank": rank,
            "hole_cards": player.hole_cards,
        }
    return summary