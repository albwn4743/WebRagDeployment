import asyncio
import atexit
import sys
import gc
from urllib.parse import urlparse
from scraping import get_browser, process_single_page, shutdown

async def scrape_panel_single_url(url: str):
    domain = urlparse(url).netloc
    browser = await get_browser()
    document, _ = await process_single_page(url, browser, domain)
    return document

def scrape_panel_single_url_sync(url: str):
    """Synchronous wrapper — safe to call from a thread but NOT from inside
    an already-running event loop (e.g. directly in an async FastAPI route).
    For FastAPI, use 'await scrape_panel_single_url(url)' instead.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        raise RuntimeError(
            "scrape_panel_single_url_sync() called from a running event loop. "
            "Use 'await scrape_panel_single_url(url)' instead."
        )

    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(scrape_panel_single_url(url))
        finally:
            loop.run_until_complete(asyncio.sleep(0.25))
            loop.close()
    else:
        return asyncio.run(scrape_panel_single_url(url))


def _atexit_shutdown():
    """Best-effort cleanup of the shared Playwright browser on process exit."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        loop.run_until_complete(shutdown())
    except Exception:
        pass  # Never raise in atexit


atexit.register(_atexit_shutdown)


if __name__ == "__main__":
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
        try:
            url = input("URL: ").strip()
            doc = loop.run_until_complete(scrape_panel_single_url(url))
        finally:
            loop.run_until_complete(asyncio.sleep(0.25))
            loop.close()
    else:
        url = input("URL: ").strip()
        doc = asyncio.run(scrape_panel_single_url(url))

    if doc:
        print("Title:", doc.get("title"))
        print("Chars:", len(doc.get("content") or ""))
    else:
        print("No document extracted.")