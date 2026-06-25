class EphemeralSession:
    """In-memory session-scoped state that resets per chat session."""

    def __init__(self, session_id: str):
        self._id = session_id
        self._store: dict = {}

    @property
    def id(self) -> str:
        return self._id

    def get(self, key: str, default=None):
        return self._store.get(key, default)

    def set(self, key: str, value):
        self._store[key] = value

    def update(self, mapping: dict):
        self._store.update(mapping)

    def delete(self, key: str):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()

    def snapshot(self) -> dict:
        return dict(self._store)
