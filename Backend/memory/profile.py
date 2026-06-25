import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock


DEFAULT_PROFILE = {
    "user_id": "default",
    "created_at": None,
    "updated_at": None,
    "entities": {
        "name": None,
        "role": None,
        "project_name": None,
        "project_description": None,
        "technologies": [],
        "skills": [],
    },
    "preferences": {
        "tone": "friendly",
        "detail_level": "balanced",
        "response_style": "conversational",
    },
    "project_definitions": {},
    "technical_constraints": [],
    "conversation_summary": "",
    "recent_topics": [],
}


class UserProfile:
    """Thread-safe, JSON-backed long-term user profile store.

    Each user has a single JSON file under ``profile_dir / {user_id}.json``.

    Typical usage::

        profile = UserProfile.load("default")
        # ... modify attributes ...
        profile.save()
        summary = profile.get_context_summary()
    """

    _lock: Lock = Lock()
    profile_dir: Path = Path(__file__).resolve().parent.parent / "profiles"

    def __init__(self, user_id: str, data: dict):
        self.user_id = user_id
        self._data = data

    # ── I/O ─────────────────────────────────────────────────────

    @classmethod
    def load(cls, user_id: str = "default") -> "UserProfile":
        cls.profile_dir.mkdir(parents=True, exist_ok=True)
        path = cls.profile_dir / f"{user_id}.json"
        with cls._lock:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    data = _deep_merge(DEFAULT_PROFILE.copy(), json.load(f))
            else:
                data = DEFAULT_PROFILE.copy()
                data["created_at"] = datetime.now(timezone.utc).isoformat()
            data["user_id"] = user_id
        return cls(user_id, data)

    def save(self):
        self._data["updated_at"] = datetime.now(timezone.utc).isoformat()
        path = self.profile_dir / f"{self.user_id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)

    def reload(self):
        fresh = self.__class__.load(self.user_id)
        self._data = fresh._data

    # ── Accessors ───────────────────────────────────────────────

    def get(self, key: str, default=None):
        return self._data.get(key, default)

    def get_entities(self) -> dict:
        return self._data.get("entities", {})

    def get_preferences(self) -> dict:
        return self._data.get("preferences", {})

    def get_constraints(self) -> list:
        return self._data.get("technical_constraints", [])

    def get_recent_topics(self, n: int = 5) -> list:
        return self._data.get("recent_topics", [])[-n:]

    # ── Mutators ────────────────────────────────────────────────

    def update_entity(self, key: str, value):
        if value is not None:
            self._data.setdefault("entities", {})[key] = value

    def update_preference(self, key: str, value):
        if value is not None:
            self._data.setdefault("preferences", {})[key] = value

    def add_constraint(self, text: str, source: str = "extracted"):
        constraints = self._data.setdefault("technical_constraints", [])
        entry = {"text": text, "source": source, "timestamp": datetime.now(timezone.utc).isoformat()}
        if not any(c["text"] == text for c in constraints):
            constraints.append(entry)

    def remove_constraint(self, text: str):
        constraints = self._data.get("technical_constraints", [])
        self._data["technical_constraints"] = [c for c in constraints if c["text"] != text]

    def push_topic(self, topic: str):
        topics = self._data.setdefault("recent_topics", [])
        if topic not in topics:
            topics.append(topic)
        if len(topics) > 50:
            self._data["recent_topics"] = topics[-50:]

    def set_conversation_summary(self, summary: str):
        self._data["conversation_summary"] = summary

    def set_project_definition(self, key: str, value: str):
        self._data.setdefault("project_definitions", {})[key] = value

    # ── Bulk merge from extraction ──────────────────────────────

    def merge_extraction(self, extracted: dict):
        """Atomically merge a dict from ``ContextExtractor.extract()`` into the profile."""
        entities = extracted.get("entities") or {}
        for k, v in entities.items():
            self.update_entity(k, v)

        prefs = extracted.get("preferences") or {}
        for k, v in prefs.items():
            self.update_preference(k, v)

        for constraint in extracted.get("technical_constraints") or []:
            if isinstance(constraint, str):
                self.add_constraint(constraint, source="extracted")
            elif isinstance(constraint, dict) and constraint.get("text"):
                self.add_constraint(constraint["text"], source=constraint.get("source", "extracted"))

        projects = extracted.get("project_definitions") or {}
        for k, v in projects.items():
            self.set_project_definition(k, v)

        summary = extracted.get("conversation_summary")
        if summary:
            self._data["conversation_summary"] = summary

        topic = extracted.get("topic")
        if topic:
            self.push_topic(topic)

    # ── Context assembly ────────────────────────────────────────

    def get_context_summary(self) -> str:
        """Return a concise natural-language summary for system-prompt injection."""
        parts = []
        entities = self.get_entities()

        name = entities.get("name")
        role = entities.get("role")
        project = entities.get("project_name")
        project_desc = entities.get("project_description")
        techs = entities.get("technologies", [])

        if name:
            parts.append(f"User: {name}")
        if role:
            parts.append(f"Role: {role}")
        if project:
            parts.append(f"Active Project: {project}")
        if project_desc:
            parts.append(f"Project Description: {project_desc}")
        if techs:
            parts.append(f"Technologies: {', '.join(techs)}")

        constraints = self.get_constraints()
        if constraints:
            constraint_texts = [c["text"] for c in constraints]
            parts.append(f"Known Constraints: {'; '.join(constraint_texts)}")

        prefs = self.get_preferences()
        tone = prefs.get("tone")
        detail = prefs.get("detail_level")
        if tone:
            parts.append(f"Preferred Tone: {tone}")
        if detail:
            parts.append(f"Detail Level: {detail}")

        topics = self.get_recent_topics(3)
        if topics:
            parts.append(f"Recent Interests: {', '.join(topics)}")

        summary = self._data.get("conversation_summary") or ""
        if summary:
            parts.append(f"Context Summary: {summary}")

        projects = self._data.get("project_definitions", {})
        if projects:
            proj_lines = [f"  {k}: {v}" for k, v in projects.items()]
            parts.append("Project Definitions:\n" + "\n".join(proj_lines))

        return "\n".join(parts)

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id!r}>"


def _deep_merge(base: dict, overlay: dict) -> dict:
    """Merge *overlay* into *base* (mutates base)."""
    for key, value in overlay.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        elif value is not None:
            base[key] = value
    return base
