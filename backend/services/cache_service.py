import redis.asyncio as redis
import json
import os
from functools import wraps
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

redis_client: Optional[redis.Redis] = None

async def get_redis() -> redis.Redis:
    global redis_client
    if not redis_client:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30
        )
        try:
            await redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            redis_client = None
            raise
    return redis_client

async def cache_get(key: str) -> Optional[Any]:
    try:
        r = await get_redis()
        val = await r.get(key)
        if val:
            return json.loads(val)
        return None
    except Exception as e:
        logger.error(f"Cache get error for {key}: {e}")
        return None

async def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    try:
        r = await get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.error(f"Cache set error for {key}: {e}")
        return False

async def cache_delete(key: str) -> bool:
    try:
        r = await get_redis()
        await r.delete(key)
        return True
    except Exception as e:
        logger.error(f"Cache delete error for {key}: {e}")
        return False

async def cache_delete_pattern(pattern: str) -> int:
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            deleted = await r.delete(*keys)
            logger.info(f"Deleted {deleted} cache keys matching {pattern}")
            return deleted
        return 0
    except Exception as e:
        logger.error(f"Cache delete pattern error for {pattern}: {e}")
        return 0

async def cache_clear_all() -> bool:
    try:
        r = await get_redis()
        await r.flushdb()
        logger.info("All cache cleared")
        return True
    except Exception as e:
        logger.error(f"Cache clear all error: {e}")
        return False