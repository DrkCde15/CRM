import logging
from typing import Any

logger = logging.getLogger("mochi.mcp")


class MCPManager:
    def __init__(self):
        self._clients: list[dict] = [
            {
                "id": "local-db",
                "name": "Banco de Dados Local",
                "serverUrl": "sqlite:///./crm.db",
                "type": "postgresql",
                "enabled": True,
                "config": {},
                "createdAt": "2024-01-01T00:00:00",
            }
        ]

    def list_clients(self) -> list[dict]:
        return self._clients

    def get_client(self, client_id: str) -> dict | None:
        for c in self._clients:
            if c["id"] == client_id:
                return c
        return None

    def create_client(self, data: dict) -> dict:
        import uuid
        client = {
            "id": str(uuid.uuid4())[:8],
            "name": data.get("name", ""),
            "serverUrl": data.get("serverUrl", ""),
            "type": data.get("type", "custom"),
            "enabled": data.get("enabled", True),
            "config": data.get("config", {}),
            "createdAt": __import__("datetime").datetime.now().isoformat(),
        }
        self._clients.append(client)
        return client

    def update_client(self, client_id: str, data: dict) -> dict | None:
        for i, c in enumerate(self._clients):
            if c["id"] == client_id:
                self._clients[i].update(data)
                return self._clients[i]
        return None

    def delete_client(self, client_id: str) -> bool:
        for i, c in enumerate(self._clients):
            if c["id"] == client_id:
                self._clients.pop(i)
                return True
        return False


mcp_manager = MCPManager()
