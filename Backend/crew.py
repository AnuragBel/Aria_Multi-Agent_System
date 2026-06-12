# Multi-Agent Research & Writing System using CrewAI
# Agents: Researcher → Data Analyst → Writer

# ── MONKEY-PATCH FIRST ───────────────────────────────────────
import crewai.llms.cache as _crewai_cache
_crewai_cache.mark_cache_breakpoint  = lambda msg: msg
_crewai_cache.strip_cache_breakpoint = lambda messages: messages

# ── Imports ──────────────────────────────────────────────────
import os
from pathlib import Path
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import TavilySearchTool

# ── Load keys ────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# ── Search tool AFTER keys are loaded ────────────────────────
search_tool = TavilySearchTool(api_key=TAVILY_API_KEY, max_results=2)

# ── LLM ──────────────────────────────────────────────────────
llm = LLM(
    model="openai/llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# ============================================================
#  AGENT 1 — Researcher
# ============================================================
researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive, accurate, up-to-date information about the given topic",
    backstory="""You are an expert research analyst who searches the web 
    multiple times using different queries to collect raw facts, statistics, 
    quotes, and key data points. You don't analyze — you just gather and 
    organize raw findings clearly for the Data Analyst.""",
    tools=[search_tool],
    llm=llm,
    verbose=True,
    allow_delegation=False,
    max_iter=3
)

# ============================================================
#  AGENT 2 — Data Analyst
# ============================================================
analyst = Agent(
    role="Data Analyst",
    goal="Analyze and structure raw research data into clean, organized insights",
    backstory="""You are an expert data analyst who takes raw, unstructured 
    research notes and transforms them into clean, structured data. You identify 
    patterns, remove duplicates, rank findings by importance, cross-check facts, 
    and produce a clean structured summary that the Writer can directly use. 
    You never search the web — you only work with the data given to you.""",
    tools=[],                  # no search — only analyzes what Researcher found
    llm=llm,
    verbose=True,
    allow_delegation=False
)

# ============================================================
#  AGENT 3 — Writer
# ============================================================
writer = Agent(
    role="Professional Research Writer",
    goal="Transform clean structured data into a polished, readable report that exactly matches the user's request",
    backstory="""You are a skilled technical writer who crafts polished reports 
    from structured data. You ALWAYS follow the user's formatting instructions 
    exactly — 2 lines means 2 lines, full report means full report with sections. 
    You only use the clean data provided by the Data Analyst — you never 
    make up facts or search the web.""",
    tools=[],
    llm=llm,
    verbose=True,
    allow_delegation=False
)

# ============================================================
#  CREW RUNNER
# ============================================================
def run_crew(topic: str) -> dict:

    # ── TASK 1: Research ─────────────────────────────────────
    research_task = Task(
        description=f"""Search the web and collect raw information about:

Topic: {topic}

Steps:
1. Search the web at least 3 times using different queries
2. Collect raw facts, statistics, quotes, and key data points
3. Do NOT analyze or filter — just gather everything you find
4. Pass all raw findings to the Data Analyst""",
        agent=researcher,
        expected_output="Raw unfiltered research notes: facts, statistics, quotes, and data points organized by source"
    )

    # ── TASK 2: Analysis ─────────────────────────────────────
    analysis_task = Task(
        description=f"""Analyze and structure the raw research notes you received.

Original topic: {topic}

Steps:
1. Read all raw research notes from the Researcher
2. Remove duplicate information
3. Cross-check and verify facts against each other
4. Rank findings by importance and relevance
5. Structure everything into clean, labeled categories:
   - Core Facts
   - Key Statistics
   - Important Trends
   - Key Players / Companies
   - Conflicting or Uncertain Points
6. Pass this clean structured data to the Writer""",
        agent=analyst,
        expected_output="Clean structured data organized into labeled categories, ranked by importance, duplicates removed",
        context=[research_task]     # gets Researcher's output
    )

    # ── TASK 3: Write (FIXED SYNTAX HIERARCHY HERE) ──────────
    write_task = Task(
        description=f"""Write a response based on the research notes.

Original user request: {topic}

RESPONSE STYLE RULES:
    - Always start with a direct answer to what the user asked
    - After answering, add 1-2 related interesting facts they might not know
    - End EVERY response with a natural follow-up question to keep the conversation going
      Example endings:
      → "Want me to go deeper on any of these points?"
      → "Curious about how this applies to your FPGA project?"
      → "Should I research a specific aspect of this in more detail?"

CRITICAL FORMAT RULES:
    - If user asked for SHORT answer (2 lines, brief, simple, what is):
      Write ONLY that. No headers. No sections. Just the answer and one follow-up question.
    - If user asked for FULL REPORT / RESEARCH / DETAILED:
      Write with these sections: Overview | Key Findings | Recent Trends | Key Players | Summary
    - Use ONLY facts from the Data Analyst — never invent information
    - Match response length and format EXACTLY to what user asked for

TONE: Friendly, engaging, curious. Never robotic. Never just dump facts and stop.""",
        agent=writer,
        expected_output="A polished response matching exactly the user's requested format and length",
        context=[analysis_task]     # gets Analyst's clean output
    )

    # ── CREW ─────────────────────────────────────────────────
    crew = Crew(
        agents=[researcher, analyst, writer],
        tasks=[research_task, analysis_task, write_task],
        process=Process.sequential,             # runs in order: 1 → 2 → 3
        verbose=True,
        share_crew=False
    )

    result = crew.kickoff()

    return {
        "report": str(result),
        "steps": [
            "✓ Researcher Agent — searched web 3x",
            "✓ Raw facts collected and passed to Analyst",
            "✓ Data Analyst — cleaned and structured data",
            "✓ Duplicates removed, facts ranked by importance",
            "✓ Writer Agent — crafted final report",
            "✓ 3-agent CrewAI pipeline complete"
        ]
    }


# ── Test directly ─────────────────────────────────────────────
if __name__ == "__main__":
    result = run_crew("What is FPGA? Give me answer in 5 lines")
    print("\n" + "="*60)
    print("FINAL REPORT:")
    print("="*60)
    print(result["report"])