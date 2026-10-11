import os
import logging
from typing import Optional
import psycopg
from dotenv import load_dotenv
from psycopg_pool import AsyncConnectionPool

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

_pool: Optional[AsyncConnectionPool] = None

async def init_db_pool():
    global _pool
    _pool = AsyncConnectionPool(DATABASE_URL, min_size=2, max_size=10, open=False)
    await _pool.open()

async def close_db_pool():
    global _pool
    if _pool:
        await _pool.close()

def get_pool():
    if _pool is None:
        raise RuntimeError("Pool not initialized")
    return _pool.connection()

async def init_db():
    """Ensure the user_sessions table and indexes exist in Supabase Postgres."""
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set; skipping database initialization")
        return

    try:
        async with get_pool() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    create table if not exists user_sessions (
                        session_id text primary key,
                        user_id text not null,
                        job_title text,
                        job_company text,
                        created_at timestamp with time zone default now()
                    );
                    create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
                    """
                )
            await conn.commit()
            logger.info("user_sessions table verified in Supabase Postgres")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")


async def create_user_session(
    session_id: str,
    user_id: str,
    job_title: Optional[str] = None,
    job_company: Optional[str] = None,
) -> bool:
    """Store the session ownership binding a session_id to an authenticated user_id."""
    if not DATABASE_URL:
        return False

    try:
        async with get_pool() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    insert into user_sessions (session_id, user_id, job_title, job_company)
                    values (%s, %s, %s, %s)
                    on conflict (session_id) do update set
                        job_title = coalesce(excluded.job_title, user_sessions.job_title),
                        job_company = coalesce(excluded.job_company, user_sessions.job_company);
                    """,
                    (session_id, str(user_id), job_title, job_company),
                )
            await conn.commit()
            return True
    except Exception as e:
        logger.error(f"Error creating user session in DB: {e}")
        return False


async def check_session_owner(session_id: str, user_id: str) -> bool:
    """Verify whether a session_id belongs to the requesting authenticated user."""
    if not DATABASE_URL:
        # If no DB configured, fallback to allow in dev mode
        return True

    try:
        async with get_pool() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    select user_id from user_sessions where session_id = %s;
                    """,
                    (session_id,),
                )
                row = await cur.fetchone()
                if not row:
                    return False
                return str(row[0]) == str(user_id)
    except Exception as e:
        logger.error(f"Error checking session owner in DB: {e}")
        return False


async def get_user_sessions(user_id: str) -> list[dict]:
    """Retrieve all tailoring sessions belonging to an authenticated user."""
    if not DATABASE_URL:
        return []
    print(f"Fetching sessions for user_id: {user_id}")  # Debugging line

    try:
        async with get_pool() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    select session_id, job_title, job_company, created_at
                    from user_sessions
                    where user_id = %s
                    order by created_at desc;
                    """,
                    (str(user_id),),
                )
                rows = await cur.fetchall()

                return [
                    {
                        "session_id": r[0],
                        "job_title": r[1],
                        "job_company": r[2],
                        "created_at": r[3].isoformat() if r[3] else None,
                    }
                    for r in rows
                ]
    except Exception as e:
        logger.error(f"Error fetching user sessions from DB: {e}")
        return []