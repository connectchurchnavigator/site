from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime

from database import db
from routes import churches, auth, events, listings, visitor_tracking, premium_tools

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://churchnavigator.com",
        "https://www.churchnavigator.com",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(listings.router)
app.include_router(visitor_tracking.router)
app.include_router(premium_tools.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    try:
        db.command("ping")
        return {"status": "healthy", "database": "connected", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)