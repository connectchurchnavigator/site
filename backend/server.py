from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import churches, events, pastors, chat
import os

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, tags=["churches"])
app.include_router(events.router, tags=["events"])
app.include_router(pastors.router, tags=["pastors"])
app.include_router(chat.router, tags=["chat"])

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "operational"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)