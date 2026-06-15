import redis.asyncio as redis
import json
import os
from functools import wraps
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

redis_client = None

async def get_redis():
    global redis_client
    if not redis_client:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
    return redis_client

async def cache_get(key: str) -> Optional[Any]:
    try:
        r = await get_redis()
        val = await r.get(key)
        if val:
            return json.loads(val)
        return None
    except Exception as e:
        logger.error(f"Redis GET error for {key}: {e}")
        return None

async def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    try:
        r = await get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.error(f"Redis SET error for {key}: {e}")
        return False

async def cache_delete(key: str) -> bool:
    try:
        r = await get_redis()
        await r.delete(key)
        return True
    except Exception as e:
        logger.error(f"Redis DELETE error for {key}: {e}")
        return False

async def cache_delete_pattern(pattern: str) -> bool:
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
        return True
    except Exception as e:
        logger.error(f"Redis DELETE PATTERN error for {pattern}: {e}")
        return False

async def cache_increment(key: str, ttl: int = 86400) -> int:
    try:
        r = await get_redis()
        val = await r.incr(key)
        if val == 1:
            await r.expire(key, ttl)
        return val
    except Exception as e:
        logger.error(f"Redis INCR error for {key}: {e}")
        return 0