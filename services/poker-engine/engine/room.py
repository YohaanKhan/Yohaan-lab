import asyncio
import random
import string
import time
from engine.state import GameState, Player, Phase
from engine.dealer import start_new_hand, deal_flop, deal_turn, deal_river
from engine.evaluator import determine_winner, get_hand_summary
from engine.momentum import replenish_momentum_for_phase
from engine.powers import apply_power

# In-memory room storage — fine for now, rooms are short-lived
rooms: dict[str, GameState] = {}

# Maps socket session id to player_id and room_code
socket_sessions: dict[str, dict] = {}

RESPONSE_WINDOW_SECONDS = 10
AUTO_FOLD_SECONDS = 30

def generate_room_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

def create_room(player_id: str, username: str) -> str:
    room_code = generate_room_code()
    while room_code in rooms:
        room_code = generate_room_code()

    state = GameState(
        room_code=room_code,
        phase=Phase.WAITING,
        players={
            player_id: Player(
                id=player_id,
                username=username,
                chips=1000,
                hole_cards=[],
                power_cards=[],
            )
        },
        dealer_index=0,
        player_order=[player_id],
        community_cards=[],
        original_community_cards=[],
        deck=[],
        pot=0,
        current_bet=10,
        active_player_id=player_id,
        awaiting_response=False,
        response_deadline=None,
    )

    rooms[room_code] = state
    return room_code

def join_room(room_code: str, player_id: str, username: str) -> None:
    if room_code not in rooms:
        raise ValueError(f"Room {room_code} does not exist")

    state = rooms[room_code]

    if len(state.players) >= 4:
        raise ValueError("Room is full")

    if state.phase != Phase.WAITING:
        raise ValueError("Game already in progress")

    state.players[player_id] = Player(
        id=player_id,
        username=username,
        chips=1000,
        hole_cards=[],
        power_cards=[],
    )
    state.player_order.append(player_id)

def get_state(room_code: str) -> GameState:
    if room_code not in rooms:
        raise ValueError(f"Room {room_code} does not exist")
    return rooms[room_code]

def serialize_state(state: GameState, perspective_player_id: str) -> dict:
    # Serializes state from a specific player's perspective
    # Hole cards of other players are hidden unless revealed effect is active
    from dataclasses import asdict

    players_out = {}
    for pid, player in state.players.items():
        revealed = (
            pid == perspective_player_id
            or "revealed" in player.active_effects
            or state.phase == Phase.SHOWDOWN
        )
        
        # Power cards must be converted to dicts if they are objects
        serialized_powers = [asdict(p) if hasattr(p, '__dataclass_fields__') else p for p in player.power_cards]
        
        players_out[pid] = {
            "id": player.id,
            "username": player.username,
            "chips": player.chips,
            "hole_cards": player.hole_cards if revealed else ["?", "?"],
            "power_cards": serialized_powers if pid == perspective_player_id else len(player.power_cards),
            "momentum": player.momentum,
            "bet": player.bet,
            "folded": player.folded,
            "has_acted": player.has_acted,
            "disconnected": player.disconnected,
            "active_effects": player.active_effects,
        }

    return {
        "room_code": state.room_code,
        "phase": state.phase,
        "players": players_out,
        "community_cards": state.community_cards,
        "pot": state.pot,
        "current_bet": state.current_bet,
        "active_player_id": state.active_player_id,
        "awaiting_response": state.awaiting_response,
        "player_order": state.player_order,
        "hand_number": state.hand_number,
        "power_history": state.power_history,
        "winners": state.winners,
        "hand_summaries": state.hand_summaries,
    }

def get_next_active_player(state: GameState, current_id: str) -> str | None:
    order = state.player_order
    start = order.index(current_id)
    for i in range(1, len(order)):
        next_id = order[(start + i) % len(order)]
        player = state.players[next_id]
        if not player.folded and not player.disconnected:
            return next_id
    return None

def is_betting_round_over(state: GameState) -> bool:
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected
    ]
    # Round is over when all active players have matched the current bet and acted
    return all(p.has_acted and p.bet == state.current_bet for p in active_players)

def advance_phase(state: GameState) -> GameState:
    # Replenish momentum for all players on phase transition
    for player in state.players.values():
        replenish_momentum_for_phase(player, state.phase)

    # Reset bets and actions for new round
    for player in state.players.values():
        player.bet = 0
        player.has_acted = False
    state.current_bet = 0

    if state.phase == Phase.PRE_FLOP:
        state = deal_flop(state)
        state.phase = Phase.FLOP
    elif state.phase == Phase.FLOP:
        state = deal_turn(state)
        state.phase = Phase.TURN
    elif state.phase == Phase.TURN:
        state = deal_river(state)
        state.phase = Phase.RIVER
    elif state.phase == Phase.RIVER:
        state.phase = Phase.SHOWDOWN
        state = resolve_showdown(state)

    # First to act post-flop is first active player after dealer
    if state.phase not in [Phase.SHOWDOWN, Phase.HAND_COMPLETE]:
        dealer_id = state.player_order[state.dealer_index]
        state.active_player_id = get_next_active_player(state, dealer_id)

    return state

def resolve_showdown(state: GameState) -> GameState:
    winners = determine_winner(state)
    state.winners = winners
    state.hand_summaries = get_hand_summary(state)

    # Split pot evenly among winners
    share = state.pot // len(winners)
    for winner_id in winners:
        state.players[winner_id].chips += share

    state.phase = Phase.HAND_COMPLETE
    
    # Schedule an auto-restart
    from api.socket import sio
    import asyncio
    
    async def schedule_new_hand(room_code: str):
        await asyncio.sleep(5)  # 5 seconds to view showdown
        if room_code in rooms:
            s_state = rooms[room_code]
            if len(s_state.players) >= 2:
                s_state = start_new_hand(s_state)
                rooms[room_code] = s_state
                for pid in s_state.player_order:
                    await sio.emit("game_state", serialize_state(s_state, pid), room=f"{room_code}:{pid}")

    asyncio.create_task(schedule_new_hand(state.room_code))
    
    return state

def eliminate_broke_players(state: GameState) -> GameState:
    # Remove players with 0 chips from the game
    broke_ids = [pid for pid, p in state.players.items() if p.chips <= 0]
    for pid in broke_ids:
        state.players.pop(pid)
        state.player_order.remove(pid)
    return state

async def start_game_in_room(room_code: str, player_id: str) -> dict:
    from api.socket import sio
    state = get_state(room_code)
    
    # Only the room creator (first player) can start the game
    if state.player_order[0] != player_id:
        return {"error": "Only the room creator can start the game"}
        
    if state.phase != Phase.WAITING:
        return {"error": "Game is already in progress"}
        
    if len(state.players) < 2:
        return {"error": "Need at least 2 players to start"}
        
    state = start_new_hand(state)
    rooms[room_code] = state
    
    # Broadcast updated state to each player from their perspective
    for pid in state.player_order:
        player_state = serialize_state(state, pid)
        await sio.emit("game_state", player_state, room=f"{room_code}:{pid}")

    return {"success": True}

async def handle_action(room_code: str, data: dict) -> dict:
    from api.socket import sio

    state = get_state(room_code)
    player_id = data.get("player_id")
    action = data.get("action")
    player = state.players.get(player_id)

    if not player:
        return {"error": "Player not in room"}

    if state.active_player_id != player_id:
        return {"error": "Not your turn"}

    # Handle power card activation alongside action
    power_id = data.get("power_id")
    power_targets = data.get("power_targets", {})

    if power_id:
        state, error, private_data = apply_power(state, player_id, power_id, power_targets)
        if error:
            return {"error": error}
            
        # Send private peek data if any
        if private_data and "peek" in private_data:
            await sio.emit("power_peek", private_data["peek"], room=f"{room_code}:{player_id}")

        # Open response window for opponents
        state.awaiting_response = True
        state.response_deadline = time.time() + RESPONSE_WINDOW_SECONDS

        # Broadcast power activation to room
        await sio.emit("power_activated", {
            "player_id": player_id,
            "power_id": power_id,
            "deadline": state.response_deadline,
        }, room=room_code)

        # Wait for response window
        await asyncio.sleep(RESPONSE_WINDOW_SECONDS)
        state.awaiting_response = False
        state.response_deadline = None

    # Handle betting action
    amount = data.get("amount", 0)
    did_bet_action = action in ["fold", "check", "call", "raise"]

    if action == "fold":
        player.folded = True

    elif action == "check":
        if state.current_bet > player.bet:
            return {"error": "Cannot check — there is a bet to call"}

    elif action == "call":
        call_amount = state.current_bet - player.bet
        actual_call = min(call_amount, player.chips)
        player.chips -= actual_call
        player.bet += actual_call
        state.pot += actual_call

    elif action == "raise":
        if amount <= state.current_bet:
            return {"error": "Raise must be higher than current bet"}
        raise_amount = amount - player.bet
        if raise_amount > player.chips:
            return {"error": "Not enough chips"}
        player.chips -= raise_amount
        player.bet = amount
        state.pot += raise_amount
        state.current_bet = amount

    if did_bet_action:
        player.has_acted = True

    # Check if only one player remains
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected
    ]
    if len(active_players) == 1:
        winner = active_players[0]
        winner.chips += state.pot
        state.phase = Phase.HAND_COMPLETE

    # Advance to next player or next phase
    elif is_betting_round_over(state):
        state = advance_phase(state)
    else:
        next_id = get_next_active_player(state, player_id)
        if next_id:
            state.active_player_id = next_id
            # Start auto-fold timer for next player
            asyncio.create_task(
                auto_fold_timer(room_code, next_id, AUTO_FOLD_SECONDS)
            )

    rooms[room_code] = state

    # Broadcast updated state to each player from their perspective
    for pid in state.player_order:
        player_state = serialize_state(state, pid)
        await sio.emit("game_state", player_state, room=f"{room_code}:{pid}")

    return {"success": True}

async def handle_power_response(room_code: str, data: dict) -> None:
    from api.socket import sio

    state = get_state(room_code)
    player_id = data.get("player_id")
    power_id = data.get("power_id")
    power_targets = data.get("power_targets", {})

    if not state.awaiting_response:
        return

    if power_id:
        state, error, private_data = apply_power(state, player_id, power_id, power_targets)
        if error:
            await sio.emit("error", {"message": error}, room=f"{room_code}:{player_id}")
            return
            
        # Send private peek data if any
        if private_data and "peek" in private_data:
            await sio.emit("power_peek", private_data["peek"], room=f"{room_code}:{player_id}")

    state.awaiting_response = False
    state.response_deadline = None
    rooms[room_code] = state

    for pid in state.player_order:
        await sio.emit("game_state", serialize_state(state, pid), room=f"{room_code}:{pid}")

async def auto_fold_timer(room_code: str, player_id: str, seconds: int) -> None:
    from api.socket import sio

    await asyncio.sleep(seconds)

    if room_code not in rooms:
        return

    state = rooms[room_code]

    if state.active_player_id != player_id:
        return  # Player already acted

    player = state.players.get(player_id)
    if not player:
        return

    player.folded = True
    player.disconnected = True

    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected
    ]

    if len(active_players) == 1:
        winner = active_players[0]
        winner.chips += state.pot
        state.phase = Phase.HAND_COMPLETE
    else:
        next_id = get_next_active_player(state, player_id)
        if next_id:
            state.active_player_id = next_id

    rooms[room_code] = state

    for pid in state.player_order:
        await sio.emit("game_state", serialize_state(state, pid), room=f"{room_code}:{pid}")