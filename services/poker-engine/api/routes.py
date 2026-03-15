from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class CreateRoomRequest(BaseModel):
    player_id: str
    username: str

class JoinRoomRequest(BaseModel):
    room_code: str
    player_id: str
    username: str

class RoomResponse(BaseModel):
    room_code: str

@router.post("/room/create", response_model=RoomResponse)
async def create_room(request: CreateRoomRequest):
    from engine.room import create_room
    room_code = create_room(request.player_id, request.username)
    return RoomResponse(room_code=room_code)

@router.post("/room/join")
async def join_room(request: JoinRoomRequest):
    from engine.room import join_room
    join_room(request.room_code, request.player_id, request.username)
    return {"success": True}