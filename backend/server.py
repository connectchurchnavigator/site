from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from .routers import churches, users, auth, admin, visit_requests, planner_subscription, stripe_webhooks
from .scheduler import start_scheduler

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "https://churchnavigator.com")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(visit_requests.router)
app.include_router(planner_subscription.router)
app.include_router(stripe_webhooks.router)

@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "running"}