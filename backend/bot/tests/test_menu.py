import pytest
from handlers.menu import get_menu_text


class FakeCliente:
    def __init__(self, estado='inicio', dados=None, nome=''):
        self.estado = estado
        self.dados = dados or {}
        self.nome = nome


class FakeDB:
    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        pass

    def query(self, *args):
        return FakeQuery()


class FakeQuery:
    def filter_by(self, **kwargs):
        return self

    def first(self):
        return None


@pytest.mark.asyncio
async def test_processar_menu_inicio_mostra_menu(monkeypatch):
    from main import processar_menu

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', 'qualquer coisa', cliente, db)
    assert resposta == get_menu_text('inicio')


@pytest.mark.asyncio
async def test_processar_menu_opcao_1_informacoes(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', '1', cliente, db)
    assert updates == [('informacoes', None)]
    assert resposta == get_menu_text('informacoes')


@pytest.mark.asyncio
async def test_processar_menu_opcao_2_agendar(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', '2', cliente, db)
    assert updates == [('agendar_nome', None)]
    assert resposta == get_menu_text('agendar_nome')


@pytest.mark.asyncio
async def test_processar_menu_opcao_3_falar_bot(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', '3', cliente, db)
    assert updates == [('falando_bot', None)]
    assert resposta == get_menu_text('falando_bot')


@pytest.mark.asyncio
async def test_processar_menu_opcao_4_atendente(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', '4', cliente, db)
    assert updates == [('falando_atendente', None)]
    assert resposta == get_menu_text('falando_atendente')


@pytest.mark.asyncio
async def test_processar_menu_opcao_5_sair(monkeypatch):
    from main import processar_menu

    db = FakeDB()
    cliente = FakeCliente('inicio')
    resposta = await processar_menu('5511999998888', '5', cliente, db)
    assert 'Obrigado' in resposta


@pytest.mark.asyncio
async def test_processar_menu_voltar_ao_inicio(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('informacoes')
    resposta = await processar_menu('5511999998888', '0', cliente, db)
    assert updates == [('inicio', None)]
    assert resposta == get_menu_text('inicio')


@pytest.mark.asyncio
async def test_processar_menu_falando_bot_volta_ao_inicio(monkeypatch):
    from main import processar_menu

    updates = []
    async def fake_update(telefone, estado, dados=None, db=None):
        updates.append((estado, dados))

    monkeypatch.setattr('main.update_cliente_estado', fake_update)

    db = FakeDB()
    cliente = FakeCliente('falando_bot')
    resposta = await processar_menu('5511999998888', '0', cliente, db)
    assert updates == [('inicio', None)]
    assert resposta == get_menu_text('inicio')


@pytest.mark.asyncio
async def test_processar_menu_falando_bot_mantem_estado(monkeypatch):
    from main import processar_menu

    db = FakeDB()
    cliente = FakeCliente('falando_bot')
    resposta = await processar_menu('5511999998888', 'qual é o horário?', cliente, db)
    assert resposta is None  # None = passa pro AI


def test_responder_comando_rapido_menu():
    from main import responder_comando_rapido

    resposta = responder_comando_rapido('/menu')
    assert 'NEXA TECH' in resposta
    assert '1️⃣' in resposta


def test_responder_auto_resposta_simples():
    from main import responder_automatica

    resposta = responder_automatica('oi')
    assert 'NEXA TECH' in resposta or 'sites' in resposta.lower()


def test_responder_comando_solucoes():
    from main import responder_comando_rapido

    resposta = responder_comando_rapido('/solucoes')
    assert 'sites' in resposta.lower() or 'automação' in resposta.lower()


@pytest.mark.asyncio
async def test_gerar_proposta_chama_ia(monkeypatch):
    from handlers.proposta import gerar_proposta

    async def fake_ask(message, history=None, system_prompt=None):
        assert system_prompt and 'proposta' in system_prompt.lower()
        return '*Proposta* gerada'

    monkeypatch.setattr('handlers.proposta.ask_ai', fake_ask)
    proposta = await gerar_proposta('Site institucional', 'Preciso de um site', 'João')
    assert 'Proposta' in proposta


@pytest.mark.asyncio
async def test_processar_menu_chamado_confirmar_gera_e_envia_proposta(monkeypatch):
    from main import processar_menu

    db = FakeDB()
    cliente = FakeCliente('chamado_confirmar', {'titulo': 'App', 'descricao': 'App de delivery'})

    async def fake_create_task(titulo, descricao, telefone):
        return 123

    async def fake_gerar_proposta(titulo, descricao, nome=''):
        return '📝 Proposta automática de teste'

    enviados = []

    async def fake_send(telefone, texto):
        enviados.append((telefone, texto))

    async def fake_get_model():
        return 'grok-2-1212'

    monkeypatch.setattr('main.create_task', fake_create_task)
    monkeypatch.setattr('main.gerar_proposta', fake_gerar_proposta)
    monkeypatch.setattr('main.send_whatsapp', fake_send)
    monkeypatch.setattr('main.get_model', fake_get_model)

    resposta = await processar_menu('5511999998888', '1', cliente, db)

    # Proposta deve ter sido persistida no banco
    assert any(isinstance(o, type(db.added[0]).__bases__[0]) for o in db.added) or db.added
    proposta_obj = next((o for o in db.added if o.__class__.__name__ == 'Proposta'), None)
    assert proposta_obj is not None
    assert proposta_obj.proposta_texto == '📝 Proposta automática de teste'
    # Proposta deve ter sido enviada ao cliente via WhatsApp
    assert any('Proposta automática' in t for _, t in enviados)
    assert 'proposta comercial' in resposta.lower()
