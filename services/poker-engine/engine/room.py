import asyncio
import random
import string
import time
from engine.state import GameState, Player, Phase
from engine.dealer import start_new_hand, deal_flop, deal_turn, deal_river
from engine.evaluator import determine_winner, get_hand_summary

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

    if player_id in state.players:
        # Rejoining
        state.players[player_id].disconnected = False
        return

    if len(state.players) >= 4:
        raise ValueError("Room is full")

    if state.phase != Phase.WAITING:
        raise ValueError("Game already in progress")

    state.players[player_id] = Player(
        id=player_id,
        username=username,
        chips=1000,
        hole_cards=[],
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
        
        players_out[pid] = {
            "id": player.id,
            "username": player.username,
            "chips": player.chips,
            "hole_cards": player.hole_cards if revealed else ["?", "?"],
            "bet": player.bet,
            "folded": player.folded,
            "has_acted": player.has_acted,
            "disconnected": player.disconnected,
            "active_effects": player.active_effects,
            "eliminated": player.eliminated,
        }

    from engine.evaluator import get_best_hand_rank, get_hand_class

    res = {
        "room_code": state.room_code,
        "phase": state.phase,
        "players": players_out,
        "community_cards": state.community_cards,
        "pot": state.pot,
        "current_bet": state.current_bet,
        "active_player_id": state.active_player_id,
        "player_order": state.player_order,
        "hand_number": state.hand_number,
        "winners": state.winners,
        "hand_summaries": state.hand_summaries,
    }

    # Add current hand evaluation for the perspective player
    perspective_player = state.players.get(perspective_player_id)
    if perspective_player and not perspective_player.folded and len(state.community_cards) >= 3:
        try:
            rank = get_best_hand_rank(perspective_player.hole_cards, state.community_cards)
            res["current_hand"] = get_hand_class(rank)
        except:
            pass

    return res

def check_for_hand_winner(state: GameState) -> bool:
    # Check if only one player remains (not folded, not eliminated, not disconnected)
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected and not p.eliminated
    ]
    
    if len(active_players) == 1:
        winner = active_players[0]
        winner.chips += state.pot
        chips_won = state.pot
        state.winners = [winner.id]
        state.phase = Phase.HAND_COMPLETE
        
        # Eliminate players and check for game over
        state = eliminate_broke_players(state)
        remaining_players = [p for p in state.players.values() if not p.eliminated]
        if len(remaining_players) <= 1:
            state.phase = Phase.GAME_OVER
        else:
            # Schedule next hand
            from api.socket import sio
            async def schedule_new_hand_fold(room_code: str):
                # Emit hand_result immediately so leaderboard updates
                await sio.emit("hand_result", {
                    "winner_id": winner.id,
                    "username": winner.username,
                    "chips_won": chips_won,
                }, room=room_code)
                await asyncio.sleep(5)
                if room_code in rooms:
                    s_state = rooms[room_code]
                    if s_state.phase != Phase.GAME_OVER and len(s_state.players) >= 2:
                        s_state = start_new_hand(s_state)
                        rooms[room_code] = s_state
                        for pid in list(s_state.players.keys()):
                            await sio.emit("game_state", serialize_state(s_state, pid), room=f"{room_code}:{pid}")
            asyncio.create_task(schedule_new_hand_fold(state.room_code))
        return True
    return False

def get_next_active_player(state: GameState, current_id: str) -> str | None:
    order = state.player_order
    try:
        start = order.index(current_id)
    except ValueError:
        # Fallback if current_id somehow not in order
        start = state.dealer_index
        
    for i in range(1, len(order)):
        next_id = order[(start + i) % len(order)]
        player = state.players[next_id]
        if not player.folded and not player.disconnected and not player.eliminated:
            return next_id
    return None

def is_betting_round_over(state: GameState) -> bool:
    active_players = [
        p for p in state.players.values()
        if not p.folded and not p.disconnected and not p.eliminated
    ]
    # Round is over when all active players have matched the current bet and acted
    return all(p.has_acted and p.bet == state.current_bet for p in active_players)

def advance_phase(state: GameState) -> GameState:
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
        next_id = get_next_active_player(state, dealer_id)
        if next_id:
            state.active_player_id = next_id
            state.turn_index += 1
            # Start timer for the first player of the next round
            asyncio.create_task(
                auto_fold_timer(state.room_code, next_id, state.hand_number, state.turn_index, AUTO_FOLD_SECONDS)
            )

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
    
    # Eliminate players who are out of chips
    state = eliminate_broke_players(state)
    
    # Check if game is over (only 1 player with chips remaining)
    remaining_players = [p for p in state.players.values() if not p.eliminated]
    if len(remaining_players) <= 1:
        state.phase = Phase.GAME_OVER
        return state

    # Schedule an auto-restart
    from api.socket import sio
    import asyncio
    
    async def schedule_new_hand(room_code: str):
        await asyncio.sleep(5)  # 5 seconds to view showdown
        if room_code in rooms:
            s_state = rooms[room_code]
            # Don't restart if game is over or not enough players
            if s_state.phase == Phase.GAME_OVER:
                return
            if len(s_state.players) >= 2:
                s_state = start_new_hand(s_state)
                rooms[room_code] = s_state
                for pid in list(s_state.players.keys()):
                    await sio.emit("game_state", serialize_state(s_state, pid), room=f"{room_code}:{pid}")

    asyncio.create_task(schedule_new_hand(state.room_code))

    # Emit hand_result so clients can update leaderboard
    share = state.pot // len(winners)
    for winner_id in winners:
        winner_player = state.players[winner_id]
        async def _emit_result(wid=winner_id, wname=winner_player.username, wchips=share):
            await sio.emit("hand_result", {
                "winner_id": wid,
                "username": wname,
                "chips_won": wchips,
            }, room=state.room_code)
        asyncio.create_task(_emit_result())
    
    return state

def eliminate_broke_players(state: GameState) -> GameState:
    # Mark players with 0 chips as eliminated
    broke_ids = [pid for pid, p in state.players.items() if p.chips <= 0 and not p.eliminated]
    for pid in broke_ids:
        state.players[pid].eliminated = True
        # Keep them in player_order so they stay on the table as eliminated
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
    # Including everyone who was in the room so they see the final result
    for pid in list(state.players.keys()):
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
    if check_for_hand_winner(state):
        pass # Winners handled in check_for_hand_winner
    # Advance to next player or next phase
    elif is_betting_round_over(state):
        state = advance_phase(state)
    else:
        next_id = get_next_active_player(state, player_id)
        if next_id:
            state.active_player_id = next_id
            state.turn_index += 1
            # Start auto-fold timer for next player
            asyncio.create_task(
                auto_fold_timer(room_code, next_id, state.hand_number, state.turn_index, AUTO_FOLD_SECONDS)
            )

    rooms[room_code] = state

    # Broadcast updated state to each player from their perspective
    # Including everyone who was in the room so they see the final result
    for pid in list(state.players.keys()):
        player_state = serialize_state(state, pid)
        await sio.emit("game_state", player_state, room=f"{room_code}:{pid}")

    return {"success": True}

async def auto_fold_timer(room_code: str, player_id: str, hand_number: int, turn_index: int, seconds: int) -> None:
    from api.socket import sio

    await asyncio.sleep(seconds)

    if room_code not in rooms:
        return

    state = rooms[room_code]

    # STALE TIMER PROTECTION: Verify this timer is for the CURRENT turn
    if state.hand_number != hand_number or state.turn_index != turn_index:
        return

    if state.active_player_id != player_id:
        return  # Player already acted

    player = state.players.get(player_id)
    if not player:
        return

    player.folded = True
    player.disconnected = True

    # Check for winners and advance turn
    if not check_for_hand_winner(state):
        next_id = get_next_active_player(state, player_id)
        if next_id:
            state.active_player_id = next_id
            state.turn_index += 1
            # Start next timer
            asyncio.create_task(
                auto_fold_timer(room_code, next_id, state.hand_number, state.turn_index, AUTO_FOLD_SECONDS)
            )

    rooms[room_code] = state

    for pid in list(state.players.keys()):
        await sio.emit("game_state", serialize_state(state, pid), room=f"{room_code}:{pid}")