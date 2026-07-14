import httpx
from pydantic import BaseModel

from core.config import settings

SYSTEM_PROMPT = (
    "Você é o assistente virtual de uma empresa de desenvolvimento de software. "
    "Atenda exclusivamente sobre os seguintes produtos e serviços de software: sites, "
    "web apps, aplicativos móveis, automações, aplicativos desktop, APIs e integrações. "
    "Adote um tom formal e educado. Seja direto e conciso, em português (pt-BR), "
    "com respostas curtas e adequadas para WhatsApp. "
    "Caso o cliente mencione assuntos fora desse escopo (por exemplo, planos de "
    "internet, produtos físicos ou questões pessoais), informe gentilmente que a "
    "empresa atende apenas soluções de software e redirecione a conversa para os "
    "temas citados. "
    "Se o cliente desejar um orçamento, agendar uma conversa com um consultor ou "
    "falar com um atendente humano, oriente-o a digitar 0 para retornar ao menu principal."
)


class ChatMessage(BaseModel):
    role: str
    content: str


def _provider_cfg() -> dict:
    """Retorna a configuração do provedor de IA selecionado (LLM_PROVIDER)."""
    p = (settings.llm_provider or "groq").lower()
    if p == "openai":
        return {
            "kind": "openai",
            "base": settings.openai_base_url,
            "key": settings.api_openai,
            "model": settings.openai_model,
            "vision_model": settings.openai_vision_model,
        }
    if p == "anthropic":
        return {
            "kind": "anthropic",
            "base": settings.anthropic_base_url,
            "key": settings.api_anthropic,
            "model": settings.anthropic_model,
            "vision_model": None,
        }
    if p == "gemini":
        return {
            "kind": "gemini",
            "base": "https://generativelanguage.googleapis.com/v1beta",
            "key": settings.api_gemini,
            "model": settings.gemini_model,
            "vision_model": None,
        }
    if p == "ollama":
        return {
            "kind": "openai",
            "base": settings.ollama_base_url,
            "key": settings.api_ollama or "ollama",
            "model": settings.ollama_model,
            "vision_model": None,
        }
    # padrão: groq (compatível OpenAI)
    return {
        "kind": "openai",
        "base": settings.groq_base_url,
        "key": settings.api_groq,
        "model": settings.groq_primary_model,
        "vision_model": settings.groq_vision_model,
    }


def llm_configured() -> bool:
    cfg = _provider_cfg()
    if cfg["kind"] == "ollama":
        return True  # Ollama é local; não exige chave
    return bool(cfg["key"])


def _build_messages(user_message: str, history) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in history or []:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": user_message})
    return messages


_FALLBACK = "🤖 (não consegui responder agora) — digite 0 para o menu."
_UNAVAILABLE = "🤖 (IA indisponível no momento) — digite 0 para o menu."


async def generate_reply(user_message: str, history: list[ChatMessage] | None = None) -> str:
    cfg = _provider_cfg()
    if not llm_configured():
        return _UNAVAILABLE

    messages = _build_messages(user_message, history)
    tries = max(1, settings.groq_max_retries)

    if cfg["kind"] == "anthropic":
        return await _reply_anthropic(cfg, messages, tries)
    if cfg["kind"] == "gemini":
        return await _reply_gemini(cfg, messages, tries)
    return await _reply_openai(cfg, messages, tries)


async def _reply_openai(cfg: dict, messages: list[dict], tries: int) -> str:
    errors: list[str] = []
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.post(
                    f"{cfg['base']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {cfg['key']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": cfg["model"],
                        "messages": messages,
                        "temperature": settings.groq_temperature,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
                errors.append(f"{cfg['model']}: HTTP {resp.status_code}")
        except Exception as exc:
            errors.append(f"{cfg['model']}: {exc}")
    return _FALLBACK


async def _reply_anthropic(cfg: dict, messages: list[dict], tries: int) -> str:
    system = ""
    convo: list[dict] = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            convo.append({"role": m["role"], "content": m["content"]})
    errors: list[str] = []
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.post(
                    f"{cfg['base']}/messages",
                    headers={
                        "x-api-key": cfg["key"],
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": cfg["model"],
                        "max_tokens": 1024,
                        "system": system,
                        "messages": convo,
                        "temperature": settings.groq_temperature,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["content"][0]["text"].strip()
                errors.append(f"HTTP {resp.status_code}")
        except Exception as exc:
            errors.append(str(exc))
    return _FALLBACK


async def _reply_gemini(cfg: dict, messages: list[dict], tries: int) -> str:
    system = ""
    contents: list[dict] = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            role = "model" if m["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    body: dict = {
        "contents": contents,
        "generationConfig": {"temperature": settings.groq_temperature},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    errors: list[str] = []
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                url = f"{cfg['base']}/models/{cfg['model']}:generateContent?key={cfg['key']}"
                resp = await http.post(url, headers={"Content-Type": "application/json"}, json=body)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                errors.append(f"HTTP {resp.status_code}")
        except Exception as exc:
            errors.append(str(exc))
    return _FALLBACK


async def describe_image(image_base64: str, prompt: str = "Descreva esta imagem.") -> str:
    cfg = _provider_cfg()
    if cfg["kind"] != "openai" or not cfg["vision_model"]:
        return ""  # visão implementada apenas para provedores compatíveis OpenAI
    if not llm_configured():
        return ""
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                f"{cfg['base']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {cfg['key']}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": cfg["vision_model"],
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                    "temperature": settings.groq_temperature,
                },
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return ""
