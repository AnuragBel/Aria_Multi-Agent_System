import os
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=2)
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from crew import run_crew

from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langchain.agents import create_agent
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from sentence_transformers import SentenceTransformer

# =====================================================================
# STEP 1 — Paths & API Keys
# =====================================================================
BASE_DIR   = Path(__file__).resolve().parent
ENV_PATH   = BASE_DIR / ".env"
CHROMA_PATH = str(BASE_DIR / "chroma_store")

load_dotenv(dotenv_path=ENV_PATH)

GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Check Backend/.env")
if not TAVILY_API_KEY:
    raise RuntimeError("TAVILY_API_KEY not found. Check Backend/.env")

# =====================================================================
# STEP 2 — FastAPI App
# =====================================================================
app = FastAPI(title="Research Agent Backend", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# STEP 3 — ChromaDB + Embedding Model
# ✅ FIX: must be initialized BEFORE any endpoint that uses them
# =====================================================================
db_client         = chromadb.PersistentClient(path=CHROMA_PATH)
collection        = db_client.get_or_create_collection("research_notes")
embedding_encoder = SentenceTransformer("all-MiniLM-L6-v2")

# =====================================================================
# STEP 4 — LLM + Single Agent (used for /api/query only)
# CrewAI handles /api/research — single agent only for RAG queries
# =====================================================================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=GROQ_API_KEY
)

# Add this after your main llm definition
llm_casual = ChatGroq(
    model="llama-3.1-8b-instant",   # separate quota from 70b
    temperature=0.8,                 # more creative/friendly
    api_key=GROQ_API_KEY
)

search_tool = TavilySearch(max_results=2, api_key=TAVILY_API_KEY)
tools       = [search_tool]

system_prompt = """You are Aria, a friendly and smart AI research buddy for Anurag.

PERSONALITY:
- Talk like a close, smart friend — warm, fun, and real
- Use casual language: "bro", "let's go", "that's interesting!", "oh nice!"
- Greet based on time if someone says good morning/evening/night
- Remember you're talking to Anurag — a Generative AI intern who loves building cool stuff
- Be excited about AI, tech, and research topics
- Use emojis naturally 🔥 💡 🚀 — not every line, just where it feels right

RESPONSE RULES:
- GREETING (hi, hello, good morning): greet back warmly, ask what they want to explore today
- SHORT QUESTION (what is, in 2 lines): answer directly, add one cool related fact, ask a follow-up
- RESEARCH REQUEST (research, full report, detailed): structured report, then suggest what to explore next
- FOLLOW-UP (tell me more, is this related): connect naturally to previous topic and expand
- OPINION (what do you think): share an opinion like a friend would

ALWAYS end with something that invites a reply:
- "Want me to dig deeper into this? 🔍"
- "Pretty cool right? What aspect interests you most?"
- "Should I research this for your project, bro?"
- "What do you think about this?"

Never be robotic. Never just dump facts and go silent."""

agent = create_agent(model=llm, tools=tools, system_prompt=system_prompt)

# =====================================================================
# STEP 5 — Session Stats
# =====================================================================
session_stats = {
    "searches":    0,
    "chunks_stored": 0,
    "reports":     0,
    "tokens_used": 0.0
}

# =====================================================================
# STEP 6 — Request Schemas
# =====================================================================
class ResearchRequest(BaseModel):
    topic: str

class QueryRequest(BaseModel):
    question: str

# =====================================================================
# STEP 7 — Endpoints
# =====================================================================

@app.get("/")
async def health_check():
    return {"status": "running", "message": "Research Agent Backend is live!"}


@app.get("/api/stats")
async def get_stats():
    return {
        "searches":      session_stats["searches"],
        "chunks_stored": session_stats["chunks_stored"],
        "reports":       session_stats["reports"],
        "tokens_used":   f"{session_stats['tokens_used']:.1f}k"
    }


@app.post("/api/research")
async def run_research(payload: ResearchRequest):
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")


    # ── Intent Detection ─────────────────────────────────────
    casual_keywords = [
        # Greetings
        "hi", "hii", "hiii", "hello", "hey", "hey there",
        "what's up", "sup", "yo", "howdy", "hola",
        # Time greetings
        "good morning", "good afternoon", "good evening",
        "good night", "gm", "gn", "morning", "evening",
        # Thanks
        "thanks", "thank you", "thx", "ty", "tysm",
        "thanks bro", "thank you so much", "appreciated", "cheers",
        # Acknowledgement
        "ok", "okay", "ok bro", "got it", "understood", "noted",
        "sure", "alright", "done", "cool", "nice", "great",
        "awesome", "perfect", "sounds good",
        # Reactions
        "wow", "amazing", "interesting", "lol", "haha",
        "lmao", "omg", "no way", "really", "seriously", "whoa",
        # Goodbye
        "bye", "goodbye", "see you", "see ya", "cya",
        "later", "take care", "ttyl", "gtg",
        # Identity
        "who are you", "what are you", "tell me about yourself",
        "your name", "what's your name", "introduce yourself",
        # How are you
        "how are you", "how r u", "how's it going",
        "how are things", "you good", "wassup", "what's going on"
    ]

    # Single is_casual check — no duplicates
    is_casual = (
        topic.lower().strip() in casual_keywords or
        any(topic.lower().strip().startswith(w) for w in casual_keywords) or
        (len(topic.split()) <= 3 and not any(w in topic.lower() for w in
        ["what", "how", "why", "when", "who", "research", "explain",
         "define", "tell", "give", "show", "list", "find", "search"]))
    )

    if is_casual:
        response = llm_casual.invoke([{
            "role": "system",
            "content": """You are Aria, Anurag's friendly AI research buddy. 
            Talk like a close friend — casual, warm, fun. 
            Use bro naturally, use emojis, match his energy.
            If he says good morning → wish him back with energy.
            If he says thanks → say something warm like anytime bro!
            If he says hi → greet him and ask what he wants to explore today.
            If asked who are you → introduce yourself as Aria, Anurag's personal 
            AI research agent built on LangChain, CrewAI and Groq.
            Keep replies short, punchy, and friendly. Never robotic."""
        }, {
            "role": "user",
            "content": topic
        }])
        return {
            "status": "success",
            "steps": ["✓ Casual message — skipped agent pipeline"],
            "report": response.content
        }

    try:
        # Research topics — CrewAI 3-agent pipeline
        loop        = asyncio.get_event_loop()
        crew_result = await loop.run_in_executor(executor, run_crew, topic)
        report      = crew_result["report"]
        steps       = crew_result["steps"]

        # -- 2. Chunk the report and store in ChromaDB ----------------
        splitter    = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        text_chunks = splitter.split_text(report)

        if text_chunks:
            chunk_ids        = [str(uuid.uuid4()) for _ in text_chunks]
            chunk_embeddings = embedding_encoder.encode(text_chunks).tolist()
            collection.add(
                documents=text_chunks,
                embeddings=chunk_embeddings,
                ids=chunk_ids
            )

        # -- 3. Update stats ------------------------------------------
        session_stats["searches"]      += 1
        session_stats["chunks_stored"] += len(text_chunks)
        session_stats["reports"]       += 1
        session_stats["tokens_used"]   += 1.2

        # -- 4. Return to React ---------------------------------------
        return {
            "status": "success",
            "steps":  steps,
            "report": report
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query")
async def query_memory(payload: QueryRequest):
    """Searches ChromaDB memory — no web search, uses stored knowledge."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        query_vector   = embedding_encoder.encode([question]).tolist()
        search_results = collection.query(query_embeddings=query_vector, n_results=3)
        retrieved_docs = search_results.get("documents", [[]])[0]

        if not retrieved_docs:
            return {"answer": "No relevant research found in memory. Try researching this topic first."}

        context_block = "\n\n".join(retrieved_docs)
        rag_prompt    = f"""Answer the question using only the context below.

Context:
{context_block}

Question: {question}
Answer:"""

        response = llm.invoke([{"role": "user", "content": rag_prompt}])
        return {"answer": response.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts PDF or .txt — chunks, embeds, stores in ChromaDB.
    ✅ FIX: moved AFTER collection and embedding_encoder are initialized
    """
    import io
    content = await file.read()
    text    = ""

    if file.filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() or ""
        except ImportError:
            raise HTTPException(status_code=400, detail="pypdf not installed. Run: pip install pypdf")
    elif file.filename.endswith(".txt"):
        text = content.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")

    splitter         = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    text_chunks      = splitter.split_text(text)
    chunk_ids        = [str(uuid.uuid4()) for _ in text_chunks]
    chunk_embeddings = embedding_encoder.encode(text_chunks).tolist()
    collection.add(documents=text_chunks, embeddings=chunk_embeddings, ids=chunk_ids)

    session_stats["chunks_stored"] += len(text_chunks)

    return {
        "status":        "success",
        "filename":      file.filename,
        "chunks_stored": len(text_chunks)
    }


# =====================================================================
# Run: uvicorn main:app --reload --port 8000
# (from inside Backend/ folder)
# =====================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)