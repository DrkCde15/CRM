# Textos do menu interativo — cada constante representa uma tela do fluxo do bot
MENU_PRINCIPAL = """╔══════════════════════╗
║   *NEXA TECH*        ║
╚══════════════════════╝

Olá! 👋 Somos uma startup focada em tecnologia digital. Como podemos transformar sua ideia em solução?

1️⃣ *Soluções & Serviços*
2️⃣ *Agendar reunião*
3️⃣ *Falar com o Bot* 🤖
4️⃣ *Falar com atendente*
5️⃣ *Sair*
6️⃣ *Solicitar orçamento* 💰
7️⃣ *Agendar demo* 🚀

Digite o número da opção desejada:"""

INFORMACOES = """╔══════════════════════╗
║     *SOLUÇÕES*        ║
╚══════════════════════╝

📌 *Sites e landing pages*
📌 *Aplicativos web e mobile*
📌 *Automação de processos*
📌 *Design e UX/UI*
📌 *Dados, BI e análise*
📌 *APIs e integrações*
📌 *Contato:* contato@ryotech.com.br

Digite *0* para voltar ao menu principal."""

AGENDAR_NOME = "Qual o *nome* do responsável pela demanda?"
AGENDAR_SERVICO = "Qual *serviço* você deseja avaliar? (ex: site, app, automação, design, dados, API, sistema)"
AGENDAR_DATA = "Informe a *data e horário* preferidos para a reunião/demo (ex: 15/07 14:30):"
AGENDAR_CONFIRMA = "Confirma a reunião/demo?\n\n📌 *Nome:* {nome}\n📌 *Serviço:* {servico}\n📌 *Data/Hora:* {data_hora}\n\nDigite *1* para confirmar ou *0* para cancelar."
AGENDAR_SUCESSO = "✅ *Reunião/demo agendada com sucesso!*\n\nNossa equipe entrará em contato para confirmar os detalhes. Digite *0* para voltar ao menu."
AGENDAR_CANCELADO = "❌ Agendamento cancelado. Digite *0* para voltar ao menu."

FALAR_BOT = "🤖 *Modo conversa ativado!*\n\nPosso te ajudar com sites, apps, automações, design, dados, APIs e soluções digitais sob medida. Digite *0* ou *menu* a qualquer momento para voltar ao menu principal."

FALAR_ATENDENTE = "🔁 Transferindo para o time de atendimento...\n\nEm breve um especialista da nossa equipe vai falar com você sobre o projeto ou solução que você busca."

CHAMADO_TITULO = "📋 *Solicitar orçamento*\n\nQual o *tema* da sua demanda? (ex: site institucional, app, automação, dashboard, API)"
CHAMADO_DESCRICAO = "📋 Descreva sua necessidade, objetivo do projeto, prazo e qualquer detalhe importante:"
CHAMADO_CONFIRMA = "Confirma o envio do orçamento?\n\n📌 *Título:* {titulo}\n📌 *Descrição:* {descricao}\n\nDigite *1* para confirmar ou *0* para cancelar."
CHAMADO_SUCESSO = "✅ *Solicitação enviada com sucesso!*\n\nNossa equipe vai analisar sua demanda e entrar em contato em breve. Digite *0* para voltar ao menu."
CHAMADO_CANCELADO = "❌ Solicitação cancelada. Digite *0* para voltar ao menu."

REUNIAO_TITULO = "📅 *Agendar reunião*\n\nQual o *assunto* da reunião?"
REUNIAO_DATA = "📅 Informe a *data e horário* desejados (ex: 15/07 14:30):"
REUNIAO_CONFIRMA = "Confirma o agendamento da reunião?\n\n📌 *Assunto:* {titulo}\n📌 *Data/Hora:* {data_hora}\n\nDigite *1* para confirmar ou *0* para cancelar."
REUNIAO_SUCESSO = "✅ *Reunião agendada!*\n\nVocê receberá um lembrete próximo da data. Digite *0* para voltar ao menu."
REUNIAO_CANCELADO = "❌ Reunião cancelada. Digite *0* para voltar ao menu."


def get_menu_text(estado, dados=None):
    # Retorna o texto da tela correspondente ao estado atual do cliente
    if estado == 'inicio':
        return MENU_PRINCIPAL
    if estado == 'informacoes':
        return INFORMACOES
    if estado == 'agendar_nome':
        return AGENDAR_NOME
    if estado == 'agendar_servico':
        return AGENDAR_SERVICO
    if estado == 'agendar_data':
        return AGENDAR_DATA
    if estado == 'agendar_confirmar':
        return AGENDAR_CONFIRMA.format(**dados) if dados else AGENDAR_CONFIRMA
    if estado == 'agendamento_sucesso':
        return AGENDAR_SUCESSO
    if estado == 'agendamento_cancelado':
        return AGENDAR_CANCELADO
    if estado == 'chamado_titulo':
        return CHAMADO_TITULO
    if estado == 'chamado_descricao':
        return CHAMADO_DESCRICAO
    if estado == 'chamado_confirmar':
        return CHAMADO_CONFIRMA.format(**dados) if dados else CHAMADO_CONFIRMA
    if estado == 'chamado_sucesso':
        return CHAMADO_SUCESSO
    if estado == 'chamado_cancelado':
        return CHAMADO_CANCELADO
    if estado == 'reuniao_titulo':
        return REUNIAO_TITULO
    if estado == 'reuniao_data':
        return REUNIAO_DATA
    if estado == 'reuniao_confirmar':
        return REUNIAO_CONFIRMA.format(**dados) if dados else REUNIAO_CONFIRMA
    if estado == 'reuniao_sucesso':
        return REUNIAO_SUCESSO
    if estado == 'reuniao_cancelado':
        return REUNIAO_CANCELADO
    if estado == 'falando_atendente':
        return FALAR_ATENDENTE
    if estado == 'falando_bot':
        return FALAR_BOT
    return MENU_PRINCIPAL
