import logging
import os
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel

from core.deps import get_current_user
from core.config import settings
from services.document_processor import document_processor

logger = logging.getLogger("mochi.documents")
router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt"}
_documents: list[dict[str, Any]] = []


class AskRequest(BaseModel):
    question: str


class DocumentResponse(BaseModel):
    id: int
    company_id: int
    name: str
    type: str
    size: int
    status: str
    summary: str | None = None
    created_at: str
    updated_at: str


@router.get("")
async def list_documents(user=Depends(get_current_user)):
    return [d for d in _documents if d.get("company_id") == user.company_id]


@router.post("/upload")
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "file.txt")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {"error": f"Tipo de arquivo nao suportado: {ext}"}, 400

    upload_dir = os.path.join(settings.upload_dir or "uploads", str(user.company_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_id = str(uuid.uuid4())[:8]
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(upload_dir, safe_name)

    content = await file.read()
    if len(content) > (settings.max_upload_mb or 15) * 1024 * 1024:
        return {"error": "Arquivo muito grande"}, 400

    with open(file_path, "wb") as f:
        f.write(content)

    doc = {
        "id": len(_documents) + 1,
        "company_id": user.company_id,
        "name": file.filename or "sem_nome",
        "type": ext[1:],
        "size": len(content),
        "path": file_path,
        "status": "processing",
        "summary": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    _documents.append(doc)

    try:
        text = await document_processor.extract_text(file_path, ext[1:])
        doc["status"] = "ready"
        doc["summary"] = await document_processor.summarize(text)
    except Exception as e:
        logger.error(f"Erro ao processar documento: {e}")
        doc["status"] = "error"

    return {
        "id": doc["id"],
        "name": doc["name"],
        "type": doc["type"],
        "size": doc["size"],
        "status": doc["status"],
        "summary": doc["summary"],
        "created_at": doc["created_at"],
    }


@router.get("/{doc_id}")
async def get_document(doc_id: int, user=Depends(get_current_user)):
    for d in _documents:
        if d["id"] == doc_id and d.get("company_id") == user.company_id:
            return d
    return {"error": "Documento nao encontrado"}, 404


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, user=Depends(get_current_user)):
    for i, d in enumerate(_documents):
        if d["id"] == doc_id and d.get("company_id") == user.company_id:
            if os.path.exists(d.get("path", "")):
                os.remove(d["path"])
            _documents.pop(i)
            return {"ok": True}
    return {"error": "Documento nao encontrado"}, 404


@router.post("/{doc_id}/analyze")
async def analyze_document(doc_id: int, user=Depends(get_current_user)):
    for d in _documents:
        if d["id"] == doc_id and d.get("company_id") == user.company_id:
            text = await document_processor.extract_text(d.get("path", ""), d.get("type", ""))
            analysis = await document_processor.analyze_document(text)
            d["summary"] = analysis["summary"]
            d["updated_at"] = datetime.now().isoformat()
            return analysis
    return {"error": "Documento nao encontrado"}, 404


@router.post("/{doc_id}/ask")
async def ask_document(doc_id: int, body: AskRequest, user=Depends(get_current_user)):
    for d in _documents:
        if d["id"] == doc_id and d.get("company_id") == user.company_id:
            text = await document_processor.extract_text(d.get("path", ""), d.get("type", ""))
            try:
                from services.llm import chat_completion
                response = await chat_completion([
                    {"role": "system", "content": f"Analise o seguinte documento e responda a pergunta do usuario com base no conteudo:\n\n{text[:4000]}"},
                    {"role": "user", "content": body.question},
                ])
                return {"question": body.question, "answer": response}
            except Exception as e:
                return {"question": body.question, "answer": f"Erro ao processar pergunta: {e}"}
    return {"error": "Documento nao encontrado"}, 404
