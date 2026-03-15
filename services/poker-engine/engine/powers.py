import time
import random
from dataclasses import dataclass
from engine.state import GameState, Player, PowerCard
from engine.momentum import spend_momentum, validate_combo, TIER_COSTS

RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]

ALL_POWER_CARDS: list[PowerCard] = [
    # RARE — cost 1
    PowerCard("suit_transmutation", "Suit Transmutation", "rare", 1, "offensive", "suit", "Change the suit of one of your hole cards to any suit you choose."),
    PowerCard("pair_forcer", "Pair Forcer", "rare", 1, "offensive", "rank", "Change one hole card's rank to match your other hole card."),
    PowerCard("rank_shift", "Rank Shift", "rare", 1, "offensive", "rank", "Increase or decrease one hole card's rank by exactly 1. Aces wrap."),
    PowerCard("flush_nudge", "Flush Nudge", "rare", 1, "offensive", "suit", "Change the suit of one hole card to match any revealed community card's suit."),
    PowerCard("board_refresh", "Board Refresh", "rare", 1, "offensive", "board", "Replace one revealed community card with the top card of the deck."),
    PowerCard("deck_peek", "Deck Peek", "rare", 1, "offensive", "deck", "View the top three cards of the deck. You may rearrange them."),
    PowerCard("disruption_peek", "Disruption Peek", "rare", 1, "offensive", "hand", "Look at one opponent's hole cards. Force them to replace one with the top deck card."),
    PowerCard("blind_sabotage", "Blind Sabotage", "rare", 1, "offensive", "hand", "Force one opponent to replace their lowest-ranked hole card with the top deck card."),
    PowerCard("board_swap", "Board Swap", "rare", 1, "offensive", "board", "Replace one revealed community card with a random unrevealed deck card."),
    PowerCard("pot_surge", "Pot Surge", "rare", 1, "offensive", "pot", "Increase the current pot by 25% rounded up."),
    PowerCard("suit_shield", "Suit Shield", "rare", 1, "defensive", "suit", "Your hole cards cannot have their suits altered this betting round."),
    PowerCard("rank_shield", "Rank Shield", "rare", 1, "defensive", "rank", "Your hole cards cannot have their ranks altered this betting round."),
    PowerCard("hand_concealment", "Hand Concealment", "rare", 1, "defensive", "hand", "Opponents cannot view your hole cards this betting round."),
    PowerCard("deck_guard", "Deck Guard", "rare", 1, "defensive", "deck", "Opponents cannot view or rearrange the top of the deck this betting round."),
    PowerCard("pot_lock", "Pot Lock", "rare", 1, "defensive", "pot", "The pot cannot be changed by any power this betting round."),
    PowerCard("hole_protector", "Hole Protector", "rare", 1, "defensive", "hand", "Your hole cards cannot be replaced or swapped this betting round."),
    PowerCard("board_lock", "Board Lock", "rare", 1, "defensive", "board", "Community cards cannot be replaced or manipulated this betting round."),
    PowerCard("board_restore", "Board Restore", "rare", 1, "defensive", "board", "Restore the last replaced community card to its original value."),
    PowerCard("sabotage_counter", "Sabotage Counter", "rare", 1, "defensive", "hand", "Negate one hole card disruption effect targeting you."),
    PowerCard("pot_barrier", "Pot Barrier", "rare", 1, "defensive", "pot", "All pot manipulation effects are negated this betting round."),

    # EPIC — cost 2
    PowerCard("rank_alignment", "Rank Alignment", "epic", 2, "offensive", "rank", "Adjust one hole card's rank up or down by up to 2 steps."),
    PowerCard("straight_filler", "Straight Filler", "epic", 2, "offensive", "rank", "Change one hole card to any rank needed to complete a straight."),
    PowerCard("flush_builder", "Flush Builder", "epic", 2, "offensive", "suit", "Change both your hole cards to the same suit of your choice."),
    PowerCard("wild_pair", "Wild Pair", "epic", 2, "offensive", "wild", "Add one temporary wild card valid for pairs or trips only. Removed at showdown."),
    PowerCard("mass_disruption", "Mass Disruption", "epic", 2, "offensive", "hand", "Force all opponents to replace their lowest-ranked hole card."),
    PowerCard("power_lock", "Power Lock", "epic", 2, "offensive", "power", "One opponent may activate only one power for the rest of this hand."),
    PowerCard("hand_elevation", "Hand Elevation", "epic", 2, "offensive", "rank", "Your best hand is treated as one rank higher. Does not apply to Royal Flush."),
    PowerCard("pot_pressure", "Pot Pressure", "epic", 2, "offensive", "bet", "Force one opponent to call or fold. They cannot raise this round."),
    PowerCard("board_raid", "Board Raid", "epic", 2, "offensive", "board", "Replace up to two revealed community cards with the top cards of the deck."),
    PowerCard("rank_corruption", "Rank Corruption", "epic", 2, "offensive", "rank", "Decrease one opponent's hole card rank by 2 without seeing their hand."),
    PowerCard("wild_shield", "Wild Shield", "epic", 2, "defensive", "wild", "Negate any wild card effect or remove one active temporary wild card."),
    PowerCard("power_restore", "Power Restore", "epic", 2, "defensive", "power", "Remove one power restriction currently applied to you."),
    PowerCard("bet_shield", "Bet Shield", "epic", 2, "defensive", "bet", "You cannot be forced to bet, raise, call, or fold by any power this round."),
    PowerCard("protective_veil", "Protective Veil", "epic", 2, "defensive", "hand", "Negate the next two opponent powers used against you this round."),
    PowerCard("board_resurrection", "Board Resurrection", "epic", 2, "defensive", "board", "Restore any one community card replaced this hand to its original value."),
    PowerCard("nullification_seal", "Nullification Seal", "epic", 2, "defensive", "power", "Cancel one opponent power currently being activated."),
    PowerCard("mirror_minor", "Mirror Minor", "epic", 2, "defensive", "power", "Copy one Rare power used by an opponent this round and apply it back to them."),
    PowerCard("elevation_block", "Elevation Block", "epic", 2, "defensive", "rank", "Prevent any hand elevation effects from resolving this round."),

    # MYTHIC — cost 3
    PowerCard("wild_invocation", "Wild Invocation", "mythic", 3, "offensive", "wild", "Add one temporary wild card valid as any rank and suit. Removed at showdown."),
    PowerCard("deck_sovereign", "Deck Sovereign", "mythic", 3, "offensive", "deck", "View and rearrange top five deck cards. Optionally replace one revealed community card."),
    PowerCard("board_purge", "Board Purge", "mythic", 3, "offensive", "board", "Replace up to two revealed community cards with random deck cards simultaneously."),
    PowerCard("rank_overlord", "Rank Overlord", "mythic", 3, "offensive", "rank", "Shift the rank of both your hole cards up or down by 1 simultaneously."),
    PowerCard("pot_overload", "Pot Overload", "mythic", 3, "offensive", "pot", "Double the current pot immediately."),
    PowerCard("forced_reveal", "Forced Reveal", "mythic", 3, "offensive", "hand", "All players must reveal their hole cards until end of this betting round."),
    PowerCard("suit_dominance", "Suit Dominance", "mythic", 3, "offensive", "suit", "Change the suit of both your hole cards to one suit of your choice."),
    PowerCard("power_drain", "Power Drain", "mythic", 3, "offensive", "power", "Target opponent can activate only one power for the rest of this hand."),
    PowerCard("full_hand_shield", "Full Hand Shield", "mythic", 3, "defensive", "hand", "Your hole cards cannot be viewed, altered, or replaced this round."),
    PowerCard("counter_storm", "Counter Storm", "mythic", 3, "defensive", "power", "Negate the last two opponent powers activated this round."),
    PowerCard("rank_reset", "Rank Reset", "mythic", 3, "defensive", "rank", "Undo the last rank-altering effect applied to any hole cards this round."),
    PowerCard("wild_nullification", "Wild Nullification", "mythic", 3, "defensive", "wild", "Remove all active temporary wild cards from all hands immediately."),

    # LEGENDARY — cost 4
    PowerCard("materialise", "Materialise", "legendary", 4, "offensive", "rank", "Convert one hole card to any rank and suit you choose."),
    PowerCard("omni_flush", "Omni Flush", "legendary", 4, "offensive", "suit", "Change both hole cards and up to two revealed community cards to the same suit."),
    PowerCard("forced_showdown", "Forced Showdown", "legendary", 4, "offensive", "hand", "All players reveal their hole cards for the rest of this betting round."),
    PowerCard("board_overwrite", "Board Overwrite", "legendary", 4, "offensive", "board", "Replace any community cards revealed or unrevealed with random deck cards. Choose up to three."),
    PowerCard("absolute_veil", "Absolute Veil", "legendary", 4, "defensive", "global", "You are immune to all opponent power effects for the rest of this betting round."),
    PowerCard("board_seal", "Board Seal", "legendary", 4, "defensive", "board", "All community cards are locked for the rest of this hand."),
    PowerCard("power_restore_supreme", "Power Restore Supreme", "legendary", 4, "defensive", "power", "Remove all power restrictions currently applied to you."),
    PowerCard("suit_reset_shield", "Suit Reset Shield", "legendary", 4, "defensive", "suit", "Prevent all suit and rank changes to your hole cards for this betting round."),

    # ULTRA — cost 5
    PowerCard("synergy_catalyst", "Synergy Catalyst", "ultra", 5, "offensive", "power", "Activate your second power card this turn without passing priority. Combo tax reduced to 0."),
    PowerCard("ultimate_materialise", "Ultimate Materialise", "ultra", 5, "offensive", "rank", "Convert both hole cards to any ranks and suits. Can also replace one unrevealed community card."),
    PowerCard("global_veil", "Global Veil", "ultra", 5, "defensive", "global", "You are immune to all opponent power effects for the rest of this hand. Cannot be negated."),
    PowerCard("ultimate_nullification", "Ultimate Nullification", "ultra", 5, "defensive", "power", "Negate all opponent powers activated this round. None of them resolve."),
]

POWER_CARD_MAP: dict[str, PowerCard] = {card.id: card for card in ALL_POWER_CARDS}

def deal_power_cards(state: GameState) -> GameState:
    # Each player gets 3 random power cards per hand
    power_pool = ALL_POWER_CARDS.copy()
    random.shuffle(power_pool)

    for player_id in state.player_order:
        state.players[player_id].power_cards = power_pool[:3]
        power_pool = power_pool[3:]

    return state

def has_effect(player: Player, effect_id: str) -> bool:
    return effect_id in player.active_effects

def is_protected_against(player: Player, category: str) -> bool:
    # Check if player has any active effect that blocks this category
    blocking_effects = {
        "suit": ["suit_shield", "suit_reset_shield", "full_hand_shield", "absolute_veil", "global_veil"],
        "rank": ["rank_shield", "suit_reset_shield", "full_hand_shield", "absolute_veil", "global_veil", "elevation_block"],
        "hand": ["hand_concealment", "hole_protector", "protective_veil", "full_hand_shield", "absolute_veil", "global_veil", "sabotage_counter"],
        "deck": ["deck_guard", "absolute_veil", "global_veil"],
        "board": ["board_lock", "board_seal", "absolute_veil", "global_veil"],
        "pot": ["pot_lock", "pot_barrier", "absolute_veil", "global_veil"],
        "wild": ["wild_shield", "absolute_veil", "global_veil"],
        "power": ["power_restore", "power_restore_supreme", "absolute_veil", "global_veil"],
        "bet": ["bet_shield", "absolute_veil", "global_veil"],
        "global": ["absolute_veil", "global_veil"],
    }
    return any(e in player.active_effects for e in blocking_effects.get(category, []))

def shift_rank(card: str, delta: int) -> str:
    rank = card[:-1]
    suit = card[-1]
    idx = RANK_ORDER.index(rank)
    new_idx = (idx + delta) % len(RANK_ORDER)
    return f"{RANK_ORDER[new_idx]}{suit}"

def change_suit(card: str, new_suit: str) -> str:
    return f"{card[:-1]}{new_suit}"

def change_rank(card: str, new_rank: str) -> str:
    return f"{new_rank}{card[-1]}"

def apply_power(
    state: GameState,
    acting_player_id: str,
    power_id: str,
    targets: dict
) -> tuple[GameState, str]:
    # Returns (updated_state, error_message)
    # error_message is empty string on success

    player = state.players[acting_player_id]
    power = POWER_CARD_MAP.get(power_id)

    if not power:
        return state, f"Unknown power card: {power_id}", {}

    if power not in player.power_cards:
        return state, "You do not have that power card", {}

    if not spend_momentum(player, power.cost):
        return state, f"Not enough momentum", {}

    # Remove power card from hand after use
    player.power_cards = [p for p in player.power_cards if p.id != power_id]

    # Track power usage for Power Lock enforcement
    player.powers_used_this_hand += 1
    if has_effect(player, "power_lock") and player.powers_used_this_hand > 1:
        return state, "Power Lock: you can only use one power this hand", {}

    state, error, private_data, revert_data = _resolve_power(state, acting_player_id, power, targets)
    
    if not error:
        # Save to history for nullification/mirroring
        state.power_history.append({
            "player_id": acting_player_id,
            "power_id": power_id,
            "targets": targets,
            "revert_data": revert_data,
            "timestamp": time.time()
        })
        
    return state, error, private_data

def revert_power(state: GameState, history_entry: dict) -> GameState:
    # Logic to undo a power activation using stored revert_data
    pid = history_entry["power_id"]
    player_id = history_entry["player_id"]
    targets = history_entry["targets"]
    revert_data = history_entry["revert_data"]
    
    player = state.players.get(player_id)
    if not player: return state

    if pid in ["suit_transmutation", "rank_shift", "rank_alignment", "straight_filler", "materialise", "rank_corruption", "disruption_peek", "blind_sabotage", "mass_disruption"]:
        # Revert hole cards
        for tid, hole_cards in revert_data.get("original_hole_cards", {}).items():
            if tid in state.players:
                state.players[tid].hole_cards = hole_cards
                
    elif pid in ["board_refresh", "board_swap", "board_raid", "board_purge", "board_overwrite"]:
        # Revert community cards
        if "original_community" in revert_data:
            state.community_cards = revert_data["original_community"]
            
    elif pid in ["pot_surge", "pot_overload"]:
        # Revert pot
        if "original_pot" in revert_data:
            state.pot = revert_data["original_pot"]
            
    elif pid in ["wild_pair", "wild_invocation"]:
        # Revert wild cards
        player.hole_cards = [c for c in player.hole_cards if not c.endswith("w")]
        player.active_effects = [e for e in player.active_effects if e != "has_wild"]

    # Basic effect removal
    if "original_effects" in revert_data:
        for tid, effects in revert_data["original_effects"].items():
            if tid in state.players:
                state.players[tid].active_effects = effects

    return state

def _resolve_power(
    state: GameState,
    acting_player_id: str,
    power: PowerCard,
    targets: dict
) -> tuple[GameState, str, dict, dict]:
    # Returns (updated_state, error_message, private_data, revert_data)
    player = state.players[acting_player_id]
    pid = power.id
    private_data = {}
    revert_data = {}

    # ── SUIT EFFECTS ──────────────────────────────────────────────────────────
    if pid == "suit_transmutation":
        card_index = targets.get("card_index", 0)
        new_suit = targets.get("suit")
        if not new_suit:
            return state, "suit required", private_data, revert_data
        target_id = targets.get("target_id", acting_player_id)
        target = state.players[target_id]
        if is_protected_against(target, "suit"):
            return state, "Target is protected against suit effects", private_data, revert_data
        
        revert_data["original_hole_cards"] = {target_id: list(target.hole_cards)}
        target.hole_cards[card_index] = change_suit(target.hole_cards[card_index], new_suit)

    elif pid == "deck_peek":
        private_data["peek"] = state.deck[:3]

    elif pid == "disruption_peek":
        target_id = targets.get("target_id")
        replace_index = targets.get("replace_index", 0)
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "hand"):
            return state, "Target is protected against hand effects", private_data, revert_data
        
        # Private data for the peek part
        private_data["peek"] = {target_id: target.hole_cards}
        
        # Force replacement
        target.hole_cards[replace_index] = state.deck.pop(0)

    elif pid == "deck_sovereign":
        private_data["peek"] = state.deck[:5]
        # Optionalboard replacement logic can be handled by client sending a second action or targets
        community_index = targets.get("community_index")
        if community_index is not None and community_index < len(state.community_cards):
            state.community_cards[community_index] = state.deck.pop(0)
        card_index = targets.get("card_index", 0)
        community_index = targets.get("community_index", 0)
        if community_index >= len(state.community_cards):
            return state, "No community card at that index", private_data, revert_data
        new_suit = state.community_cards[community_index][-1]
        player.hole_cards[card_index] = change_suit(player.hole_cards[card_index], new_suit)

    elif pid == "flush_builder":
        new_suit = targets.get("suit")
        if not new_suit:
            return state, "suit required", private_data, revert_data
        player.hole_cards = [change_suit(c, new_suit) for c in player.hole_cards]

    elif pid == "suit_dominance":
        new_suit = targets.get("suit")
        if not new_suit:
            return state, "suit required", private_data, revert_data
        player.hole_cards = [change_suit(c, new_suit) for c in player.hole_cards]

    elif pid == "omni_flush":
        new_suit = targets.get("suit")
        community_indices = targets.get("community_indices", [])
        if not new_suit:
            return state, "suit required", private_data, revert_data
        player.hole_cards = [change_suit(c, new_suit) for c in player.hole_cards]
        for i in community_indices[:2]:
            if i < len(state.community_cards):
                state.community_cards[i] = change_suit(state.community_cards[i], new_suit)

    elif pid == "suit_shield":
        player.active_effects.append("suit_shield")

    elif pid == "suit_reset_shield":
        player.active_effects.append("suit_reset_shield")

    # ── RANK EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "pair_forcer":
        source_index = targets.get("source_index", 0)
        target_index = 1 - source_index
        source_rank = player.hole_cards[source_index][:-1]
        player.hole_cards[target_index] = change_rank(player.hole_cards[target_index], source_rank)

    elif pid == "rank_shift":
        card_index = targets.get("card_index", 0)
        delta = targets.get("delta", 1)
        if delta not in [1, -1]:
            return state, "delta must be 1 or -1", private_data, revert_data
        player.hole_cards[card_index] = shift_rank(player.hole_cards[card_index], delta)

    elif pid == "rank_alignment":
        card_index = targets.get("card_index", 0)
        delta = targets.get("delta", 0)
        if abs(delta) > 2:
            return state, "delta must be between -2 and 2", private_data, revert_data
        player.hole_cards[card_index] = shift_rank(player.hole_cards[card_index], delta)

    elif pid == "straight_filler":
        card_index = targets.get("card_index", 0)
        new_rank = targets.get("rank")
        if not new_rank or new_rank not in RANK_ORDER:
            return state, "valid rank required", private_data, revert_data
        player.hole_cards[card_index] = change_rank(player.hole_cards[card_index], new_rank)

    elif pid == "rank_overlord":
        delta = targets.get("delta", 1)
        if delta not in [1, -1]:
            return state, "delta must be 1 or -1", private_data, revert_data
        player.hole_cards = [shift_rank(c, delta) for c in player.hole_cards]

    elif pid == "rank_corruption":
        target_id = targets.get("target_id")
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "rank"):
            return state, "Target is protected against rank effects", private_data, revert_data
        # Pick a random hole card to corrupt — acting player doesn't see which
        card_index = random.randint(0, len(target.hole_cards) - 1)
        target.hole_cards[card_index] = shift_rank(target.hole_cards[card_index], -2)

    elif pid == "hand_elevation":
        if not is_protected_against(player, "rank"):
            player.active_effects.append("hand_elevation")

    elif pid == "elevation_block":
        player.active_effects.append("elevation_block")
        # Remove any existing hand_elevation effects from all players
        for p in state.players.values():
            p.active_effects = [e for e in p.active_effects if e != "hand_elevation"]

    elif pid == "rank_shield":
        player.active_effects.append("rank_shield")

    elif pid == "rank_reset":
        # Remove the last rank change — tracked via active_effects log
        # For simplicity, remove all rank-altering effects this round
        for p in state.players.values():
            p.active_effects = [
                e for e in p.active_effects
                if e not in ["rank_shift", "rank_alignment", "rank_overlord", "rank_corruption"]
            ]

    elif pid == "materialise":
        card_index = targets.get("card_index", 0)
        new_rank = targets.get("rank")
        new_suit = targets.get("suit")
        if not new_rank or not new_suit:
            return state, "rank and suit required", private_data, revert_data
        player.hole_cards[card_index] = f"{new_rank}{new_suit}"

    elif pid == "ultimate_materialise":
        new_cards = targets.get("new_cards", [])
        if len(new_cards) != 2:
            return state, "exactly 2 new cards required", private_data, revert_data
        player.hole_cards = new_cards
        community_index = targets.get("community_index")
        if community_index is not None:
            new_community_card = state.deck.pop(0)
            state.community_cards[community_index] = new_community_card

    # ── HAND EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "disruption_peek":
        target_id = targets.get("target_id")
        replace_index = targets.get("replace_index", 0)
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "hand"):
            return state, "Target is protected against hand effects", private_data, revert_data
        # Peek is handled client-side via targeted emit
        # Force replacement
        target.hole_cards[replace_index] = state.deck.pop(0)

    elif pid == "blind_sabotage":
        target_id = targets.get("target_id")
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "hand"):
            return state, "Target is protected against hand effects", private_data, revert_data
        # Replace lowest ranked hole card
        ranks = [RANK_ORDER.index(c[:-1]) for c in target.hole_cards]
        lowest_index = ranks.index(min(ranks))
        target.hole_cards[lowest_index] = state.deck.pop(0)

    elif pid == "mass_disruption":
        for pid_other, other in state.players.items():
            if pid_other == acting_player_id or other.folded:
                continue
            if is_protected_against(other, "hand"):
                continue
            ranks = [RANK_ORDER.index(c[:-1]) for c in other.hole_cards]
            lowest_index = ranks.index(min(ranks))
            other.hole_cards[lowest_index] = state.deck.pop(0)

    elif pid == "forced_reveal":
        for p in state.players.values():
            if not is_protected_against(p, "hand"):
                p.active_effects.append("revealed")

    elif pid == "forced_showdown":
        for p in state.players.values():
            if not is_protected_against(p, "hand"):
                p.active_effects.append("revealed")

    elif pid == "hand_concealment":
        player.active_effects.append("hand_concealment")

    elif pid == "hole_protector":
        player.active_effects.append("hole_protector")

    elif pid == "protective_veil":
        player.active_effects.append("protective_veil")

    elif pid == "full_hand_shield":
        player.active_effects.append("full_hand_shield")

    elif pid == "sabotage_counter":
        player.active_effects = [e for e in player.active_effects if e != "disruption_peek"]

    # ── BOARD EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "deck_guard":
        player.active_effects.append("deck_guard")

    elif pid == "board_refresh":
        index = targets.get("community_index", 0)
        if index >= len(state.community_cards):
            return state, "No community card at that index", private_data, revert_data
        if is_protected_against(player, "board"):
            return state, "Board is locked", private_data, revert_data
        state.community_cards[index] = state.deck.pop(0)

    elif pid == "board_swap":
        index = targets.get("community_index", 0)
        if index >= len(state.community_cards):
            return state, "No community card at that index", private_data, revert_data
        if is_protected_against(player, "board"):
            return state, "Board is locked", private_data, revert_data
        state.community_cards[index] = state.deck.pop(0)

    elif pid == "board_raid":
        indices = targets.get("community_indices", [])
        if is_protected_against(player, "board"):
            return state, "Board is locked", private_data, revert_data
        for i in indices[:2]:
            if i < len(state.community_cards):
                state.community_cards[i] = state.deck.pop(0)

    elif pid == "board_purge":
        indices = targets.get("community_indices", [])
        if is_protected_against(player, "board"):
            return state, "Board is locked", private_data, revert_data
        for i in indices[:2]:
            if i < len(state.community_cards):
                state.community_cards[i] = state.deck.pop(0)

    elif pid == "board_overwrite":
        indices = targets.get("community_indices", [])
        if is_protected_against(player, "board"):
            return state, "Board is locked", private_data, revert_data
        for i in indices[:3]:
            if i < len(state.community_cards):
                state.community_cards[i] = state.deck.pop(0)
            elif i < 5:
                # Unrevealed card — replace in deck position
                pass

    elif pid == "board_restore":
        index = targets.get("community_index", 0)
        if index < len(state.original_community_cards):
            state.community_cards[index] = state.original_community_cards[index]

    elif pid == "board_resurrection":
        index = targets.get("community_index", 0)
        if index < len(state.original_community_cards):
            state.community_cards[index] = state.original_community_cards[index]

    elif pid == "board_lock":
        player.active_effects.append("board_lock")

    elif pid == "board_seal":
        for p in state.players.values():
            p.active_effects.append("board_seal")

    # ── POT EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "pot_surge":
        if not is_protected_against(player, "pot"):
            state.pot = int(state.pot * 1.25 + 0.5)

    elif pid == "pot_overload":
        if not is_protected_against(player, "pot"):
            state.pot *= 2

    elif pid == "pot_lock":
        player.active_effects.append("pot_lock")

    elif pid == "pot_barrier":
        player.active_effects.append("pot_barrier")

    # ── WILD EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "wild_pair":
        wild = targets.get("rank", "A") + "w"
        player.hole_cards.append(wild)
        player.active_effects.append("has_wild")

    elif pid == "wild_invocation":
        wild = targets.get("card", "Aw")
        player.hole_cards.append(wild)
        player.active_effects.append("has_wild")

    elif pid == "wild_shield":
        for p in state.players.values():
            p.hole_cards = [c for c in p.hole_cards if not c.endswith("w")]
            p.active_effects = [e for e in p.active_effects if e != "has_wild"]

    elif pid == "wild_nullification":
        for p in state.players.values():
            p.hole_cards = [c for c in p.hole_cards if not c.endswith("w")]
            p.active_effects = [e for e in p.active_effects if e != "has_wild"]

    # ── POWER EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "power_lock":
        target_id = targets.get("target_id")
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "power"):
            return state, "Target is protected against power effects", private_data, revert_data
        target.active_effects.append("power_lock")

    elif pid == "power_drain":
        target_id = targets.get("target_id")
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "power"):
            return state, "Target is protected against power effects", private_data, revert_data
        target.active_effects.append("power_drain")

    elif pid == "power_restore":
        player.active_effects = [
            e for e in player.active_effects if e != "power_lock"
        ]

    elif pid == "power_restore_supreme":
        player.active_effects = [
            e for e in player.active_effects
            if e not in ["power_lock", "power_drain"]
        ]

    elif pid == "nullification_seal":
        if not state.power_history:
            return state, "No power to nullify", private_data, revert_data
        last_power = state.power_history.pop()
        state = revert_power(state, last_power)

    elif pid == "counter_storm":
        for _ in range(min(2, len(state.power_history))):
            last_power = state.power_history.pop()
            state = revert_power(state, last_power)

    elif pid == "ultimate_nullification":
        while state.power_history:
            last_power = state.power_history.pop()
            state = revert_power(state, last_power)

    elif pid == "mirror_minor":
        rare_powers = [p for p in state.power_history if POWER_CARD_MAP[p["power_id"]].tier == "rare"]
        if not rare_powers:
            return state, "No rare power to mirror", private_data, revert_data
        last_rare = rare_powers[-1]
        mirrored_targets = last_rare["targets"].copy()
        mirrored_targets["target_id"] = last_rare["player_id"]
        state, _, _, _ = _resolve_power(state, acting_player_id, POWER_CARD_MAP[last_rare["power_id"]], mirrored_targets)

    elif pid == "synergy_catalyst":
        player.active_effects.append("synergy_catalyst")

    # ── BET EFFECTS ──────────────────────────────────────────────────────────
    elif pid == "pot_pressure":
        target_id = targets.get("target_id")
        if not target_id or target_id not in state.players:
            return state, "valid target_id required", private_data, revert_data
        target = state.players[target_id]
        if is_protected_against(target, "bet"):
            return state, "Target is protected against bet effects", private_data, revert_data
        target.active_effects.append("must_call_or_fold")

    elif pid == "bet_shield":
        player.active_effects.append("bet_shield")

    # ── GLOBAL EFFECTS ──────────────────────────────────────────────────────
    elif pid == "absolute_veil":
        player.active_effects.append("absolute_veil")

    elif pid == "global_veil":
        player.active_effects.append("global_veil")

    else:
        return state, f"Power {pid} not yet implemented", private_data, revert_data

    return state, "", private_data, revert_data