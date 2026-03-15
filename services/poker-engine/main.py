from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from api.routes import router
from api.socket import sio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)