import os
import json
import uuid
import asyncio
from typing import Optional
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from scraping import crawl_website
from scraping_panel import scrape_panel_single_url_sync
from upload_docs import process_and_upload_documents
from Dataset import connect_weaviate, get_embeddings, search_query
from Ai_Services import process_query
from Ai_Services_panel import process_panel_query

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS_FILE = "sessions.json"
PANEL_SESSIONS_FILE = "panel_sessions.json"


def load_panel_sessions():
    if os.path.exists(PANEL_SESSIONS_FILE):
        with open(PANEL_SESSIONS_FILE, "r") as f:
            try:
                return json.load(f)
            except Exception:
                return {}
    return {}


def save_panel_sessions(sessions):
    with open(PANEL_SESSIONS_FILE, "w") as f:
        json.dump(sessions, f)


panel_sessions_db = load_panel_sessions()


def load_sessions():
    if os.path.exists(SESSIONS_FILE):
        with open(SESSIONS_FILE, "r") as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_sessions(sessions):
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f)

sessions_db = load_sessions()


class ScrapeRequest(BaseModel):
    url: str
    # depth: Optional[int] = 1
    sessionId: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    sessionId: str


class PanelScrapeRequest(BaseModel):
    url: str
    sessionId: Optional[str] = None


class PanelChatRequest(BaseModel):
    message: str
    sessionId: str

try:
    client = connect_weaviate()
    # embeddings will be fetched lazily
except Exception as e:
    print(f"Error initializing Weaviate: {e}")
    client = None

# Background Scrape Task
def background_scrape(url: str, session_id: str):
    try:
        results = asyncio.run(crawl_website(url))
        if results:
            domain = urlparse(url).netloc
            process_and_upload_documents(results, domain)
            sessions_db[session_id]["status"] = "success"
            sessions_db[session_id]["url"] = url
            sessions_db[session_id]["title"] = results[0].get("title", url) if results else url
            sessions_db[session_id]["pageCount"] = len(results)
            save_sessions(sessions_db)
        else:
            sessions_db[session_id]["status"] = "failed"
            sessions_db[session_id]["error"] = "No documents scraped."
            save_sessions(sessions_db)
    except Exception as e:
        sessions_db[session_id]["status"] = "failed"
        sessions_db[session_id]["error"] = str(e)
        save_sessions(sessions_db)


def background_panel_scrape(url: str, session_id: str):
    try:
        doc = scrape_panel_single_url_sync(url)
        if doc:
            domain = urlparse(url).netloc
            process_and_upload_documents([doc], domain)
            text = doc.get("content") or ""
            panel_sessions_db[session_id]["status"] = "success"
            panel_sessions_db[session_id]["url"] = url
            panel_sessions_db[session_id]["title"] = doc.get("title", url)
            panel_sessions_db[session_id]["pageCount"] = 1
            panel_sessions_db[session_id]["pageText"] = text[:200000]
            save_panel_sessions(panel_sessions_db)
        else:
            panel_sessions_db[session_id]["status"] = "failed"
            panel_sessions_db[session_id]["error"] = "No content extracted from this page."
            save_panel_sessions(panel_sessions_db)
    except Exception as e:
        panel_sessions_db[session_id]["status"] = "failed"
        panel_sessions_db[session_id]["error"] = str(e)
        save_panel_sessions(panel_sessions_db)


@app.post("/api/scrape")
async def scrape_api(req: ScrapeRequest, background_tasks: BackgroundTasks):
    session_id = req.sessionId or str(uuid.uuid4())
    
    if session_id not in sessions_db:
        sessions_db[session_id] = {
            "id": session_id,
            "url": req.url,
            "title": "Scraping...",
            "history": [],
            "status": "scraping",
            "pageCount": 0,
            "error": None
        }
        save_sessions(sessions_db)
        
    background_tasks.add_task(background_scrape, req.url, session_id)
    return {"sessionId": session_id, "status": "scraping"}

@app.get("/api/scrape/{session_id}")
async def get_scrape_status(session_id: str):
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions_db[session_id]
    if session["status"] == "success":
        return {
            "status": "success",
            "sessionId": session_id,
            "stats": {
                "url": session.get("url", ""),
                "title": session.get("title", ""),
                "pagesScraped": session.get("pageCount", 0),
                "chunksCreated": session.get("pageCount", 0) * 5 # mock chunk count
            }
        }
    elif session["status"] == "failed":
        return {"status": "failed", "error": session.get("error", "Unknown error")}
    else:
        return {"status": "scraping"}


@app.post("/api/panel/scrape")
async def panel_scrape_api(req: PanelScrapeRequest, background_tasks: BackgroundTasks):
    session_id = req.sessionId or str(uuid.uuid4())
    panel_sessions_db[session_id] = {
        "id": session_id,
        "url": req.url,
        "title": "Scraping…",
        "history": [],
        "status": "scraping",
        "pageCount": 0,
        "pageText": "",
        "error": None,
    }
    save_panel_sessions(panel_sessions_db)
    background_tasks.add_task(background_panel_scrape, req.url, session_id)
    return {"sessionId": session_id, "status": "scraping"}


@app.get("/api/panel/scrape/{session_id}")
async def get_panel_scrape_status(session_id: str):
    if session_id not in panel_sessions_db:
        raise HTTPException(status_code=404, detail="Panel session not found")
    session = panel_sessions_db[session_id]
    if session["status"] == "success":
        return {
            "status": "success",
            "sessionId": session_id,
            "stats": {
                "url": session.get("url", ""),
                "title": session.get("title", ""),
                "pagesScraped": session.get("pageCount", 0),
            },
        }
    if session["status"] == "failed":
        return {"status": "failed", "error": session.get("error", "Unknown error")}
    return {"status": "scraping"}


@app.post("/api/panel/chat")
async def panel_chat_api(req: PanelChatRequest):
    session_id = req.sessionId
    if session_id not in panel_sessions_db:
        raise HTTPException(status_code=404, detail="Panel session not found")
    session = panel_sessions_db[session_id]
    if session.get("status") != "success":
        raise HTTPException(status_code=400, detail="Scrape this URL first (panel session not ready).")
    user_msg = req.message
    history = panel_sessions_db[session_id].get("history", [])
    page_text = session.get("pageText", "")
    page_title = session.get("title", "")
    page_url = session.get("url", "")

    try:
        history.append({"role": "user", "content": user_msg, "id": str(uuid.uuid4())})

        def generate_and_save():
            full_response = ""
            recent_history = history[-7:-1] if len(history) > 7 else history[:-1]
            for chunk in process_panel_query(
                user_msg,
                page_title,
                page_url,
                page_text,
                history=recent_history,
            ):
                full_response += chunk
                yield chunk
            history.append(
                {
                    "role": "assistant",
                    "content": full_response,
                    "id": str(uuid.uuid4()),
                }
            )
            panel_sessions_db[session_id]["history"] = history
            save_panel_sessions(panel_sessions_db)

        return StreamingResponse(generate_and_save(), media_type="text/plain")
    except Exception as e:
        print(f"Error panel chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_api(req: ChatRequest):
    session_id = req.sessionId
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    user_msg = req.message
    history = sessions_db[session_id].get("history", [])
    
    if client is None:
        raise HTTPException(status_code=500, detail="Backend services not fully initialized")
    try:
        embeddings = get_embeddings()
        # Extract domain from session URL
        session = sessions_db[session_id]
        session_url = session.get("url", "")
        domain = urlparse(session_url).netloc if session_url else None
        
        # Search in Weaviate with domain filter
        results = search_query(user_msg, client, embeddings, domain=domain)
        
        # Append user message immediately
        history.append({"role": "user", "content": user_msg, "id": str(uuid.uuid4())})
        
        def generate_and_save():
            full_response = ""
            recent_history = history[-7:-1] if len(history) > 7 else history[:-1]
            for chunk in process_query(user_msg, results, history=recent_history):
                full_response += chunk
                yield chunk
                
            # Save assistant message to history after stream completes
            history.append({
                "role": "assistant",
                "content": full_response,
                "id": str(uuid.uuid4())
            })
            sessions_db[session_id]["history"] = history
            save_sessions(sessions_db)

        return StreamingResponse(generate_and_save(), media_type="text/plain")
        
    except Exception as e:
        print(f"Error processing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    out = []
    for sid, sdata in sessions_db.items():
        if sdata.get("status") == "success":
            out.append({
                "id": sid,
                "url": sdata.get("url", ""),
                "title": sdata.get("title", ""),
                "pageCount": sdata.get("pageCount", 0),
                "messageCount": len(sdata.get("history", [])),
                "createdAt": sdata.get("createdAt", "")
            })
    return {"sessions": out}

@app.get("/api/history/{session_id}")
async def get_session_history(session_id: str):
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"history": sessions_db[session_id].get("history", [])}

@app.delete("/api/chat/{session_id}")
async def delete_session(session_id: str):
    if session_id in sessions_db:
        del sessions_db[session_id]
        save_sessions(sessions_db)
    return {"success": True}

@app.delete("/api/chat/{session_id}/history")
async def clear_session_history(session_id: str):
    if session_id in sessions_db:
        sessions_db[session_id]["history"] = []
        save_sessions(sessions_db)
    return {"success": True}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
