from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import churches, events, jobs, auth, flyers
from app.database import init_db

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com", "https://dev.churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "status": "online"}

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(jobs.router)
app.include_router(auth.router)
app.include_router(flyers.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)