import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room_code = data["room_code"]
    player_id = data.get("player_id")
    
    from engine.room import rooms, serialize_state
    
    await sio.enter_room(sid, room_code)
    if player_id:
        await sio.enter_room(sid, f"{room_code}:{player_id}")
    
    if room_code in rooms:
        state = rooms[room_code]
        # Send initial state to the joining player
        if player_id:
            player_state = serialize_state(state, player_id)
            await sio.emit("game_state", player_state, room=sid)
            
            # Also notify others of the updated state (new player in list)
            for pid in state.player_order:
                if pid != player_id:
                    await sio.emit("game_state", serialize_state(state, pid), room=f"{room_code}:{pid}")
    else:
        await sio.emit("error", {"message": f"Room {room_code} not found"}, room=sid)
        return
        
    await sio.emit("player_joined", {"sid": sid, "player_id": player_id}, room=room_code)

@sio.event
async def start_game(sid, data):
    from engine.room import start_game_in_room
    room_code = data["room_code"]
    player_id = data["player_id"]
    result = await start_game_in_room(room_code, player_id)
    if result.get("error"):
        await sio.emit("error", {"message": result["error"]}, room=sid)

@sio.event
async def player_action(sid, data):
    from engine.room import handle_action
    room_code = data["room_code"]
    # Internal broadcasting in handle_action handles game_state updates
    await handle_action(room_code, data)
@sio.event
async def restart_game(sid, data):
    from engine.room import rooms, start_new_hand, serialize_state
    room_code = data["room_code"]
    player_id = data["player_id"]
    
    if room_code in rooms:
        state = rooms[room_code]
        for p in state.players.values():
            p.chips = 1000
            p.eliminated = False
            p.folded = False
            p.disconnected = False
            p.has_acted = False
            p.active_effects = []
            p.hole_cards = []
            
        state = start_new_hand(state)
        rooms[room_code] = state
        for pid in list(state.players.keys()):
            await sio.emit("game_state", serialize_state(state, pid), room=f"{room_code}:{pid}")
