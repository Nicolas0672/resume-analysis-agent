import asyncio
from contextlib import asynccontextmanager

# Key: session_id -> Value: [asyncio.Lock, ref_count: int]
session_locks: dict[str, list] = {}


@asynccontextmanager
async def session_lock(session_id: str):
    """Pessimistic session-level mutual exclusion lock with automatic reference counting.

    Guarantees that concurrent Read-Modify-Write (RMW) operations on the same session_id
    are strictly serialized to prevent lost updates on the working resume checkpoint.
    When ref_count drops to 0, the lock is automatically pruned from memory to prevent leaks.
    """
    if session_id not in session_locks:
        session_locks[session_id] = [asyncio.Lock(), 0]

    entry = session_locks[session_id]
    entry[1] += 1
    lock = entry[0]

    await lock.acquire()
    try:
        yield
    finally:
        lock.release()
        entry[1] -= 1
        if entry[1] == 0:
            session_locks.pop(session_id, None)
