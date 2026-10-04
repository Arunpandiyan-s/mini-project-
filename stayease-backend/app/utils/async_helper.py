import asyncio
import logging

logger = logging.getLogger(__name__)

def fire_and_forget(coro):
    """
    Schedules an async coroutine on the running event loop, or runs it synchronously if no loop exists.
    Ensures that WebSocket delivery issues do not fail or delay HTTP operations.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # No running event loop (e.g. sync worker thread in FastAPI or sync pytest runner)
        try:
            # We must run it synchronously in a temporary loop
            asyncio.run(coro)
        except Exception as e:
            logger.error(f"[WebSocket delivery failure] Synchronous run failed: {e}")
    except Exception as e:
        logger.error(f"[WebSocket schedule failure] Could not schedule coroutine: {e}")
