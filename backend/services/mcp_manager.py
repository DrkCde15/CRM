import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from core.config import settings
from core.database import SessionLocal
from models.models import MCPServer

logger = logging.getLogger("mochi.mcp")

N8N_BASE_URL = settings.n8n_base_url
N8N_API_KEY = settings.n8n_api_key
N8N_AVAILABLE = bool(N8N_BASE_URL and N8N_API_KEY)


def _n8n_headers(api_key: str) -> dict:
    return {"X-N8N-API-KEY": api_key, "Content-Type": "application/json"}


def _resolve_n8n(server: MCPServer) -> tuple[str, str]:
    base = (server.n8n_base_url or N8N_BASE_URL or "").rstrip("/")
    key = server.n8n_api_key or N8N_API_KEY or ""
    return base, key


def _n8n_request(method: str, base: str, key: str, path: str, json: dict | None = None) -> dict:
    with httpx.Client(timeout=15) as client:
        r = client.request(
            method,
            f"{base}/api/v1/{path}",
            headers=_n8n_headers(key),
            json=json or {},
        )
        r.raise_for_status()
        return r.json()


def _extract_mcp_url(workflow: dict, base: str) -> str:
    """Recupera a URL do endpoint MCP a partir do nó 'MCP Server Trigger' do workflow.

    O n8n registra o MCP Server Trigger em ``/mcp/<path>``, onde ``<path>`` é o
    parâmetro ``path`` do nó (e não um webhookId gerado). Ex.: path="crm" -> ``/mcp/crm``.
    """
    for node in workflow.get("nodes", []):
        node_type = node.get("type", "").lower()
        if "mcp" in node_type and "trigger" in node_type:
            path = (node.get("parameters", {}) or {}).get("path")
            if path:
                return f"{base}/mcp/{path.strip('/')}"
    return ""


def _activate_workflow(base: str, key: str, workflow_id: str) -> str:
    """Ativa o workflow no n8n e retorna o status resultante.

    Trata 409 (workflow já ativo) como sucesso.
    """
    try:
        _n8n_request("POST", base, key, f"workflows/{workflow_id}/activate")
        return "running"
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:
            return "running"
        logger.error("Erro ao ativar workflow n8n %s: %s", workflow_id, e)
        return "error"
    except Exception as e:
        logger.error("Erro ao ativar workflow n8n %s: %s", workflow_id, e)
        return "error"


def _server_to_dict(s: MCPServer) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "serverUrl": s.server_url,
        "workflowId": s.workflow_id or "",
        "n8nBaseUrl": s.n8n_base_url or "",
        "type": s.type,
        "status": s.status,
        "enabled": s.enabled,
        "envVars": s.env_vars,
        "createdAt": s.created_at.isoformat() if s.created_at else "",
    }


def list_clients() -> list[dict]:
    db = SessionLocal()
    try:
        return [_server_to_dict(s) for s in db.query(MCPServer).all()]
    finally:
        db.close()


def get_client(server_id: str) -> dict | None:
    db = SessionLocal()
    try:
        s = db.query(MCPServer).filter(MCPServer.id == int(server_id)).first()
        return _server_to_dict(s) if s else None
    finally:
        db.close()


def create_client(data: dict) -> dict:
    db = SessionLocal()
    try:
        server = MCPServer(
            company_id=data.get("company_id", 1),
            name=data.get("name", ""),
            server_url=data.get("serverUrl", ""),
            workflow_id=data.get("workflowId", ""),
            n8n_base_url=data.get("n8nBaseUrl", ""),
            n8n_api_key=data.get("n8nApiKey", ""),
            type=data.get("type", "custom"),
            env_vars=data.get("envVars", {}),
            enabled=data.get("enabled", True),
            status="stopped",
        )
        db.add(server)
        db.commit()
        db.refresh(server)

        base, key = _resolve_n8n(server)
        if base and key and server.workflow_id:
            try:
                server.status = _activate_workflow(base, key, server.workflow_id)
                if server.status == "running":
                    workflow = _n8n_request("GET", base, key, f"workflows/{server.workflow_id}")
                    url = _extract_mcp_url(workflow, base)
                    if url:
                        server.server_url = url
            except Exception as e:
                server.status = "error"
                logger.error("Erro ao configurar servidor MCP no n8n: %s", e)

        db.commit()
        return _server_to_dict(server)
    finally:
        db.close()


def update_client(server_id: str, data: dict) -> dict | None:
    db = SessionLocal()
    try:
        server = db.query(MCPServer).filter(MCPServer.id == int(server_id)).first()
        if not server:
            return None

        if "name" in data:
            server.name = data["name"]
        if "serverUrl" in data:
            server.server_url = data["serverUrl"]
        if "workflowId" in data:
            server.workflow_id = data["workflowId"]
        if "n8nBaseUrl" in data:
            server.n8n_base_url = data["n8nBaseUrl"]
        if "n8nApiKey" in data:
            server.n8n_api_key = data["n8nApiKey"]
        if "type" in data:
            server.type = data["type"]
        if "enabled" in data:
            server.enabled = data["enabled"]
        if "envVars" in data:
            server.env_vars = data["envVars"]

        base, key = _resolve_n8n(server)
        workflow_changed = "workflowId" in data or "n8nBaseUrl" in data or "n8nApiKey" in data
        if base and key and server.workflow_id and workflow_changed:
            try:
                server.status = _activate_workflow(base, key, server.workflow_id)
                if server.status == "running":
                    workflow = _n8n_request("GET", base, key, f"workflows/{server.workflow_id}")
                    url = _extract_mcp_url(workflow, base)
                    if url:
                        server.server_url = url
            except Exception as e:
                server.status = "error"
                logger.error("Erro ao atualizar servidor MCP no n8n: %s", e)

        db.commit()
        return _server_to_dict(server)
    finally:
        db.close()


def delete_client(server_id: str) -> bool:
    db = SessionLocal()
    try:
        server = db.query(MCPServer).filter(MCPServer.id == int(server_id)).first()
        if not server:
            return False

        base, key = _resolve_n8n(server)
        if base and key and server.workflow_id:
            try:
                _n8n_request("POST", base, key, f"workflows/{server.workflow_id}/deactivate")
            except Exception as e:
                logger.warning("Erro ao desativar workflow n8n: %s", e)

        db.delete(server)
        db.commit()
        return True
    finally:
        db.close()


def restart_client(server_id: str) -> dict | None:
    db = SessionLocal()
    try:
        server = db.query(MCPServer).filter(MCPServer.id == int(server_id)).first()
        if not server:
            return None

        base, key = _resolve_n8n(server)
        if base and key and server.workflow_id:
            server.status = _activate_workflow(base, key, server.workflow_id)
        else:
            server.status = "stopped"

        db.commit()
        return _server_to_dict(server)
    finally:
        db.close()
