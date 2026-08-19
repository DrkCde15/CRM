# Integração com a API Groq (compatível com OpenAI) para respostas inteligentes
import base64
import asyncio
import tempfile
import os
import logging
from openai import AsyncOpenAI
from config import GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL
from database import get_config, get_cache_response, set_cache_response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_client = None
_cached_key = ''
_cached_url = ''

FALLBACK_MODELS = [
    'openai/gpt-oss-120b',
    'gemma2-9b-it',
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
]

VISION_MODELS = [
    'llama-3.2-11b-vision-preview',
    'llava-v1.5-7b',
]

FRIENDLY_ERROR = (
    "Desculpe, o atendimento por IA está temporariamente sobrecarregado. "
    "Tente novamente em alguns minutos ou digite *0* para falar com um atendente."
)


async def _get_client():
    global _client, _cached_key, _cached_url
    key = GROQ_API_KEY
    url = GROQ_BASE_URL
    if key != _cached_key or url != _cached_url:
        _client = AsyncOpenAI(api_key=key, base_url=url) if key else None
        _cached_key = key
        _cached_url = url
    return _client


async def get_model() -> str:
    return GROQ_MODEL


def is_configured() -> bool:
    return bool(GROQ_API_KEY)


def _normalize(text: str) -> str:
    return text.strip().lower()


SYSTEM_PROMPT = """Você é o assistente digital de uma startup brasileira de tecnologia focada em desenvolvimento de software sob medida.

REGRAS GERAIS:
- Seja educado, técnico e empreendedor.
- Responda em português brasileiro.
- Mantenha respostas curtas (máximo 3 parágrafos).
- Use formatação WhatsApp (*negrito* para ênfase).
- Se o cliente perguntar algo fora do escopo, diga educadamente que não pode responder e sugira falar com um atendente (opção 4 do menu).

INFORMAÇÕES DA EMPRESA:
- Especialidade: criação de sites, aplicativos, automações, design, dados, APIs e soluções digitais
- Público: startups, empresas, negócios locais e projetos que precisam de software moderno
- Contato: contato@nexatech.com.br
- Suporte: suporte@nexatech.com.br
- Serviços principais: desenvolvimento web, apps, automação, UX/UI, dados e integrações

MENU PRINCIPAL (quando aplicável, lembre o cliente das opções):
1️⃣ *Soluções & Serviços*
2️⃣ *Agendar reunião*
3️⃣ *Falar com o Bot* 🤖
4️⃣ *Falar com atendente*
5️⃣ *Sair*
6️⃣ *Solicitar orçamento* 💰
7️⃣ *Agendar demo* 🚀

EXEMPLOS DE ATENDIMENTO:

Cliente: "quero um site moderno para minha empresa"
Resposta: "Ótimo! Podemos criar uma presença digital forte com *site institucional*, *landing page* e estratégia de conversão. 🌐
Se quiser, podemos agendar uma *reunião* ou uma *demo* para entender melhor o seu projeto. Digite *2* para agendar ou *0* para voltar ao menu."

Cliente: "quero um app para minha startup"
Resposta: "Perfeito! Temos experiência em desenvolvimento de *apps web* e *soluções digitais* sob medida para startups e empresas. 📱
Posso te orientar sobre escopo, stack e próximos passos. Se quiser, agende uma *demo* ou fale com a equipe."

Cliente: "quero automatizar processos"
Resposta: "Excelente! Automatizações são uma das áreas mais estratégicas para ganhar produtividade. ⚙️
Podemos mapear tarefas manuais, integrações e fluxos para reduzir tempo e erros."

Cliente: "preciso de design e UX"
Resposta: "Sem problema! Podemos criar *UX/UI*, identidade visual, interfaces intuitivas e experiências que aumentam conversão. 🎨"

Cliente: "você faz API ou integração?"
Resposta: "Sim! Trabalhamos com *APIs*, integrações e conectividade entre sistemas, apps e plataformas. 🔌"

Cliente: "preciso de dashboard com dados"
Resposta: "Isso entra perfeitamente no nosso escopo. Podemos montar *dashboards*, relatórios e analise de dados para apoiar decisões. 📊"

Cliente: "obrigado"
Resposta: "Por nada! 😊 Estamos aqui para transformar sua ideia em solução digital. Digite *0* para voltar ao menu principal ou *Olá* quando precisar."

Cliente: "qual é o seu foco?"
Resposta: "Nosso foco é criar software sob medida para sites, apps, automações, design, dados e integrações de tecnologia digital. 🚀"

QUANDO O CLIENTE PARECER CONFUSO:
- Seja paciente e ofereça ajuda
- Explique que ele pode digitar *0* ou *menu* a qualquer momento para voltar ao menu principal
- Pergunte se prefere uma *demo*, *orçamento* ou falar com um atendente humano"""


_whisper_model = None
_whisper_model_lock = asyncio.Lock()


def _get_whisper_model():
    # Singleton do modelo faster-whisper (carregado uma vez em memória)
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        model_size = get_config('whisper_model', 'base')
        try:
            _whisper_model = WhisperModel(model_size, device='cpu', compute_type='int8')
        except Exception:
            _whisper_model = WhisperModel('tiny', device='cpu', compute_type='int8')
    return _whisper_model


def _transcribe_sync(audio_bytes: bytes, ext: str) -> str | None:
    # Executa transcrição síncrona (bloqueante) em thread separada
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        model = _get_whisper_model()
        segments, _ = model.transcribe(tmp_path, language='pt', beam_size=5)
        return ''.join(segment.text for segment in segments).strip()
    except Exception as e:
        logger.error('transcription_failed', error=str(e))
        return None
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def transcribe_audio(audio_base64: str, mimetype: str = 'audio/ogg') -> str | None:
    # Transcreve áudio usando faster-whisper (roda em thread separada pra não travar o event loop)
    ext = mimetype.split('/')[-1]
    ext = ext.replace('x-wav', 'wav').replace('x-m4a', 'm4a').replace('x-ms-wma', 'wma')

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        logger.error('base64_decode_failed', error=str(e))
        return None

    async with _whisper_model_lock:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _transcribe_sync, audio_bytes, ext)


async def ask_ai(message: str, history: list = None, system_prompt: str | None = None) -> str:
    # Verifica cache primeiro (apenas para mensagens sem histórico e sem prompt customizado)
    if not history and system_prompt is None:
        cached = get_cache_response(message)
        if cached:
            return cached

    client = await _get_client()
    if not client:
        return FRIENDLY_ERROR

    messages = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT}]

    if history:
        for h in history[-10:]:
            messages.append({"role": "user", "content": h.get("user", "")})
            if h.get("assistant"):
                messages.append({"role": "assistant", "content": h["assistant"]})

    messages.append({"role": "user", "content": message})

    models_to_try = [await get_model()] + [m for m in FALLBACK_MODELS if m != await get_model()]
    last_error = None

    for model in models_to_try:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=300,
                temperature=0.7,
            )
            reply = response.choices[0].message.content.strip()
            # Cacheia respostas de perguntas sem histórico
            if not history:
                set_cache_response(message, reply, model=model)
            return reply
        except Exception as e:
            last_error = e
            # Se for erro de autenticação (401), não adianta tentar outro modelo
            if hasattr(e, 'status_code') and e.status_code == 401:
                break
            continue

    # Todas as tentativas falharam
    return FRIENDLY_ERROR


async def ask_ai_with_image(message: str, image_base64: str) -> str:
    # Envia imagem + texto para um modelo vision da Groq
    client = await _get_client()
    if not client:
        return FRIENDLY_ERROR

    prompt = message.strip() or 'Descreva esta imagem e responda o cliente adequadamente.'

    content = [
        {'type': 'text', 'text': prompt},
        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_base64}'}},
    ]

    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user', 'content': content},
    ]

    models_to_try = VISION_MODELS[:]
    last_error = None

    for model in models_to_try:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=300,
                temperature=0.7,
            )
            reply = response.choices[0].message.content.strip()
            return reply
        except Exception as e:
            last_error = e
            if hasattr(e, 'status_code') and e.status_code == 401:
                break
            continue

    return FRIENDLY_ERROR
