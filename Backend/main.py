import os
import re
import uuid
import asyncio
import shutil
import io
import json
import json_repair
import chromadb
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from crew import run_crew

from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from memory import UserProfile, ContextExtractor, ProfileInjector

executor = ThreadPoolExecutor(max_workers=2)

def format_followup_for_user(text: str) -> str:
    """Format AI follow-up suggestions from the USER's perspective (like ChatGPT & Claude)."""
    if not text:
        return ""
    t = text.strip()
    t = re.sub(r"^(?:\d+[\.\)]|\-|\*|•)\s*", "", t)

    m = re.match(r"^(?:do you want to see|want to see)\s+(how to\s+.*)", t, re.IGNORECASE)
    if m:
        return f"Yes, show me {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:do you want to see|want to see)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Yes, I want to see {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:do you want me to|would you like me to)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Yes, please {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:do you want to|would you like to|want to)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Yes, I want to {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:should I|can I)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Yes, please {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:shall we|let's)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Let's {m.group(1).rstrip(' ?')}"

    m = re.match(r"^(?:are you interested in)\s+(.*)", t, re.IGNORECASE)
    if m:
        return f"Tell me more about {m.group(1).rstrip(' ?')}"

    return t


# =====================================================================
# STEP 1 — Paths & API Keys
# =====================================================================
BASE_DIR   = Path(__file__).resolve().parent
ENV_PATH   = BASE_DIR / ".env"
CHROMA_PATH = str(BASE_DIR / "chroma_store")
UPLOAD_DIR  = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(dotenv_path=ENV_PATH)

GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GROQ_MODEL     = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

runtime_settings = {
    "model": GROQ_MODEL,
    "chunk_size": 500,
    "chunk_overlap": 50
}

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Check Backend/.env")
if not TAVILY_API_KEY:
    raise RuntimeError("TAVILY_API_KEY not found. Check Backend/.env")

# =====================================================================
# STEP 2 — FastAPI App Setup
# =====================================================================
app = FastAPI(title="Research Agent Backend", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# STEP 3 — ChromaDB + Embedding Model
# =====================================================================
db_client         = chromadb.PersistentClient(path=CHROMA_PATH)
collection        = db_client.get_or_create_collection("research_notes")
embedding_encoder = SentenceTransformer("all-MiniLM-L6-v2")

# =====================================================================
# STEP 4 — LLM & Agents Setup
# =====================================================================
llm = ChatGroq(
    model=GROQ_MODEL,
    temperature=0,
    api_key=GROQ_API_KEY
)

llm_casual = ChatGroq(
    model=GROQ_MODEL,
    temperature=0.8,
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
- Use emojis naturally 🔥 💡 🚀

RESPONSE FORMAT:
You MUST return a valid JSON object with exactly these keys:
{
  "answer": "string — the main response content, including any code blocks, markdown, explanations, research findings",
  "follow_ups": ["prompt1", "prompt2", "prompt3"] — 2-3 suggested follow-up prompts written from the USER'S PERSPECTIVE
}

CRITICAL RULES FOR FOLLOW-UP PROMPTS ("follow_ups"):
Write every follow-up suggestion as a prompt the USER would ask or click next (same as ChatGPT and Claude suggestion chips).
- NEVER phrase them as questions directed to the user (do NOT say "Do you want to see...?", "Would you like to...?", "Want to learn...?").
- ALWAYS write them as first-person user requests, affirmative actions, or user questions:
  * "Yes, show me how to swap elements inside a list or array"
  * "Show me code examples in Python and C++"
  * "How does this compare to tuples or dictionaries?"
  * "Explain the time and space complexity of this approach"

The "answer" field contains ALL substantive content.
Return ONLY the JSON object, no extra text, no markdown fences."""

# =====================================================================
# STEP 5 — Cross-Session Memory Layer
# =====================================================================
user_profile = UserProfile.load("default")
context_extractor = ContextExtractor(llm=llm)

# =====================================================================
# STEP 6 — Session Stats
# =====================================================================
session_stats = {
    "searches":      0,
    "chunks_stored": 0,
    "reports":       0,
    "tokens_used":   0.0
}

# =====================================================================
# STEP 7 — Request Schemas
# =====================================================================
class ResearchRequest(BaseModel):
    topic: str
    deep_research: bool = False
    is_followup: bool = False
    history: list[dict] = []
    project_context: dict | None = None


class ResearchResponse(BaseModel):
    status: str
    steps: list[str] = []
    answer: str
    reaction: str = ""
    followup_questions: list[str] = []

class QueryRequest(BaseModel):
    question: str


def retrieve_uploaded_context(question: str, limit: int = 8) -> tuple[list[str], list[str]]:
    """Retrieve the most relevant chunks from files uploaded to the knowledge base."""
    if collection.count() == 0:
        return [], []

    query_vector = embedding_encoder.encode([question]).tolist()
    search_results = collection.query(
        query_embeddings=query_vector,
        n_results=min(limit, collection.count()),
        where={"type": "upload"},
        include=["documents", "metadatas"],
    )
    documents = search_results.get("documents", [[]])[0] or []
    metadatas = search_results.get("metadatas", [[]])[0] or []
    sources = []
    for metadata in metadatas:
        source = metadata.get("source") if metadata else None
        if source and source not in sources:
            sources.append(source)
    return documents, sources


# =====================================================================
# STEP 8 — Endpoints
# =====================================================================

@app.get("/")
async def health_check():
    return {"status": "running", "message": "Research Agent Backend is live!"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "research-agent-backend"}


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible models endpoint for clients that expect it."""
    return {
        "object": "list",
        "data": [
            {
                "id": "openai/gpt-oss-120b",
                "object": "model",
                "created": 0,
                "owned_by": "research-agent",
            },
            {
                "id": "qwen/qwen3.8-27b",
                "object": "model",
                "created": 0,
                "owned_by": "research-agent",
            },
            {
                "id": "openai/gpt-oss-20b",
                "object": "model",
                "created": 0,
                "owned_by": "research-agent",
            },
        ],
    }


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

    try:
        uploaded_context, uploaded_sources = retrieve_uploaded_context(topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not retrieve uploaded document context: {e}") from e

    document_context = ""
    if uploaded_context:
        source_label = ", ".join(uploaded_sources) or "uploaded documents"
        context_block = "\n\n".join(uploaded_context)
        document_context = (
            f"[UPLOADED DOCUMENT CONTEXT — sources: {source_label}]\n"
            "Use this context when the request refers to an uploaded document. "
            "For summaries, summarize only the supplied document context and do not claim "
            "that the file is unavailable.\n\n"
            f"{context_block}\n"
            "[END UPLOADED DOCUMENT CONTEXT]"
        )

    # ── Reload profile for latest long-term context ──────────────
    user_profile.reload()
    profile_context = user_profile.get_context_summary()

    casual_keywords = [
        "hi", "hii", "hiii", "hello", "hey", "hey there", "what's up", "sup", "yo",
        "good morning", "good afternoon", "good evening", "good night", "gm", "gn",
        "thanks", "thank you", "thanks bro", "ok", "okay", "ok bro", "got it", "cool",
        "nice", "awesome", "wow", "bye", "who are you", "how are you"
    ]

    format_keywords = [
        "dotted", "bullet", "bulleted", "list format", "line by line", "one line",
        "numbered", "outline", "points", "point form"
    ]

    is_casual = (
        not payload.is_followup and (
            topic.lower().strip() in casual_keywords or
            any(topic.lower().strip().startswith(w) for w in casual_keywords) or
            any(fk in topic.lower() for fk in format_keywords) or
            (len(topic.split()) <= 3 and not any(w in topic.lower() for w in
             ["what", "how", "why", "when", "who", "research", "explain", "define",
               "tell", "give", "show", "list", "find", "search"]))
        )
        and not uploaded_context
    )

    if is_casual:
        casual_system = """You are Aria, Anurag's friendly AI research buddy.

PERSONALITY:
- Talk like a close, smart friend — warm, fun, and real
- Use casual language: "bro", "let's go", "that's interesting!", "oh nice!"
- Greet based on time if someone says good morning/evening/night
- Be excited about AI, tech, and research topics
- Use emojis naturally 🔥 💡 🚀

CRITICAL RULES:
1. NEVER reference any project, topic, or fact not explicitly mentioned in the user's current message
2. If the user asks for a specific format (bullet points, dotted, line by line, one line at a time, etc.), THAT FORMAT TAKES PRIORITY over personality flourishes
3. Do NOT invent context, history, or follow-ups about topics never mentioned
4. Keep responses SHORT and focused on the current message only
5. End with 1-3 relevant follow-up questions only if they naturally flow from the current exchange

RESPONSE FORMAT:
Return a valid JSON object with exactly these keys:
{
  "answer": "clean factual answer only — plain text, no emojis, no reactions, no JSON, no formatting",
  "reaction": "ONE short casual reaction with emojis, e.g. 'Oh nice! 🤩' or 'Great question, bro! 🚀' or empty string",
  "follow_ups": ["prompt1", "prompt2", "prompt3"] — 1-3 suggested prompts written from the USER'S PERSPECTIVE (like ChatGPT & Claude)
}

CRITICAL RULES FOR "follow_ups":
- NEVER ask the user questions (do NOT say "Do you want to see...?", "Want to learn...?").
- Write from the USER'S VOICE as what they would ask next:
  * "Yes, show me how to swap elements inside a list or array"
  * "Show me common real-world FPGA applications"
  * "How do I get started with FPGA programming?"

EXAMPLE CORRECT OUTPUT:
{
  "answer": "FPGA stands for Field-Programmable Gate Array. It is a type of integrated circuit that can be programmed after manufacturing.",
  "reaction": "Cool tech! 🤖",
  "follow_ups": [
    "Yes, show me how FPGAs differ from ASICs and GPUs",
    "Show me common real-world FPGA applications",
    "How do I get started with FPGA programming?"
  ]
}

EXAMPLE WRONG OUTPUT (do NOT do this):
{
  "answer": "{\"answer\": \"FPGA...\", \"reaction\": \"...\"}",
  "reaction": "",
  "follow_ups": []
}

Return ONLY the JSON object, no extra text, no markdown fences."""

        response = llm_casual.invoke([{
            "role": "system",
            "content": casual_system
        }, {
            "role": "user",
            "content": topic
        }])

        # Extract context from casual exchanges too (but don't inject profile context)
        extracted = context_extractor.extract(topic, response.content, "")
        user_profile.merge_extraction(extracted)
        user_profile.push_topic(topic)
        user_profile.save()

        # Parse JSON response with fallback
        def extract_from_nested(obj):
            """If answer contains JSON string, extract real answer/reaction/follow_ups from it."""
            if isinstance(obj, dict):
                ans = obj.get("answer", "")
                react = obj.get("reaction", "")
                ups = obj.get("follow_ups", [])
                # Check if answer itself is a JSON stringified JSON string
                if isinstance(ans, str) and ans.strip().startswith("{") and '"answer"' in ans:
                    # Try json_repair for robust parsing
                    try:
                        nested = json_repair.loads(ans)
                        nested_ans = nested.get("answer", "")
                        nested_react = nested.get("reaction", react)
                        nested_ups = nested.get("follow_ups", ups)
                        if not nested_ans:
                            return (ans, react, ups)
                        return (nested_ans, nested_react, nested_ups)
                    except Exception:
                        pass
            return (obj.get("answer", ""), obj.get("reaction", ""), obj.get("follow_ups", []))

        try:
            # Use json_repair for the main response too
            parsed = json_repair.loads(response.content)
            answer, reaction, follow_ups = extract_from_nested(parsed)
            if not answer:
                answer = response.content
                reaction = ""
                follow_ups = []
        except Exception:
            answer = response.content
            reaction = ""
            follow_ups = []

        return ResearchResponse(
            status="success",
            steps=[],
            answer=answer,
            reaction=reaction,
            followup_questions=[format_followup_for_user(q) for q in follow_ups if q]
        ).model_dump()

    try:
        followup_questions = []
        if payload.deep_research:
            # Inject profile into the topic for CrewAI agents
            session_project = payload.project_context
            context_parts = []
            
            if profile_context:
                if session_project and session_project.get("name"):
                    profile_lines = profile_context.split("\n")
                    filtered_lines = [line for line in profile_lines 
                                    if not line.startswith("Active Project:") 
                                    and not line.startswith("Project Description:")]
                    profile_context = "\n".join(filtered_lines)
                if profile_context:
                    context_parts.append(profile_context)
            
            if session_project and session_project.get("name"):
                context_parts.append(f"Active Project: {session_project['name']}")
                if session_project.get("description"):
                    context_parts.append(f"Project Description: {session_project['description']}")
            
            full_context = "\n".join(context_parts) if context_parts else ""
            crew_topic = topic
            if full_context:
                crew_topic = (
                    f"[USER PROFILE CONTEXT]\n{full_context}\n\n"
                    f"[QUERY]\n{topic}"
                )
            if document_context:
                crew_topic = f"{document_context}\n\n{crew_topic}"
            loop        = asyncio.get_event_loop()
            crew_result = await loop.run_in_executor(executor, run_crew, crew_topic)
            report      = crew_result["report"]
            steps       = crew_result["steps"]
        else:
            # Build messages with conversation history only (no profile context to avoid hallucination)
            history_messages = payload.history[-6:] if payload.history else []
            
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(history_messages)
            user_content = topic
            if document_context:
                user_content = f"{document_context}\n\nUser request: {topic}"
            messages.append({"role": "user", "content": user_content})
            
            result = llm.invoke(messages)
            raw_content = result.content
            steps = ["✓ Single agent — fast mode"]
            
            # Parse structured JSON response
            try:
                parsed = json.loads(raw_content)
                report = parsed.get("answer", raw_content)
                followup_questions = parsed.get("follow_ups", [])
            except json.JSONDecodeError:
                report = raw_content
                followup_questions = []

        # Chunk the report and store in ChromaDB
        splitter    = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        text_chunks = splitter.split_text(report)

        if text_chunks:
            chunk_ids        = [str(uuid.uuid4()) for _ in text_chunks]
            chunk_embeddings = embedding_encoder.encode(text_chunks).tolist()
            collection.add(documents=text_chunks, embeddings=chunk_embeddings, ids=chunk_ids)

        # ── Extract and persist long-term context ────────────────
        extracted = context_extractor.extract(topic, report, profile_context)
        user_profile.merge_extraction(extracted)
        user_profile.push_topic(topic)
        user_profile.save()

        session_stats["searches"]      += 1
        session_stats["chunks_stored"] += len(text_chunks)
        session_stats["reports"]       += 1
        session_stats["tokens_used"]   += 1.2

        return ResearchResponse(
            status="success",
            steps=steps,
            answer=report,
            reaction="",
            followup_questions=[format_followup_for_user(q) for q in followup_questions if q]
        ).model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research request failed: {e}") from e


@app.get("/api/profile")
async def get_profile():
    """Return the current long-term user profile (read-only view)."""
    user_profile.reload()
    return {
        "summary": user_profile.get_context_summary(),
        "entities": user_profile.get_entities(),
        "preferences": user_profile.get_preferences(),
        "constraints": user_profile.get_constraints(),
        "recent_topics": user_profile.get_recent_topics(10),
        "conversation_summary": user_profile.get("conversation_summary"),
    }


@app.post("/api/profile/update")
async def update_profile(payload: dict):
    """Manually update profile fields. Accepts any subset of:
    ``{entities: {...}, preferences: {...}, technical_constraints: [...], project_definitions: {...}}``
    """
    user_profile.reload()
    user_profile.merge_extraction(payload)
    user_profile.save()
    return {"status": "ok", "summary": user_profile.get_context_summary()}


@app.post("/api/query")
async def query_memory(payload: QueryRequest):
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
        rag_prompt    = f"Answer the question using only the context below.\n\nContext:\n{context_block}\n\nQuestion: {question}\nAnswer:"

        response = llm.invoke([{"role": "user", "content": rag_prompt}])
        return {"answer": response.content, "sources": retrieved_docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── CLEAN MERGED FILE UPLOAD ROUTE ─────────────────────────────
def _extract_pdf_text_pypdf(content: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    import pypdf
    reader = pypdf.PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        try:
            t = page.extract_text()
        except Exception:
            t = None
        if t:
            parts.append(t)
    return "\n".join(parts)


def _extract_pdf_text_pypdf2(content: bytes) -> str:
    """Fallback PDF extraction using PyPDF2."""
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        try:
            t = page.extract_text()
        except Exception:
            t = None
        if t:
            parts.append(t)
    return "\n".join(parts)


def _extract_pdf_text_pymupdf(content: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF."""
    import fitz
    document = fitz.open(stream=content, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in document)
    finally:
        document.close()


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Accepts PDF/TXT, saves a local backup copy, then processes into ChromaDB."""
    try:
        filename = Path(file.filename or "").name
        if not filename:
            raise HTTPException(status_code=400, detail="A filename is required.")

        content = await file.read()
        print(f"[UPLOAD] Received file: {filename}, size: {len(content)} bytes")

        # 1. Save local physical copy inside UPLOAD_DIR
        target_path = UPLOAD_DIR / filename
        with open(target_path, "wb") as buffer:
            buffer.write(content)
        print(f"[UPLOAD] File saved to: {target_path}")

        # 2. Extract Text Based on Type
        text = ""
        if filename.lower().endswith(".pdf"):
            try:
                import pypdf as _pypdf
                text = _extract_pdf_text_pypdf(content)
                _page_count = len(_pypdf.PdfReader(io.BytesIO(content)).pages)
                print(f"[UPLOAD] pypdf extracted {len(text)} chars from {_page_count} pages")
            except Exception as pypdf_err:
                print(f"[UPLOAD] pypdf failed: {pypdf_err}")
                text = ""

            if not text.strip():
                print(f"[UPLOAD] pypdf returned empty text, trying PyPDF2 fallback...")
                try:
                    text = _extract_pdf_text_pypdf2(content)
                    print(f"[UPLOAD] PyPDF2 extracted {len(text)} chars")
                except ImportError:
                    print(f"[UPLOAD] PyPDF2 not installed either.")
                except Exception as pypdf2_err:
                    print(f"[UPLOAD] PyPDF2 fallback failed: {pypdf2_err}")

            if not text.strip():
                print(f"[UPLOAD] PyPDF2 returned empty text, trying PyMuPDF fallback...")
                try:
                    text = _extract_pdf_text_pymupdf(content)
                    print(f"[UPLOAD] PyMuPDF extracted {len(text)} chars")
                except ImportError:
                    print("[UPLOAD] PyMuPDF is not installed.")
                except Exception as pymupdf_err:
                    print(f"[UPLOAD] PyMuPDF fallback failed: {pymupdf_err}")
        elif filename.lower().endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
            print(f"[UPLOAD] TXT decoded {len(text)} chars")
        else:
            raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported.")

        print(f"[UPLOAD] Final extracted text length: {len(text)} chars")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file. The PDF may be image-based (scanned) or have no extractable text layer.")

        # 3. Vector RAG Pipeline (Chunking -> Embedding -> Vector DB Ingestion)
        c_size = runtime_settings.get("chunk_size", 500)
        c_overlap = runtime_settings.get("chunk_overlap", 50)
        splitter         = RecursiveCharacterTextSplitter(chunk_size=c_size, chunk_overlap=c_overlap)
        text_chunks      = splitter.split_text(text)

        if not text_chunks:
            raise HTTPException(status_code=400, detail="No text chunks generated from file.")

        print(f"[UPLOAD] Generated {len(text_chunks)} chunks")

        # Re-uploading the same file replaces its old chunks without affecting
        # chunks belonging to other uploaded files.
        previous_chunks = len(collection.get(where={"source": filename}).get("ids", []))
        collection.delete(where={"source": filename})
        chunk_ids        = [str(uuid.uuid4()) for _ in text_chunks]
        chunk_embeddings = embedding_encoder.encode(text_chunks).tolist()
        metadatas        = [{"source": filename, "type": "upload"} for _ in text_chunks]
        
        collection.add(documents=text_chunks, embeddings=chunk_embeddings, ids=chunk_ids, metadatas=metadatas)
        session_stats["chunks_stored"] += len(text_chunks) - previous_chunks

        print(f"[UPLOAD] Stored {len(text_chunks)} chunks in ChromaDB")

        return {
            "status": "success",
            "filename": filename,
            "chunks_stored": len(text_chunks)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")



# ── DOCUMENTS & KNOWLEDGE BASE MANAGEMENT ──────────────────────
@app.get("/api/documents")
async def get_documents():
    """List uploaded documents and vector collection stats."""
    try:
        docs = []
        if UPLOAD_DIR.exists():
            for f in UPLOAD_DIR.glob("*"):
                if f.is_file():
                    docs.append({
                        "name": f.name,
                        "size": f.stat().st_size,
                        "modified": f.stat().st_mtime,
                        "type": "pdf" if f.name.endswith(".pdf") else "txt"
                    })
        count = collection.count() if collection else 0
        return {
            "documents": docs,
            "total_chunks": count,
            "collection": "research_notes",
            "embedding_model": "all-MiniLM-L6-v2"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    """Delete a document from uploads and ChromaDB."""
    try:
        target = UPLOAD_DIR / filename
        if target.exists():
            target.unlink()
        try:
            collection.delete(where={"source": filename})
        except Exception:
            pass
        return {"status": "deleted", "filename": filename, "total_chunks": collection.count()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/clear")
async def clear_documents():
    """Clear all uploaded files and reset the collection."""
    global collection
    try:
        if UPLOAD_DIR.exists():
            for f in UPLOAD_DIR.glob("*"):
                if f.is_file():
                    f.unlink()
        try:
            db_client.delete_collection("research_notes")
        except Exception:
            pass
        collection = db_client.get_or_create_collection("research_notes")
        session_stats["chunks_stored"] = 0
        return {"status": "cleared", "total_chunks": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── RUNTIME SETTINGS MANAGEMENT ────────────────────────────────
class SettingsPayload(BaseModel):
    model: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None


@app.get("/api/settings")
async def get_settings():
    return {
        "model": runtime_settings["model"],
        "chunk_size": runtime_settings["chunk_size"],
        "chunk_overlap": runtime_settings["chunk_overlap"],
        "available_models": [
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b"
        ]
    }


@app.post("/api/settings")
async def update_settings(payload: SettingsPayload):
    global llm, llm_casual
    if payload.model:
        runtime_settings["model"] = payload.model
        try:
            llm = ChatGroq(model=payload.model, temperature=0, api_key=GROQ_API_KEY)
            llm_casual = ChatGroq(model=payload.model, temperature=0.8, api_key=GROQ_API_KEY)
        except Exception as e:
            print(f"Warning: could not reinitialize LLM with {payload.model}: {e}")
    if payload.chunk_size:
        runtime_settings["chunk_size"] = payload.chunk_size
    if payload.chunk_overlap is not None:
        runtime_settings["chunk_overlap"] = payload.chunk_overlap
    return {"status": "updated", "settings": runtime_settings}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)