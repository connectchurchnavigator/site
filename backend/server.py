from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from routes import churches, users
from auth_routes import router as auth_router
from database import connect_to_mongo, close_mongo_connection

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
    "https://dev.churchnavigator.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.on_event("startup")
async def startup_event():
    connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    close_mongo_connection()

app.include_router(auth_router)
app.include_router(churches.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {
        "message": "ChurchNavigator API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)