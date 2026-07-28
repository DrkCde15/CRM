import logging
import os
import uuid
from datetime import UTC, datetime
from typing import Any

from core.database import SessionLocal
from models.models import MCPServer

logger = logging.getLogger("mochi.mcp")

DOCKER_AVAILABLE = False
docker_client = None

try:
    import docker
    docker_client = docker.from_env()
    docker_client.ping()
    DOCKER_AVAILABLE = True
    logger.info("Docker disponivel para MCP")
except Exception:
    logger.warning("Docker nao disponivel — MCP rodara em modo in-memory")


def _server_to_dict(s: MCPServer) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "serverUrl": s.server_url,
        "image": s.image,
        "containerName": s.container_name or "",
        "containerId": s.container_id or "",
        "type": s.type,
        "port": s.port,
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
            image=data.get("image", ""),
            type=data.get("type", "custom"),
            port=data.get("port", 0),
            env_vars=data.get("envVars", {}),
            enabled=data.get("enabled", True),
            status="stopped",
        )
        db.add(server)
        db.commit()
        db.refresh(server)

        if DOCKER_AVAILABLE and server.image:
            container_name = f"mcp-{server.name.lower().replace(' ', '-')}-{server.id}"
            try:
                logger.info("Baixando imagem %s...", server.image)
                docker_client.images.pull(server.image)

                env_list = [f"{k}={v}" for k, v in (server.env_vars or {}).items()]
                container = docker_client.containers.run(
                    image=server.image,
                    name=container_name,
                    detach=True,
                    environment=env_list,
                    ports={f"{server.port}/tcp": server.port} if server.port else None,
                    remove=False,
                )
                server.container_id = container.id
                server.container_name = container_name
                server.status = "running"
                server.server_url = f"http://{container_name}:{server.port}" if server.port else ""
                logger.info("Container MCP iniciado: %s", container_name)
            except Exception as e:
                server.status = "error"
                logger.error("Erro ao iniciar container MCP: %s", e)

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
        if "image" in data:
            server.image = data["image"]
        if "type" in data:
            server.type = data["type"]
        if "port" in data:
            server.port = data.get("port", 0)
        if "enabled" in data:
            server.enabled = data["enabled"]
        if "envVars" in data:
            server.env_vars = data["envVars"]

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

        if DOCKER_AVAILABLE and server.container_id:
            try:
                container = docker_client.containers.get(server.container_id)
                container.stop(timeout=5)
                container.remove()
                logger.info("Container MCP removido: %s", server.container_name)
            except Exception as e:
                logger.warning("Erro ao remover container: %s", e)

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

        if DOCKER_AVAILABLE and server.container_id:
            try:
                container = docker_client.containers.get(server.container_id)
                container.restart(timeout=5)
                server.status = "running"
                logger.info("Container MCP reiniciado: %s", server.container_name)
            except Exception as e:
                server.status = "error"
                logger.error("Erro ao reiniciar container: %s", e)
        else:
            server.status = "stopped"

        db.commit()
        return _server_to_dict(server)
    finally:
        db.close()
