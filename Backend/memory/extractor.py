"""Context extraction — analyses chat text and returns structured profile updates.

Runs a single LLM call with a carefully crafted prompt to extract:
- Entities (name, role, project, technologies)
- Preferences (tone, detail level)
- Technical constraints
- Project definitions
- A running conversation summary
"""

from langchain_groq import ChatGroq

EXTRACTION_PROMPT = """You are a context-extraction engine. Analyse the conversation below and return a **valid JSON object** with the following keys (use `null` or empty arrays when nothing is found):

```json
{{
  "entities": {{
    "name": "<full name of the user if mentioned>",
    "role": "<their role / job title>",
    "project_name": "<name of any project they reference>",
    "project_description": "<short description of that project>",
    "technologies": ["<tech1>", "<tech2>"],
    "skills": ["<skill1>"]
  }},
  "preferences": {{
    "tone": "<friendly | professional | casual | null>",
    "detail_level": "<high | balanced | concise | null>",
    "response_style": "<conversational | structured | null>"
  }},
  "technical_constraints": [
    {{"text": "<constraint description>", "source": "extracted"}}
  ],
  "project_definitions": {{
    "<key>": "<value>"
  }},
  "conversation_summary": "<one-sentence summary of what this conversation was about>",
  "topic": "<the main topic or subject of the user's query>"
}}
```

RULES:
- **Only extract information that is EXPLICITLY stated or strongly implied.** Do not guess.
- For `project_definitions`, capture any specific requirements, goals, or scope the user defines.
- For `technical_constraints`, capture any technology choices, limitations, or rules the user mentions.
- If an existing profile context is provided, return only NEW or CHANGED information — do not repeat known facts.
- Be conservative. It is better to return null than to fabricate.

--- EXISTING PROFILE CONTEXT ---
{existing_context}

--- CONVERSATION TEXT ---
{topic}

--- USER RESPONSE ---
{response}

Return ONLY the JSON object, no markdown fences, no explanation."""


class ContextExtractor:
    """Uses an LLM to extract structured profile data from a user message + agent response."""

    def __init__(self, llm: ChatGroq):
        self._llm = llm

    def extract(self, topic: str, response: str, existing_context: str = "") -> dict:
        """Analyse *topic* (user's query) and *response* (agent's reply) and return extracted fields."""
        prompt = EXTRACTION_PROMPT.format(
            topic=topic,
            response=response,
            existing_context=existing_context or "(no existing profile)",
        )
        try:
            result = self._llm.invoke([{"role": "user", "content": prompt}])
            raw = result.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1]
                raw = raw.rsplit("```", 1)[0]
            import json
            return json.loads(raw)
        except Exception:
            return {}
