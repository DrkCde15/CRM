import httpx
from pydantic import BaseModel

from core.config import settings

SYSTEM_PROMPT = (
    "Você é o assistente virtual de um CRM de atendimento ao cliente. "
    "Seja cordial, direto e conciso. Responda em português (pt-BR). "
    "Se o cliente quiser agendar, abrir chamado ou falar com atendente, oriente-o a "
    "digitar 0 para voltar ao menu principal. Mantenha respostas curtas, ideais para WhatsApp."
)


class ChatMessage(BaseModel):
    role: str
    content: str


def _strip_prefix(model: str) -> str:
    return model.split("/", 1)[1] if "/" in model else model


def _model_order() -> list[str]:
    models = [_strip_prefix(settings.groq_primary_model)]
    for m in settings.groq_fallback_models.split(","):
        m = m.strip()
        if m:
            models.append(_strip_prefix(m))
    seen: list[str] = []
    for m in models:
        if m and m not in seen:
            seen.append(m)
    return seen


def llm_configured() -> bool:
    return bool(settings.api_groq and settings.groq_base_url)


async def generate_reply(user_message: str, history: list[ChatMessage] | None = None) -> str:
    if not llm_configured():
        return "🤖 (IA indisponível no momento) — digite 0 para o menu."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in history or []:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": user_message})

    errors: list[str] = []
    for model in _model_order():
        for _attempt in range(max(1, settings.groq_max_retries)):
            try:
                async with httpx.AsyncClient(timeout=30) as http:
                    resp = await http.post(
                        f"{settings.groq_base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.api_groq}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": settings.groq_temperature,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip()
                    errors.append(f"{model}: HTTP {resp.status_code}")
            except Exception as exc:
                errors.append(f"{model}: {exc}")
        if errors:
            continue

    return "🤖 (não consegui responder agora) — digite 0 para o menu."


async def describe_image(image_base64: str, prompt: str = "Descreva esta imagem.") -> str:
    if not llm_configured():
        return ""
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                f"{settings.groq_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.api_groq}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _strip_prefix(settings.groq_vision_model),
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
