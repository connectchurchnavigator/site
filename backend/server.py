from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from database import db
from routers import churches, auth, reviews, events, media, worship, sites
from middleware.sites_middleware import SitesMiddleware

app = FastAPI(title='ChurchNavigator API', version='2.0.0')

app.add_middleware(SitesMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'https://churchnavigator.com',
        'https://dev.churchnavigator.com'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(reviews.router)
app.include_router(events.router)
app.include_router(media.router)
app.include_router(worship.router)
app.include_router(sites.router)

@app.get('/')
async def root():
    return {'message': 'ChurchNavigator API v2.0', 'status': 'running'}

@app.get('/health')
async def health():
    return {'status': 'healthy'}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={'detail': str(exc)}
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', 8000)))