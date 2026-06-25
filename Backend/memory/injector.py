"""System-prompt injection helpers.

``ProfileInjector`` takes a base system prompt and a ``UserProfile`` and
returns an augmented prompt that includes the user's long-term context.
"""

from .profile import UserProfile


INJECTION_TEMPLATE = """{base_prompt}

--- USER PROFILE (auto-injected from long-term memory) ---
{context_summary}

Guidelines for using this profile context:
- The information above was extracted from previous conversations.
- Use it to personalise responses, avoid asking the user to repeat themselves.
- If the user contradicts something in the profile, update your understanding
  and the profile will be updated after this conversation.
- Do not mention the profile explicitly to the user unless it helps the conversation.
"""


class ProfileInjector:
    """Prepends long-term user context to any system prompt."""

    @staticmethod
    def inject(base_prompt: str, profile: UserProfile) -> str:
        """Return a system prompt with the user's profile context prepended."""
        summary = profile.get_context_summary()
        if not summary:
            return base_prompt
        return INJECTION_TEMPLATE.format(
            base_prompt=base_prompt.strip(),
            context_summary=summary,
        )

    @staticmethod
    def build_crew_context_block(profile: UserProfile) -> str:
        """Return a plain-text context block for CrewAI agents (no system prompt override needed)."""
        summary = profile.get_context_summary()
        if not summary:
            return ""
        return (
            "--- USER PROFILE (from long-term memory) ---\n"
            f"{summary}\n"
            "---\n"
            "Use this to personalise your work. Do not ask about things already stated here."
        )
