# WebRAG Chat Bot

Hi, this is a small project I made where you paste a website link and the app tries to "read" the site and then you can ask questions about it in a chat. It uses something called RAG (basically: save pieces of the website in a database, search the relevant parts when you ask something, then send that text to an AI so it can answer).

There is also a chrome extension part that only looks at **one page** (the tab you are on) instead of crawling a whole site. The main app is more for a full URL / multiple pages.

## What my program does (simple version)

1. It opens pages with Playwright and grabs the text.
2. It cuts the text into smaller chunks and turns them into vectors (embeddings) with a Hugging Face model (`all-MiniLM-L6-v2` )
3. It saves everything in Weaviate (cloud). If the collection does not exist yet my code creates it.
4. When you chat, it searches Weaviate for chunks that match your question (it uses hybrid search = keyword + vector together).
5. The AI I use is Groq. The backend sends the found text as context and streams the answer back.`

The panel / extension flow is similar but for one page the important context is mostly the text we scraped from that tab.

## Folder structure (where stuff is)

- `Backend/` - python server, scraping, database stuff, AI calls. Start with `main.py`
- `Frontend/` - react app made with Vite
- `chrome-extension/` - optional extension for the side panel thing

## Stuff you need installed first

- Python (I use 3.10+)
- Node.js and npm
- A Weaviate cloud account (you need the cluster URL and API key from their website)
- A Groq API key (sign up on groq's site)
- After installing playwright in python you MUST run `playwright install` or scraping will fail

## How to run the backend

Open a terminal in the project folder:

```bash
cd Backend
python -m venv .venv
```

On Windows PowerShell to activate:

```powershell
.\.venv\Scripts\Activate.ps1
```

Then install packages (copy paste is fine):

```bash
pip install fastapi uvicorn pydantic python-dotenv weaviate-client groq langchain-community langchain-text-splitters playwright
playwright install
```

Make a file called `.env` inside `Backend/` and put your real keys:

```env
WEAVIATE_CLUSTER_URL=your url here
WEAVIATE_API_KEY=your key here
GROK_API_KEY=your groq key here
```

Note: the variable is literally named `GROK_API_KEY` in my code (typo maybe lol) so use that name or change the python files.

Start server:

```bash
python main.py
```

It should listen on port 8000.

## How to run the frontend

New terminal:

```bash
cd Frontend
npm install
npm run dev
```

Then open whatever link vite shows (usually localhost:5173).

By default the frontend talks to `http://localhost:8000/api`. If your backend is somewhere else make a `.env` file in Frontend:

```env
VITE_API_URL=http://localhost:8000/api
```

To build for production you can do `npm run build` and then `npm run preview` to test the build.

## Chrome extension (if you want it)

1. Backend and frontend both running.
2. Chrome -> extensions -> developer mode on -> load unpacked -> choose the `chrome-extension` folder.
3. Click extension options and set the origin to your vite url (default `http://localhost:5173`).
4. Open the side panel on a normal website (not chrome:// pages) and try it.

If you change port you might need to edit `manifest.json` host permissions - I only set localhost ports there.

## How to use the normal web app

1. Start backend + frontend.
2. Put in a URL and wait until scraping / indexing is done (dont spam click if its slow).
3. Chat. The answers should be based on what got saved from that site.

Sessions are saved as json files in Backend (`sessions.json` and `panel_sessions.json`) - good enough for learning / local dev, not really "production" style.

## Packages I used (rough list)

Backend: fastapi, uvicorn, weaviate client, groq, langchain stuff, playwright, dotenv

Frontend: react, vite, axios, markdown rendering libs

If something breaks double check .env keys and that playwright browsers installed. Good luck
