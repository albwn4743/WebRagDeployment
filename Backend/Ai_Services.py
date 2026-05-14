from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()
client = Groq(api_key=os.getenv("GROK_API_KEY"))
def process_query(query, retrieved_docs, history=None):
    context = ""
    for idx, doc in enumerate(retrieved_docs):
        context += f"""
Document {idx + 1}

Relevance Score:
{doc.get('score', 'N/A')}

Source URL:
{doc.get('source', 'Unknown')}

Title:
{doc.get('title', 'Unknown')}

Content:
{doc.get('text', '')}

"""

    system_prompt = f"""
You are an intelligent AI assistant that answers user questions using the provided webpage context.

Instructions:

1. Answer the user's question directly and naturally.

2. NEVER say:
- "Based on the retrieved content"
- "According to the documents"
- "The scraped content says"
- "Document 1"
- "Document 2"
- "It appears that"
- "The context mentions"

3. Do NOT explain how retrieval works.

4. Give clean, human-like answers as if you already know the information.

5. Use ONLY the provided context below as your knowledge source.

6. If the answer is not available in the context, respond ONLY with:
"I could not find information related to this question on this current website."

7. Keep answers:
- concise
- professional
- clear
- natural

8. Preserve technical accuracy for:
- APIs
- versions
- function names
- identifiers

9. If multiple context chunks contain useful information, combine them naturally into one answer.

10. Never mention:
- chunks
- retrieval
- embeddings
- vector databases
- metadata
- scores
- scraping process

Context:
{context}
"""
    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    if history:
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    messages.append({
        "role": "user",
        "content": query
    })
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
        stream=True
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content