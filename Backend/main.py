import os
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
from langchain.agents import create_agent
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from memory import UserProfile, ContextExtractor, ProfileInjector

executor = ThreadPoolExecutor(max_workers=2)

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
# STEP 2 — FastAPI App Setup
# =====================================================================
app = FastAPI(title="Research Agent Backend", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust this to ["http://localhost:5173"] if you want strict origins
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
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=GROQ_API_KEY
)

llm_casual = ChatGroq(
    model="llama-3.1-8b-instant",
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
  "follow_ups": ["string", "string", "string"] — 2-3 short follow-up questions to invite further discussion
}

RESPONSE RULES:
- GREETING (hi, hello): greet back warmly, ask what they want to explore today
- SHORT QUESTION: answer directly, add one cool fact, ask a follow-up
- RESEARCH REQUEST: structured report, then suggest what to explore next

The "answer" field contains ALL substantive content. The "followup_questions" are separate conversational prompts.
Return ONLY the JSON object, no extra text, no markdown fences."""

agent = create_agent(model=llm, tools=tools, system_prompt=system_prompt)

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

# =====================================================================
# STEP 8 — Endpoints
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
  "follow_ups": ["question1", "question2", "question3"] — 1-3 follow-up questions
}

EXAMPLE CORRECT OUTPUT:
{
  "answer": "FPGA stands for Field-Programmable Gate Array. It is a type of integrated circuit that can be programmed after manufacturing.",
  "reaction": "Cool tech! 🤖",
  "follow_ups": ["What FPGA applications interest you?", "Want to learn about FPGA programming?"]
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
            followup_questions=follow_ups
        ).model_dump()

    try:
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
            loop        = asyncio.get_event_loop()
            crew_result = await loop.run_in_executor(executor, run_crew, crew_topic)
            report      = crew_result["report"]
            steps       = crew_result["steps"]
        else:
            # Build messages with conversation history only (no profile context to avoid hallucination)
            history_messages = payload.history[-6:] if payload.history else []
            
            messages = []
            messages.extend(history_messages)
            messages.append({"role": "user", "content": topic})
            
            result = agent.invoke({"messages": messages})
            raw_content = result["messages"][-1].content
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
            followup_questions=followup_questions
        ).model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        return {"answer": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── CLEAN MERGED FILE UPLOAD ROUTE ─────────────────────────────
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Accepts PDF/TXT, saves a local backup copy, then processes into ChromaDB."""
    try:
        content = await file.read()
        
        # 1. Save a local physical copy of the file
        with open(f"./{file.filename}", "wb") as buffer:
            buffer.write(content)
        print(f"File saved locally: {file.filename}")

        # 2. Extract Text Based on Type
        text = ""
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

        # 3. Vector RAG Pipeline (Chunking -> Embedding -> Vector DB Ingestion)
        splitter         = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        text_chunks      = splitter.split_text(text)
        chunk_ids        = [str(uuid.uuid4()) for _ in text_chunks]
        chunk_embeddings = embedding_encoder.encode(text_chunks).tolist()
        
        collection.add(documents=text_chunks, embeddings=chunk_embeddings, ids=chunk_ids)
        session_stats["chunks_stored"] += len(text_chunks)

        return {
            "status": "success",
            "filename": file.filename,
            "chunks_stored": len(text_chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)