const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let user, health = {}, authMode = 'login', currentView = 'overview', instances = [], qrInstance, toastTimer;
async function api() { throw new Error('Esta é uma demonstração visual.'); }

function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 6000); }
$('#year').textContent = new Date().getFullYear();
function openAuth(mode) {
  authMode = mode;
  const register = mode === 'register', forgot = mode === 'forgot', reset = mode === 'reset';
  $('#auth-form').reset(); $('#auth-error').textContent = '';
  $('#auth-title').textContent = register ? 'Seu próximo passo começa aqui.' : forgot ? 'Vamos recuperar seu acesso.' : reset ? 'Uma nova senha.' : 'Bom ter você de volta.';
  $('#auth-subtitle').textContent = register ? 'Crie sua conta e conheça seu workspace.' : forgot ? 'Enviaremos um link para seu e-mail cadastrado.' : reset ? 'Escolha uma senha para proteger sua conta.' : 'Entre para acessar seu workspace.';
  $('#name-field').hidden = !register; $('[name=name]', $('#auth-form')).required = register;
  $('#email-field').hidden = reset; $('[name=email]', $('#auth-form')).required = !reset;
  $('#password-field').hidden = forgot;
  const password = $('[name=password]', $('#auth-form'));
  password.required = !forgot; password.minLength = register || reset ? 10 : 1; password.autocomplete = register || reset ? 'new-password' : 'current-password'; password.type = 'password';
  $('#password-help').hidden = !(register || reset);
  $('#forgot-password').hidden = mode !== 'login';
  $('#auth-submit').textContent = register ? 'Criar minha conta' : forgot ? 'Enviar link de recuperação' : reset ? 'Salvar nova senha' : 'Entrar na plataforma';
  $('#auth-switch').innerHTML = register ? 'Já tem uma conta? <button data-auth="login">Entrar</button>' : mode === 'login' ? 'Ainda não tem uma conta? <button data-auth="register">Cadastre-se</button>' : '<button data-auth="login">Voltar para o login</button>';
  if (!$('#auth-dialog').open) $('#auth-dialog').showModal();
}
document.addEventListener('click', event => {
  const authButton = event.target.closest('[data-auth]'); if (authButton) openAuth(authButton.dataset.auth);
  if (event.target.closest('[data-chat]')) openChat();
  const phoneButton = event.target.closest('[data-phone]'); if (phoneButton) renderPhone(phoneButton.dataset.phone);
  if (event.target.closest('.modal-close')) event.target.closest('dialog').close();
});
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
$('#forgot-password').onclick = () => openAuth('forgot');
$('#toggle-password').onclick = () => { const input = $('[name=password]', $('#auth-form')); input.type = input.type === 'password' ? 'text' : 'password'; $('#toggle-password').setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha'); };
$('#auth-form').onsubmit = async event => {
  event.preventDefault(); const button = $('#auth-submit'); button.disabled = true; $('#auth-error').textContent = '';
  try {
    const body = Object.fromEntries(new FormData(event.target));
    if (authMode === 'reset') body.token = new URLSearchParams(location.search).get('reset');
    const result = await api(`/auth/${authMode}`, body);
    if (result.user) { user = result.user; $('#auth-dialog').close(); await showDashboard(); }
    else { toast(result.message); $('#auth-dialog').close(); if (authMode === 'reset') { history.replaceState({}, '', '/'); openAuth('login'); } }
  } catch (error) { $('#auth-error').textContent = error.message; }
  finally { button.disabled = false; }
};
function renderPhone(tab) {
  $$('.phone-tabs [data-phone]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.phone === tab)));
  $$('.phone-nav [data-phone]').forEach(button => button.classList.toggle('active', button.dataset.phone === tab));
  if (tab === 'overview') {
    $('#phone-content').innerHTML = `<p class="phone-greeting">Olá, boas ideias. ✧</p><h3 class="phone-heading">Tudo no seu ritmo.</h3><div class="phone-summary"><span>Sua operação · demonstração</span><strong>Uma visão <small>completa.</small></strong><div class="phone-chart">${[25,40,33,56,43,64,48,72,64,78,68,91,78,100].map(height => `<i ></i>`).join('')}</div></div><div class="phone-stats"><div>Serviços no app<strong>Cloud</strong></div><div>Integrações<strong>API</strong></div></div><h4 class="phone-subheading">Seu ecossistema</h4><div class="phone-row"><span>☁</span> Infraestrutura <b>Prévia</b></div><div class="phone-row"><span>⌘</span> Conexões WhatsApp <b>Prévia</b></div>`;
  } else if (tab === 'connections') {
    $('#phone-content').innerHTML = '<p class="phone-greeting">Tudo conectado.</p><h3 class="phone-heading">Seu ecossistema.</h3><div class="phone-summary"><span>CONEXÕES · DEMONSTRAÇÃO</span><strong>Mais perto.</strong><p class="phone-greeting">Suas ferramentas em um só lugar.</p></div><h4 class="phone-subheading">Integrações da plataforma</h4><div class="phone-row"><span>◉</span> WhatsApp API <b>Prévia</b></div><div class="phone-row"><span>☁</span> Smart Cloud <b>Prévia</b></div><div class="phone-row"><span>⌘</span> Sistemas da empresa <b>Prévia</b></div><button class="phone-demo-button" data-auth="register">Conhecer a plataforma</button>';
  } else {
    $('#phone-content').innerHTML = '<p class="phone-greeting">Uma conversa abre caminhos.</p><h3 class="phone-heading">Seu Smart Assist.</h3><div class="phone-chat">Olá! Vamos encontrar a tecnologia certa para o próximo passo da sua empresa?</div><button class="phone-demo-button" data-chat>Conversar com o assistente</button><p class="phone-greeting">Prévia do aplicativo em desenvolvimento.</p>';
  }
}
renderPhone('overview');
function openChat() { $('#chat-widget').hidden = false; $('#chat-launcher').setAttribute('aria-expanded', 'true'); $('#chat-form input').focus(); }
$('#chat-launcher').onclick = () => { if ($('#chat-widget').hidden) openChat(); else $('#close-chat').click(); };
$('#close-chat').onclick = () => { $('#chat-widget').hidden = true; $('#chat-launcher').setAttribute('aria-expanded', 'false'); $('#chat-launcher').focus(); };
function chatMessage(text, type) { const element = document.createElement('div'); element.className = `chat-message ${type}`; element.textContent = text; $('#chat-messages').append(element); element.scrollIntoView({ block: 'nearest' }); return element; }
async function sendMessage(message) {
  if ($('#chat-form button').disabled) return;
  chatMessage(message, 'user'); $('#chat-form button').disabled = true; const pending = chatMessage('Um instante…', 'bot');
  try { const result = await api('/chat', { message }); pending.textContent = result.message; $('#chat-mode').textContent = result.mode === 'ai' ? 'Atendimento com inteligência artificial' : 'Atendimento guiado · IA não configurada'; }
  catch (error) { pending.textContent = error.message; }
  finally { $('#chat-form button').disabled = false; pending.scrollIntoView({ block: 'nearest' }); }
}
$('#chat-form').onsubmit = event => { event.preventDefault(); const input = $('#chat-form input'); const message = input.value.trim(); if (message) { input.value = ''; sendMessage(message); } };
$$('[data-prompt]').forEach(button => button.onclick = () => sendMessage(button.dataset.prompt));
async function showDashboard() {
  $('#landing').hidden = true; $('#dashboard').hidden = false; $('#account-name').textContent = user.name; $('#account-email').textContent = user.email; window.scrollTo(0,0);
  health = await api('/health'); await renderDashboard(currentView);
}
function connectionStatus(state) { return state === 'open' ? 'Conectado' : state === 'unavailable' ? 'Serviço indisponível' : state === 'connecting' ? 'Conectando' : 'Aguardando conexão'; }
async function renderDashboard(view) {
  currentView = view;
  $$('.dash-nav').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#view-label').textContent = { overview: 'Visão geral', connections: 'Conexões WhatsApp', assistant: 'Assistente' }[view];
  $('#dash-content').innerHTML = '<p class="muted" role="status">Carregando seu workspace…</p>';
  try {
    const result = await api('/instances'); instances = result.instances;
    if (view === 'overview') {
      $('#dash-content').innerHTML = `<div class="dash-title"><div><span class="eyebrow">SEU CENTRO DE CONTROLE</span><h1>Olá, ${escapeHTML(user.name.split(' ')[0])}.</h1><p>Uma visão do seu ecossistema Smartprotocol.</p></div><button class="button" id="overview-connect">Nova conexão</button></div><div class="dash-metrics"><div class="metric">Conexões criadas<strong>${instances.length}</strong><small>Instâncias da sua conta</small></div><div class="metric">WhatsApp conectado<strong>${instances.filter(instance => instance.state === 'open').length}</strong><small>Conexões ativas neste momento</small></div><div class="metric">Assistente<strong>${health.ai ? 'IA' : 'Guiado'}</strong><small>${health.ai ? 'Provedor configurado' : 'Chave de IA pendente'}</small></div></div><div class="dash-panel"><h2>Sua infraestrutura</h2><p>Estado dos serviços desta instalação.</p><div class="service-status"><span>Banco de dados</span><span class="status-tag">${health.storage === 'postgresql' ? 'PostgreSQL' : 'SQLite · local'}</span></div><div class="service-status"><span>Redis</span><span class="status-tag ${health.redis ? '' : 'pending'}">${health.redis ? 'Conectado' : 'Não configurado'}</span></div><div class="service-status"><span>Evolution API</span><span class="status-tag ${health.evolution ? '' : 'pending'}">${health.evolution ? 'URL configurada' : 'Não configurada'}</span></div><div class="service-status"><span>Aplicativo mobile</span><span class="status-tag pending">Em desenvolvimento</span></div></div><div class="dash-panel"><span class="eyebrow">PRÓXIMO PASSO</span><h2>Conecte seu atendimento.</h2><p>Crie uma instância, escaneie o QR Code pelo WhatsApp e acompanhe a conexão por aqui.</p><button class="button secondary" id="go-connections">Explorar conexões</button></div>`;
      $('#overview-connect').onclick = openInstance; $('#go-connections').onclick = () => renderDashboard('connections');
    } else if (view === 'connections') {
      $('#dash-content').innerHTML = `<div class="dash-title"><div><span class="eyebrow">WHATSAPP · EVOLUTION API</span><h1>Suas conexões.</h1><p>Um espaço próprio para as instâncias da sua empresa.</p></div><button class="button" id="new-instance">Nova conexão</button></div>${!result.configured ? '<div class="notice">A Evolution API ainda não foi configurada nesta instalação. Inicie a composição Docker para criar instâncias e gerar QR Codes reais.</div>' : ''}${instances.length ? instances.map(instance => `<article class="instance-card"><header><div><h3>${escapeHTML(instance.name)}</h3><small>${escapeHTML(instance.id)}</small></div><span class="status-tag ${instance.state === 'open' ? '' : 'pending'}">${connectionStatus(instance.state)}</span></header><div class="instance-actions"><button class="button" data-instance="${instance.id}" data-action="connect">Gerar QR Code</button><button class="button secondary" data-instance="${instance.id}" data-action="restart">Reiniciar</button><button class="button secondary" data-instance="${instance.id}" data-action="logout">Desconectar</button></div></article>`).join('') : '<div class="dash-panel empty-state"><span>⌘</span><h2>Sua primeira conexão começa aqui.</h2><p>Conecte um número de WhatsApp à sua operação. As instâncias desta conta ficam separadas das outras contas.</p><button class="button secondary" id="empty-connect">Criar primeira conexão</button></div>'}<button class="text-button" id="reload-instances">Atualizar status</button>`;
      $('#new-instance').onclick = openInstance; if ($('#empty-connect')) $('#empty-connect').onclick = openInstance;
      $('#reload-instances').onclick = () => renderDashboard('connections');
      $$('[data-instance]').forEach(button => button.onclick = async () => {
        const { instance, action } = button.dataset;
        if (action === 'logout' && !confirm('Desconectar este WhatsApp? Será necessário escanear outro QR Code para reconectar.')) return;
        button.disabled = true;
        try { if (action === 'connect') { qrInstance = instance; $('#qr-dialog').showModal(); await loadQR(); } else { await api(`/instances/${instance}/${action}`, {}); toast(action === 'restart' ? 'Reinício solicitado.' : 'WhatsApp desconectado.'); await renderDashboard('connections'); } }
        catch (error) { toast(error.message); } finally { button.disabled = false; }
      });
    } else {
      $('#dash-content').innerHTML = `<div class="dash-title"><div><span class="eyebrow">SMART ASSIST</span><h1>Uma conversa. Novas possibilidades.</h1><p>Encontre caminhos para a tecnologia da sua empresa.</p></div></div><div class="dash-panel"><h2>${health.ai ? 'Seu assistente de IA.' : 'Conheça o atendimento guiado.'}</h2><p>${health.ai ? 'O provedor de inteligência artificial está configurado nesta instalação.' : 'A chave do provedor de IA ainda não foi configurada. Você pode explorar respostas guiadas sobre os serviços da Smartprotocol.'}</p><button class="button" data-chat>Abrir assistente</button></div>`;
    }
  } catch (error) { $('#dash-content').innerHTML = `<div class="notice">${escapeHTML(error.message)}</div><button class="button secondary" id="retry-dashboard">Tentar novamente</button>`; $('#retry-dashboard').onclick = () => renderDashboard(view); }
}
function openInstance() { $('#instance-error').textContent = ''; $('#instance-form').reset(); $('#instance-dialog').showModal(); }
$('#instance-form').onsubmit = async event => {
  event.preventDefault(); const button = $('#instance-form button'); button.disabled = true; $('#instance-error').textContent = '';
  try { const result = await api('/instances', Object.fromEntries(new FormData(event.target))); $('#instance-dialog').close(); await renderDashboard('connections'); qrInstance = result.id; $('#qr-dialog').showModal(); await loadQR(); }
  catch (error) { $('#instance-error').textContent = error.message; } finally { button.disabled = false; }
};
async function loadQR() {
  $('#qr-content').textContent = 'Solicitando QR Code…'; $('#refresh-qr').disabled = true;
  try {
    const result = await api(`/instances/${qrInstance}/connect`, {});
    if (result.base64 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.base64)) { const image = document.createElement('img'); image.src = result.base64; image.alt = 'QR Code para conectar WhatsApp'; $('#qr-content').replaceChildren(image); }
    else $('#qr-content').textContent = 'QR Code ainda não disponível. Se já conectou, feche esta janela e atualize o status. Caso contrário, aguarde e tente novamente.';
  } catch (error) { $('#qr-content').textContent = error.message; } finally { $('#refresh-qr').disabled = false; }
}
$('#refresh-qr').onclick = loadQR;
$$('.dash-nav').forEach(button => button.onclick = () => renderDashboard(button.dataset.view));
$('#logout').onclick = async () => { try { await api('/auth/logout', {}); user = null; $('#dashboard').hidden = true; $('#landing').hidden = false; currentView = 'overview'; } catch (error) { toast(error.message); } };

// A apresentação não coleta credenciais nem consulta serviços externos.
openAuth = function () {
  $('#auth-form').hidden = true;
  $('#auth-switch').replaceChildren();
  $('#auth-title').textContent = 'Conheça a Smartprotocol.';
  $('#auth-subtitle').textContent = 'Esta é uma apresentação visual. Login, cadastro e conexão com WhatsApp estão disponíveis na plataforma completa.';
  if (!$('#auth-dialog').open) $('#auth-dialog').showModal();
};
openChat = function () {
  document.querySelector('.ai-studio').scrollIntoView({behavior:'smooth', block:'center'});
};
$('#chat-launcher').hidden = true;
