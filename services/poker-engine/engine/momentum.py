from engine.state import Player, Phase

TIER_COSTS = {
    "rare": 1,
    "epic": 2,
    "mythic": 3,
    "legendary": 4,
    "ultra": 5,
}

MAX_MOMENTUM = 5

MOMENTUM_PER_PHASE = {
    Phase.PRE_FLOP: 1,
    Phase.FLOP: 1,
    Phase.TURN: 1,
    Phase.RIVER: 1,
}

def reset_momentum(player: Player) -> None:
    player.momentum = MAX_MOMENTUM

def add_momentum(player: Player, amount: int = 1) -> None:
    player.momentum = min(player.momentum + amount, MAX_MOMENTUM)

def replenish_momentum_for_phase(player: Player, phase: Phase) -> None:
    # Called at the start of each betting round
    gain = MOMENTUM_PER_PHASE.get(phase, 0)
    add_momentum(player, gain)

def get_combo_cost(tier_a: str, tier_b: str) -> int:
    # Pay the higher cost + 1 (combo tax)
    cost_a = TIER_COSTS[tier_a]
    cost_b = TIER_COSTS[tier_b]
    return max(cost_a, cost_b) + 1

def get_combo_cost_with_catalyst(tier_a: str, tier_b: str) -> int:
    # Synergy Catalyst reduces combo tax to 0
    cost_a = TIER_COSTS[tier_a]
    cost_b = TIER_COSTS[tier_b]
    return max(cost_a, cost_b)

def can_afford(player: Player, cost: int) -> bool:
    return player.momentum >= cost

def spend_momentum(player: Player, cost: int) -> bool:
    if not can_afford(player, cost):
        return False
    player.momentum -= cost
    return True

def can_use_two_ultras(tier_a: str, tier_b: str) -> bool:
    # Two Ultras can never be comboed — cost would be 6, exceeds max of 5
    return not (tier_a == "ultra" and tier_b == "ultra")

def validate_combo(
    player: Player,
    tier_a: str,
    tier_b: str,
    using_catalyst: bool = False
) -> tuple[bool, str]:
    # Returns (is_valid, error_message)
    if not can_use_two_ultras(tier_a, tier_b):
        return False, "Two Ultra cards cannot be comboed"

    cost = (
        get_combo_cost_with_catalyst(tier_a, tier_b)
        if using_catalyst
        else get_combo_cost(tier_a, tier_b)
    )

    if not can_afford(player, cost):
        return False, (
            f"Not enough momentum. Need {cost}, have {player.momentum}"
        )

    return True, ""