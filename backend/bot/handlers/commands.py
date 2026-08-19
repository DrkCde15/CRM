import json
import random
import re
import time
from dataclasses import dataclass
from typing import Callable, Awaitable

from sqlalchemy.orm import Session

from database import get_config, set_config
from handlers.ai import ask_ai
from handlers.menu import get_menu_text


DEFAULT_PREFIX = '/'
AUTO_RESPONDER_CONFIG_KEY = 'auto_responder_items'
AUTO_RESPONDER_ENABLED_KEY = 'auto_responder_enabled'
PREFIX_CONFIG_KEY = 'bot_prefix'

AUTO_RESPONDER_SEPARATOR_RE = re.compile(r'\s/\s')
LINK_RE = re.compile(r'(https?://|www\.|chat\.whatsapp\.com/)', re.IGNORECASE)

DEFAULT_AUTO_RESPONDER_ITEMS = [
    {'match': 'Oi', 'answer': 'Olá, tudo bem?'},
    {'match': 'Tudo bem', 'answer': 'Estou bem, obrigado por perguntar.'},
    {'match': 'Qual seu nome', 'answer': 'Meu nome é Takeshi Bot.'},
]


@dataclass
class CommandResult:
    handled: bool
    response: str | None = None


@dataclass(frozen=True)
class ParsedCommand:
    prefix: str
    name: str
    args: str


CommandHandler = Callable[[ParsedCommand, str, str, Session], Awaitable[str]]


def get_command_prefix(db: Session | None = None) -> str:
    prefix = get_config(PREFIX_CONFIG_KEY, DEFAULT_PREFIX, db).strip()
    return prefix or DEFAULT_PREFIX


def parse_command(text: str, db: Session | None = None) -> ParsedCommand | None:
    prefix = get_command_prefix(db)
    message = text.strip()

    if not message.startswith(prefix):
        return None

    without_prefix = message[len(prefix):].strip()
    if not without_prefix:
        return ParsedCommand(prefix=prefix, name='', args='')

    name, _, args = without_prefix.partition(' ')
    return ParsedCommand(prefix=prefix, name=name.lower(), args=args.strip())


async def process_command(
    telefone: str,
    text: str,
    msg_type: str,
    db: Session,
    started_at: float | None = None,
) -> CommandResult:
    parsed = parse_command(text, db)
    if not parsed:
        return CommandResult(handled=False)

    if not parsed.name:
        return CommandResult(True, _prefix_help(parsed.prefix))

    handler = COMMANDS.get(_canonical_command(parsed.name))
    if not handler:
        return CommandResult(True, _unknown_command(parsed.name, parsed.prefix))

    response = await handler(parsed, telefone, msg_type, db)
    if parsed.name in ('ping', 'p'):
        response = _with_latency(response, started_at)
    return CommandResult(True, response)


def find_auto_responder_reply(text: str, db: Session | None = None) -> str | None:
    if get_config(AUTO_RESPONDER_ENABLED_KEY, '0', db) != '1':
        return None

    normalized_text = _normalize_match(text)
    for item in get_auto_responder_items(db):
        if _normalize_match(item['match']) == normalized_text:
            return item['answer']
    return None


def find_moderation_reply(telefone: str, text: str, db: Session | None = None) -> str | None:
    if not telefone.endswith('@g.us'):
        return None
    if get_config(_group_config_key('anti_link', telefone), '0', db) != '1':
        return None
    if not LINK_RE.search(text):
        return None
    return 'Anti-link ativo neste grupo. Envie links somente com autorização dos administradores.'


def get_auto_responder_items(db: Session | None = None) -> list[dict[str, str]]:
    raw_items = get_config(AUTO_RESPONDER_CONFIG_KEY, '', db)
    if not raw_items:
        return [item.copy() for item in DEFAULT_AUTO_RESPONDER_ITEMS]

    try:
        data = json.loads(raw_items)
    except json.JSONDecodeError:
        return [item.copy() for item in DEFAULT_AUTO_RESPONDER_ITEMS]

    return [_clean_auto_responder_item(item) for item in data if _is_valid_item(item)]


def add_auto_responder_item(match: str, answer: str, db: Session | None = None) -> bool:
    items = get_auto_responder_items(db)
    normalized_match = _normalize_match(match)

    if any(_normalize_match(item['match']) == normalized_match for item in items):
        return False

    items.append({'match': match.strip(), 'answer': answer.strip()})
    _save_auto_responder_items(items, db)
    return True


def remove_auto_responder_item(index: int, db: Session | None = None) -> bool:
    items = get_auto_responder_items(db)
    item_index = index - 1

    if item_index < 0 or item_index >= len(items):
        return False

    items.pop(item_index)
    _save_auto_responder_items(items, db)
    return True


async def _menu_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return get_takeshi_menu(parsed.prefix)


async def _atendimento_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return get_menu_text('inicio')


async def _ping_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return 'Pong!'


async def _info_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return (
        '*Takeshi Mode ativo*\n\n'
        'Este bot mantém o atendimento FastAPI atual e adiciona comandos com prefixo, '
        'auto-responder e recursos úteis inspirados no Takeshi Bot.'
    )


async def _support_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return get_menu_text('informacoes')


async def _my_lid_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    identifier = telefone.split('@')[0]
    return f'Seu identificador nesta conversa é: `{identifier}`'


async def _dice_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return f'Você tirou *{random.randint(1, 6)}* no dado.'


async def _ai_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    if not parsed.args:
        return f'Use assim: `{parsed.prefix}ia sua pergunta aqui`'
    return await ask_ai(parsed.args)


async def _prefix_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return f'O prefixo atual é `{parsed.prefix}`. Use `{parsed.prefix}menu` para ver os comandos.'


async def _set_prefix_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    if not parsed.args:
        return f'Use assim: `{parsed.prefix}set-prefix !`'

    new_prefix = parsed.args.strip().split()[0]
    if len(new_prefix) > 3:
        return 'O prefixo deve ter no máximo 3 caracteres.'

    set_config(PREFIX_CONFIG_KEY, new_prefix, db)
    return f'Prefixo atualizado para `{new_prefix}`.'


async def _auto_responder_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    option = parsed.args.lower().strip()
    if option in ('on', 'ativar', '1'):
        set_config(AUTO_RESPONDER_ENABLED_KEY, '1', db)
        return 'Auto-responder ativado.'
    if option in ('off', 'desativar', '0'):
        set_config(AUTO_RESPONDER_ENABLED_KEY, '0', db)
        return 'Auto-responder desativado.'
    status = 'ativado' if get_config(AUTO_RESPONDER_ENABLED_KEY, '0', db) == '1' else 'desativado'
    return f'Auto-responder está {status}. Use `{parsed.prefix}auto-responder on` ou `{parsed.prefix}auto-responder off`.'


async def _add_auto_responder_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    parts = AUTO_RESPONDER_SEPARATOR_RE.split(parsed.args, maxsplit=1)
    if len(parts) != 2 or not all(part.strip() for part in parts):
        return f'Use assim: `{parsed.prefix}add-auto-responder termo / resposta`'

    match, answer = parts
    if not add_auto_responder_item(match, answer, db):
        return f'O termo "{match.strip()}" já existe no auto-responder.'
    return f'Termo "{match.strip()}" adicionado ao auto-responder.'


async def _list_auto_responder_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    items = get_auto_responder_items(db)
    if not items:
        return 'Nenhum termo cadastrado no auto-responder.'

    lines = ['*Auto-responder*']
    lines.extend(f'{index}. {item["match"]} -> {item["answer"]}' for index, item in enumerate(items, start=1))
    return '\n'.join(lines)


async def _delete_auto_responder_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    if not parsed.args.isdigit():
        return f'Use assim: `{parsed.prefix}delete-auto-responder 1`'

    index = int(parsed.args)
    if not remove_auto_responder_item(index, db):
        return f'Não encontrei o item {index} no auto-responder.'
    return f'Item {index} removido do auto-responder.'


async def _anti_link_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    if not telefone.endswith('@g.us'):
        return 'O anti-link só faz sentido em grupos.'

    key = _group_config_key('anti_link', telefone)
    option = parsed.args.lower().strip()
    if option in ('on', 'ativar', '1'):
        set_config(key, '1', db)
        return 'Anti-link ativado para este grupo.'
    if option in ('off', 'desativar', '0'):
        set_config(key, '0', db)
        return 'Anti-link desativado para este grupo.'
    status = 'ativado' if get_config(key, '0', db) == '1' else 'desativado'
    return f'Anti-link está {status}. Use `{parsed.prefix}anti-link on` ou `{parsed.prefix}anti-link off`.'


async def _unsupported_media_command(parsed: ParsedCommand, telefone: str, msg_type: str, db: Session) -> str:
    return (
        'Esse comando existe no Takeshi Bot original, mas ainda depende de suporte '
        'extra de mídia/grupo no gateway atual.'
    )


def get_takeshi_menu(prefix: str | None = None) -> str:
    prefix = prefix or DEFAULT_PREFIX
    return (
        '*Takeshi Bot*\n\n'
        f'Prefixo atual: `{prefix}`\n\n'
        '*Membros*\n'
        f'{prefix}ping - testar resposta\n'
        f'{prefix}info - detalhes do bot\n'
        f'{prefix}suporte - informações e contato\n'
        f'{prefix}meu-lid - ver seu identificador\n'
        f'{prefix}dado - jogar um dado\n\n'
        '*IA e atendimento*\n'
        f'{prefix}ia pergunta - conversar com IA\n'
        f'{prefix}atendimento - abrir menu de atendimento\n\n'
        '*Auto-responder*\n'
        f'{prefix}auto-responder on|off|status\n'
        f'{prefix}add-auto-responder termo / resposta\n'
        f'{prefix}list-auto-responder\n'
        f'{prefix}delete-auto-responder numero\n\n'
        '*Grupo*\n'
        f'{prefix}anti-link on|off|status\n'
        f'{prefix}prefixo - ver prefixo atual'
    )


def _save_auto_responder_items(items: list[dict[str, str]], db: Session | None = None) -> None:
    set_config(AUTO_RESPONDER_CONFIG_KEY, json.dumps(items, ensure_ascii=False), db)


def _canonical_command(name: str) -> str:
    aliases = {
        'p': 'ping',
        'help': 'menu',
        'ajuda': 'menu',
        'comandos': 'menu',
        'suporte': 'support',
        'atendimento': 'atendimento',
        'gpt': 'ia',
        'chatgpt': 'ia',
        'prefix': 'prefixo',
        'setprefix': 'set-prefix',
        'add-auto': 'add-auto-responder',
        'add-responder': 'add-auto-responder',
        'listar-auto': 'list-auto-responder',
        'list-auto': 'list-auto-responder',
        'del-auto': 'delete-auto-responder',
        'deletar-auto': 'delete-auto-responder',
        'sticker': 'unsupported-media',
        'figurinha': 'unsupported-media',
        'to-image': 'unsupported-media',
        'to-gif': 'unsupported-media',
        'to-mp3': 'unsupported-media',
        'rename': 'unsupported-media',
        'removebg': 'unsupported-media',
        'gerar-link': 'unsupported-media',
    }
    return aliases.get(name, name)


def _unknown_command(name: str, prefix: str) -> str:
    return f'Comando `{name}` não encontrado. Use `{prefix}menu` para ver os comandos disponíveis.'


def _prefix_help(prefix: str) -> str:
    return f'Este é meu prefixo. Use `{prefix}menu` para ver os comandos disponíveis.'


def _with_latency(response: str, started_at: float | None) -> str:
    if started_at is None:
        return response
    elapsed_ms = max(0, round((time.perf_counter() - started_at) * 1000))
    return f'{response}\nTempo de resposta: {elapsed_ms} ms'


def _normalize_match(text: str) -> str:
    return ' '.join(text.strip().lower().split())


def _is_valid_item(item: object) -> bool:
    return isinstance(item, dict) and bool(item.get('match')) and bool(item.get('answer'))


def _clean_auto_responder_item(item: dict[str, str]) -> dict[str, str]:
    return {'match': str(item['match']).strip(), 'answer': str(item['answer']).strip()}


def _group_config_key(name: str, group_jid: str) -> str:
    group_id = group_jid.split('@')[0]
    return f'{name}_{group_id}'


COMMANDS: dict[str, CommandHandler] = {
    'menu': _menu_command,
    'atendimento': _atendimento_command,
    'ping': _ping_command,
    'info': _info_command,
    'support': _support_command,
    'meu-lid': _my_lid_command,
    'dado': _dice_command,
    'ia': _ai_command,
    'prefixo': _prefix_command,
    'set-prefix': _set_prefix_command,
    'auto-responder': _auto_responder_command,
    'add-auto-responder': _add_auto_responder_command,
    'list-auto-responder': _list_auto_responder_command,
    'delete-auto-responder': _delete_auto_responder_command,
    'anti-link': _anti_link_command,
    'unsupported-media': _unsupported_media_command,
}
