from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

from routers import churches, events, users, media, worship, visitors, analytics, automation
from jobs.scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()

app = FastAPI(title='ChurchNavigator API', version='2.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'https://churchnavigator.com',
        'https://www.churchnavigator.com',
        'https://dev.churchnavigator.com'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(users.router)
app.include_router(media.router)
app.include_router(worship.router)
app.include_router(visitors.router)
app.include_router(analytics.router)
app.include_router(automation.router)

@app.get('/api/health')
async def health_check():
    return {'status': 'healthy', 'service': 'ChurchNavigator API'}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={'detail': str(exc)}
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', 8000)))
