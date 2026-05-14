import os
from typing import Generator, List, Optional
from dotenv import load_dotenv
from groq import Groq
load_dotenv()
_client = Groq(api_key=os.getenv("GROK_API_KEY"))

_MAX_PAGE_CHARS = 48_000

def _trim(text: str) -> str:
    if not text:
        return ""
    if len(text) <= _MAX_PAGE_CHARS:
        return text
    return text[:_MAX_PAGE_CHARS]


def process_panel_query(
    query: str,
    page_title: str,
    page_url: str,
    page_text: str,
    history: Optional[List[dict]] = None,
) -> Generator[str, None, None]:
    """
    Stream assistant tokens. `history` entries: {"role": "user"|"assistant", "content": str}.
    """
    body = _trim(page_text or "")
    system_prompt = f"""You are a helpful assistant. The user is asking about a **single web page** they opened in the browser.

Page title: {page_title or "Unknown"}
Page URL: {page_url or "Unknown"}

Below is the visible text extracted from that page. Use it as the main source of truth.
If the answer is not supported by that text, say you cannot find it in the page content.
Be concise. Use markdown lists when helpful.

--- Page text ---
{body}
--- End page text ---
"""

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history:
            role = msg.get("role", "user")
            if role not in ("user", "assistant"):
                continue
            messages.append(
                {"role": role, "content": str(msg.get("content", ""))}
            )
    messages.append({"role": "user", "content": query})

    response = _client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
        stream=True,
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content
