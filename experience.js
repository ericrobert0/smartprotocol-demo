/* Progressive motion, accessible navigation and the interactive product preview. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const trigger = $('#solutions-trigger');
  const menu = $('#solutions-menu');
  let menuTimer, menuPinned = false;
  function setMenu(open, restoreFocus = false) {
    clearTimeout(menuTimer);
    trigger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    menu.inert = !open;
    if (!open) menuPinned = false;
    if (restoreFocus) trigger.focus();
  }
  function deferCloseMenu() { menuTimer = setTimeout(() => { if (!menu.matches(':hover') && !trigger.matches(':hover') && !menu.contains(document.activeElement) && document.activeElement !== trigger) setMenu(false); }, 180); }
  trigger.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') setMenu(true); });
  trigger.addEventListener('pointerleave', deferCloseMenu);
  menu.addEventListener('pointerenter', () => clearTimeout(menuTimer));
  menu.addEventListener('pointerleave', deferCloseMenu);
  trigger.addEventListener('click', () => { menuPinned = !menuPinned; setMenu(menuPinned); });
  trigger.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenu(true); $('a', menu).focus(); } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') { event.preventDefault(); setMenu(false, true); } });
  document.addEventListener('click', event => { if (event.target.closest('#solutions-menu a')) setMenu(false); else if (!menu.contains(event.target) && !trigger.contains(event.target)) setMenu(false); });
  document.addEventListener('focusin', event => { if (!menu.contains(event.target) && !trigger.contains(event.target)) setMenu(false); });

  const progress = document.createElement('div'); progress.className = 'scroll-progress'; progress.setAttribute('aria-hidden', 'true'); document.body.append(progress);
  const revealTargets = $$('.section-top,.service-card,.ai-studio>.eyebrow,.ai-studio>h2,.ai-studio>p,.studio-showcase,.platform-copy,.phone-stage,.about-story,.case-study,.cta');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } }), { threshold: .09, rootMargin: '0px 0px -25px 0px' });
  revealTargets.forEach(element => { element.classList.add('reveal'); observer.observe(element); });
  document.documentElement.classList.add('motion-ready');
  let scrollFrame;
  function updateScroll() {
    scrollFrame = null;
    const available = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0})`;
    if (!reducedMotion.matches) {
      const heroRect = $('.hero').getBoundingClientRect();
      if (heroRect.bottom > 0) $('.hero-art').style.setProperty('--hero-scroll',`${Math.min(scrollY,700) * -.08}px`);
    }
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', updateScroll); updateScroll();
  const hero = $('.hero'), heroArt = $('.hero-art');
  const heroVisibility = new IntersectionObserver(entries => hero.classList.toggle('hero-animating',entries[0].isIntersecting && !document.hidden));
  heroVisibility.observe(hero);
  document.addEventListener('visibilitychange',() => hero.classList.toggle('hero-animating',!document.hidden && hero.getBoundingClientRect().bottom > 0));
  heroArt.addEventListener('pointermove',event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    const rect = heroArt.getBoundingClientRect();
    heroArt.style.setProperty('--hero-tilt-y',`${((event.clientX - rect.left)/rect.width - .5)*7}deg`);
    heroArt.style.setProperty('--hero-tilt-x',`${-((event.clientY - rect.top)/rect.height - .5)*9}deg`);
  });
  heroArt.addEventListener('pointerleave',() => { heroArt.style.removeProperty('--hero-tilt-y'); heroArt.style.removeProperty('--hero-tilt-x'); });
  document.addEventListener('click', event => {
    const button = event.target.closest('.button,.phone-demo-button,.studio-prompts button');
    if (!button || button.disabled || reducedMotion.matches) return;
    const wave = document.createElement('span'); wave.className = 'click-wave'; wave.setAttribute('aria-hidden', 'true');
    const rect = button.getBoundingClientRect();
    wave.style.left = `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;
    wave.style.top = `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;
    button.append(wave); wave.addEventListener('animationend', () => wave.remove(), { once: true });
  });

  // Scripted visual previews: no input, network request or model invocation.
  const demoScenes = [
    { topic: 'WhatsApp', messages: ['Quero conectar o WhatsApp da minha empresa.', 'Vamos imaginar seu atendimento em um só lugar: conversas organizadas e uma equipe mais próxima dos clientes.', 'E se o cliente precisar de uma ajuda rápida?', 'O assistente pode orientar os primeiros passos e ajudar a encontrar o caminho certo. Tecnologia e pessoas trabalhando juntas.'] },
    { topic: 'Cloud', messages: ['Minha empresa está pronta para dar o próximo passo.', 'Boas ideias precisam de uma boa base. A nuvem pode reunir suas aplicações em uma infraestrutura pensada para o seu projeto.', 'E como eu acompanho tudo isso?', 'Imagine uma visão dos seus serviços na palma da mão. É essa experiência que estamos construindo no aplicativo Smartprotocol.'] },
    { topic: 'Integrações', messages: ['Meus sistemas precisam trabalhar juntos.', 'Quando as ferramentas se conectam, a operação ganha fluidez. Podemos começar entendendo o que sua equipe usa hoje.', 'Quero menos tarefas repetitivas no dia a dia.', 'Esse é um bom começo: mapear o processo, conectar as ferramentas e criar espaço para sua equipe se dedicar ao que importa.'] }
  ];
  function mountConversationDemo(root, compact = false) {
    const feed = $('.demo-conversation', root), pause = $('.demo-pause', root), replay = $('.demo-replay', root), timeline = $('.demo-timeline>span', root);
    const schedule = [[350,1750],[2550,5800],[6800,8350],[9250,13100]];
    const duration = 17000;
    let visible = false, paused = false, timer, started = 0, elapsed = 0, scene = -1, disposed = false;
    let lines = [];
    const typing = document.createElement('div'); typing.className = 'demo-typing'; typing.innerHTML = '<span>✧</span><i></i><i></i><i></i>'; typing.hidden = true;
    const totalTime = () => elapsed + (timer ? performance.now() - started : 0);
    function paint() {
      const time = totalTime();
      const nextScene = Math.floor(time / duration) % demoScenes.length;
      const position = reducedMotion.matches ? 14000 : time % duration;
      root.dataset.scene = String(nextScene); root.dataset.cycle = String(Math.floor(time / (duration * demoScenes.length)));
      if (nextScene !== scene) {
        scene = nextScene; lines = []; feed.replaceChildren(typing);
        if (!compact) $$('.demo-topics>span').forEach((item,index) => item.classList.toggle('active',index === scene));
      }
      demoScenes[scene].messages.forEach((message,index) => {
        const [start,end] = schedule[index];
        if (position < start) return;
        if (!lines[index]) {
          const line = document.createElement('div'); line.className = `demo-line ${index % 2 ? 'bot' : 'user'}`;
          line.innerHTML = `<span class="demo-avatar">${index % 2 ? '✧' : 'C'}</span><div class="demo-bubble"><small>${index % 2 ? 'Smart Assist' : 'Cliente'}</small><p></p></div>`;
          feed.insertBefore(line,typing); lines[index] = $('p',line);
        }
        const length = Math.max(1,Math.ceil(message.length * Math.min(1,(position - start)/(end - start))));
        const text = message.slice(0,length);
        if (lines[index].textContent !== text) { lines[index].textContent = text; feed.scrollTop = feed.scrollHeight; }
        lines[index].classList.toggle('is-typing',position < end);
      });
      typing.hidden = !schedule.some(([start],index) => index % 2 && position >= start - 650 && position < start);
      if (!typing.hidden) feed.scrollTop = feed.scrollHeight;
      if (timeline) timeline.style.transform = `scaleX(${position/duration})`;
      if (!compact) $$('.demo-step').forEach((element,index) => element.classList.toggle('active',index === (position < 2550 ? 0 : position < 9250 ? 1 : 2)));
    }
    function sync() {
      const play = visible && !paused && !document.hidden && !reducedMotion.matches && !disposed;
      if (play && !timer) { started = performance.now(); timer = setInterval(paint,70); }
      else if (!play && timer) { elapsed += performance.now() - started; clearInterval(timer); timer = undefined; }
      root.dataset.playing = String(play);
      if (pause) { pause.textContent = paused || reducedMotion.matches ? '▷' : 'Ⅱ'; pause.setAttribute('aria-pressed',String(paused || reducedMotion.matches)); pause.setAttribute('aria-label',`${paused ? 'Retomar' : 'Pausar'} ${compact ? 'prévia do assistente' : 'demonstração de IA'}`); pause.disabled = reducedMotion.matches; }
      paint();
    }
    const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:.12});
    visibilityObserver.observe(root);
    const toggle = () => { paused = !paused; sync(); };
    const restart = () => { elapsed = 0; started = performance.now(); scene = -1; paint(); };
    pause?.addEventListener('click',toggle); replay?.addEventListener('click',restart);
    document.addEventListener('visibilitychange',sync); reducedMotion.addEventListener('change',sync);
    paint();
    return () => { disposed = true; clearInterval(timer); visibilityObserver.disconnect(); document.removeEventListener('visibilitychange',sync); reducedMotion.removeEventListener('change',sync); pause?.removeEventListener('click',toggle); replay?.removeEventListener('click',restart); };
  }
  mountConversationDemo($('#studio-demo'));

  const phone = $('.phone');
  const body = $('.phone-body');
  const phoneContent = $('#phone-content');
  let phoneTab = 'overview', phoneScreen = 'overview', locked = false, cloudRunning = true, demoConnected = false, phoneFrame, pointerPosition, disposePhoneDemo;
  const quickStates = { wifi: true, notifications: true, night: true };
  $('.phone-status').innerHTML = '<button class="phone-clock" aria-label="Abrir central do celular" aria-expanded="false" aria-controls="phone-shade"></button><span class="phone-status-icons" aria-hidden="true">▮▮▮ ◔ ▰</span>';
  $('.phone-brand .avatar').outerHTML = '<button class="avatar" data-device-action="profile" aria-label="Abrir perfil de demonstração">SP</button>';
  const appbar = document.createElement('div'); appbar.className = 'phone-appbar'; appbar.append($('.phone-brand')); phone.append(appbar);
  $('.phone-home').outerHTML = '<button class="phone-home" aria-label="Voltar ao início do celular"></button>';
  $('.phone-nav').innerHTML = '<button data-phone="overview" aria-label="Visão geral"><span>◫</span><small>Início</small></button><button data-phone="connections" aria-label="Conexões"><span>⌘</span><small>Conexões</small></button><button data-phone="assistant" aria-label="Assistente"><span>✧</span><small>Assistente</small></button>';
  const power = document.createElement('button'); power.className = 'phone-power'; power.setAttribute('aria-label', 'Bloquear celular'); phone.append(power);
  const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  function updateClock() {
    const now = new Date(); const time = timeFormat.format(now);
    $$('.phone-clock,.device-clock', phone).forEach(element => { if (element.textContent !== time) element.textContent = time; });
    $$('.device-date', phone).forEach(element => element.textContent = dateFormat.format(now));
  }
  updateClock(); setInterval(updateClock, 1000);
  function closeShade() { $('#phone-shade')?.remove(); $('.phone-clock').setAttribute('aria-expanded', 'false'); }
  function renderShade() {
    closeShade(); if (locked) return;
    const shade = document.createElement('section'); shade.id = 'phone-shade'; shade.className = 'device-shade'; shade.setAttribute('aria-label', 'Central do celular');
    shade.innerHTML = `<button class="shade-close" data-device-action="close-shade" aria-label="Fechar central">×</button><div class="shade-date device-date"></div><div class="shade-time device-clock"></div><div class="shade-toggles">${[['wifi','◉','Wi-Fi'],['notifications','♧','Avisos'],['night','☾','Modo foco']].map(([key,icon,label]) => `<button data-quick-toggle="${key}" aria-label="${label} na demonstração" aria-pressed="${quickStates[key]}">${icon}<small>${label}</small></button>`).join('')}</div><div class="shade-notification"><strong>✧ Bem-vindo ao Smartprotocol</strong>Explore os serviços, navegue pelas conexões e converse com o assistente.<br><br>Os controles desta central são uma demonstração do futuro aplicativo.</div>`;
    phone.append(shade); $('.phone-clock').setAttribute('aria-expanded', 'true'); updateClock();
  }
  $('.phone-clock').addEventListener('click', () => $('#phone-shade') ? closeShade() : renderShade());
  function setLocked(value) {
    locked = value; closeShade(); $('.device-lock')?.remove(); phone.classList.toggle('locked', value);
    body.inert = value; $('.phone-nav').inert = value; $('.phone-home').inert = value;
    power.setAttribute('aria-label', value ? 'Desbloquear celular' : 'Bloquear celular');
    if (value) {
      const lock = document.createElement('section'); lock.className = 'device-lock'; lock.setAttribute('aria-label', 'Celular bloqueado');
      lock.innerHTML = '<span class="phone-lock-icon">▢</span><div class="shade-date device-date"></div><div class="shade-time device-clock"></div><button class="phone-demo-button" data-device-action="unlock">Toque para desbloquear</button><p class="phone-chat-hint">Smartprotocol · Prévia interativa</p>';
      phone.append(lock); updateClock();
    }
  }
  power.addEventListener('click', () => setLocked(!locked));
  $('.phone-home').addEventListener('click', () => { closeShade(); renderPhone('overview'); });
  function row(icon, name, status, action) { return `<button class="phone-row" data-device-action="${action}"><span>${icon}</span><span>${name}</span><b>${status}</b></button>`; }
  function paintPhone(html, screen) {
    disposePhoneDemo?.(); disposePhoneDemo = undefined;
    phoneScreen = screen;
    phoneContent.innerHTML = html; body.scrollTop = 0;
    if (!reducedMotion.matches) phoneContent.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (screen === 'assistant') disposePhoneDemo = mountConversationDemo($('#phone-assist-demo'),true);
  }
  function paintAssistant() {
    paintPhone('<p class="phone-greeting">INTELIGÊNCIA QUE APROXIMA</p><h3 class="phone-heading">Conheça o Smart Assist.</h3><div id="phone-assist-demo" class="phone-assist-demo" aria-label="Prévia visual do assistente"><div class="phone-assist-header"><span>✧</span><div>Smart Assist<small>Conversa de demonstração</small></div></div><div class="demo-conversation" aria-hidden="true"></div><div class="demo-playback"><span class="demo-caption">Simulação em looping</span><button class="demo-pause" aria-label="Pausar prévia do assistente">Ⅱ</button><button class="demo-replay" aria-label="Reiniciar prévia do assistente">↻</button></div><div class="demo-timeline" aria-hidden="true"><span></span></div></div><p class="phone-chat-hint">Uma conversa ilustrativa do futuro aplicativo. Nenhuma mensagem é enviada.</p>', 'assistant');
  }
  renderPhone = function renderInteractivePhone(tab) {
    if (!['overview','connections','assistant'].includes(tab)) return;
    if (locked) setLocked(false);
    closeShade(); phoneTab = tab;
    $$('.phone-tabs [data-phone]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.phone === tab)); button.tabIndex = button.dataset.phone === tab ? 0 : -1; });
    $$('.phone-nav [data-phone]').forEach(button => { button.classList.toggle('active', button.dataset.phone === tab); if (button.dataset.phone === tab) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
    if (tab === 'overview') {
      paintPhone(`<div class="app-greeting"><div><p class="phone-greeting">${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, visitante.</p><h3 class="phone-heading">Seu negócio,<br>conectado.</h3></div><span class="app-demo-chip">PRÉVIA</span></div><button class="app-cloud-card" data-device-action="cloud" aria-label="Explorar infraestrutura na demonstração"><span class="app-card-top"><span>☁ SMART CLOUD</span><span class="app-cloud-state">${cloudRunning ? 'Demo ativa' : 'Pausada'}</span></span><strong>Uma base.<br>Novas possibilidades.</strong><svg class="app-line-chart" viewBox="0 0 240 65" aria-hidden="true"><defs><linearGradient id="app-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b99aff" stop-opacity=".35"/><stop offset="1" stop-color="#b99aff" stop-opacity="0"/></linearGradient></defs><path class="chart-area" d="M0 55C20 55 16 32 36 40S59 61 76 32S106 48 122 24S150 49 170 19S200 32 220 9L240 4V65H0Z"/><path class="chart-line" d="M0 55C20 55 16 32 36 40S59 61 76 32S106 48 122 24S150 49 170 19S200 32 220 9L240 4"/></svg><span class="app-chart-caption">Atividade ilustrativa <span>Últimas 24h</span></span></button><div class="app-mini-grid"><button data-device-action="connections"><span>⌘</span><strong>Conexões</strong><small>Seu ecossistema</small></button><button data-device-action="assistant"><span>✧</span><strong>Smart Assist</strong><small>Veja a prévia</small></button></div><h4 class="phone-subheading">Acesso rápido</h4>${row('☁','Infraestrutura',cloudRunning ? 'Demo ativa' : 'Pausada','cloud')}${row('◉','WhatsApp','Explorar','whatsapp')}${row('⌘','Integrações','Conhecer','integrations')}<span class="phone-demo-label">UMA OPERAÇÃO MAIS PRÓXIMA</span><div class="phone-activity"><span>☁</span><div>Infraestrutura para novas ideias.<small>Explore os detalhes do seu ambiente.</small></div></div><div class="phone-activity"><span>✧</span><div>Uma experiência que vai com você.<small>Smartprotocol App · em desenvolvimento</small></div></div><p class="phone-chat-hint">Dados ilustrativos. Toque nos serviços e explore a prévia.</p><button class="phone-demo-button" data-device-action="profile">Explorar meu perfil</button>`, 'overview');
    } else if (tab === 'connections') {
      paintPhone(`<p class="phone-greeting">TECNOLOGIA QUE TRABALHA JUNTO</p><h3 class="phone-heading">Seu ecossistema.</h3><p class="phone-chat-hint">Uma visão das suas conexões.<br>Este é um cenário de demonstração.</p><button class="app-connection" data-device-action="whatsapp"><span class="app-connection-icon whatsapp">◉</span><div><strong>WhatsApp</strong><small>Atendimento da empresa</small><b>${demoConnected ? 'Demo conectada' : 'Explorar conexão'}</b></div><span>›</span></button><button class="app-connection" data-device-action="cloud"><span class="app-connection-icon">☁</span><div><strong>Smart Cloud</strong><small>Infraestrutura do projeto</small><b>${cloudRunning ? 'Demo ativa' : 'Demo pausada'}</b></div><span>›</span></button><button class="app-connection" data-device-action="integrations"><span class="app-connection-icon">⌘</span><div><strong>Integrações</strong><small>Sistemas em sintonia</small><b>Conhecer possibilidades</b></div><span>›</span></button><div class="phone-notice">Toque em uma conexão para explorar os controles da prévia.</div><button class="phone-demo-button" data-auth="register">Conhecer a plataforma</button>`, 'connections');
    } else paintAssistant();
  };
  function detail(kind) {
    const back = '<button class="phone-back" data-device-action="back">‹ Voltar</button>';
    if (kind === 'cloud') paintPhone(`${back}<div class="phone-detail"><div class="phone-detail-icon">☁</div><span class="phone-demo-label">SMART CLOUD · DEMONSTRAÇÃO</span><h3>Espaço para suas ideias.</h3><p>Explore como será acompanhar uma aplicação na infraestrutura Smartprotocol.</p><div class="phone-detail-stat"><span>Ambiente</span><b>Demonstração</b></div><div class="phone-detail-stat"><span>Status da prévia</span><b>${cloudRunning ? 'Em execução' : 'Pausado'}</b></div><div class="phone-detail-stat"><span>Tipo de serviço</span><b>Cloud</b></div><button class="phone-demo-button" data-device-action="toggle-cloud">${cloudRunning ? 'Pausar demonstração' : 'Retomar demonstração'}</button><p class="phone-chat-hint">Este controle altera apenas a prévia do celular.</p><button class="phone-demo-button secondary" data-device-action="assistant">Conversar sobre infraestrutura</button></div>`, 'cloud');
    else if (kind === 'whatsapp') paintPhone(`${back}<div class="phone-detail"><div class="phone-detail-icon">◉</div><span class="phone-demo-label">WHATSAPP · DEMONSTRAÇÃO</span><h3>Mais perto do cliente.</h3><p>Experimente o fluxo do aplicativo. Uma conexão real será realizada pelo workspace com a Evolution API.</p><div class="phone-detail-stat"><span>Conexão da prévia</span><b>${demoConnected ? 'Demo conectada' : 'Desconectada'}</b></div><button class="phone-demo-button" data-device-action="toggle-connection">${demoConnected ? 'Desconectar demonstração' : 'Simular conexão'}</button><div class="phone-notice">${demoConnected ? '✓ Conexão simulada. Nenhum número real foi conectado.' : 'Nenhum QR Code ou número real é usado nesta demonstração.'}</div><button class="phone-demo-button secondary" data-auth="login">Acessar conexões reais</button></div>`, 'whatsapp');
    else if (kind === 'integrations') paintPhone(`${back}<div class="phone-detail"><div class="phone-detail-icon">⌘</div><span class="phone-demo-label">INTEGRAÇÕES · PRÉVIA</span><h3>Peças que se conectam.</h3><p>Imagine seus sistemas trabalhando juntos. Conte quais ferramentas sua empresa usa e explore os caminhos com o assistente.</p>${row('☁','Infraestrutura','Cloud','cloud')}${row('◉','WhatsApp','API','whatsapp')}${row('✧','Seu projeto','Conversar','assistant')}<button class="phone-demo-button" data-device-action="assistant">Pensar minha integração</button></div>`, 'integrations');
    else paintPhone(`${back}<div class="phone-detail"><div class="phone-detail-icon">◫</div><span class="phone-demo-label">PERFIL DE DEMONSTRAÇÃO</span><h3>Seu espaço, seu ritmo.</h3><p>Você está explorando a prévia interativa do futuro aplicativo Smartprotocol.</p><div class="phone-detail-stat"><span>Acesso</span><b>Visitante</b></div><div class="phone-detail-stat"><span>Dados</span><b>Demonstração</b></div><button class="phone-demo-button" data-auth="register">Criar minha conta real</button><button class="phone-demo-button secondary" data-device-action="open-shade">Abrir central do celular</button><p class="phone-chat-hint">Dica: o relógio acompanha o horário do seu dispositivo. Toque nele para abrir a central.</p></div>`, 'profile');
  }
  phone.addEventListener('click', event => {
    const toggle = event.target.closest('[data-quick-toggle]');
    if (toggle) { const key = toggle.dataset.quickToggle; quickStates[key] = !quickStates[key]; toggle.setAttribute('aria-pressed', String(quickStates[key])); return; }
    const action = event.target.closest('[data-device-action]')?.dataset.deviceAction;
    if (!action) return;
    if (action === 'unlock') setLocked(false);
    else if (action === 'close-shade') { closeShade(); $('.phone-clock').focus(); }
    else if (action === 'open-shade') renderShade();
    else if (action === 'back') renderPhone(phoneTab);
    else if (action === 'connections' || action === 'assistant') renderPhone(action);
    else if (action === 'toggle-cloud') { cloudRunning = !cloudRunning; detail('cloud'); }
    else if (action === 'toggle-connection') { demoConnected = !demoConnected; detail('whatsapp'); }
    else detail(action);
  });
  phone.addEventListener('keydown', event => { if (event.key === 'Escape') { closeShade(); setLocked(false); } });
  $('.phone-tabs').addEventListener('keydown', event => {
    const tabs = $$('.phone-tabs [data-phone]'); const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let next = index;
    if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
    else if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return;
    event.preventDefault(); renderPhone(tabs[next].dataset.phone); tabs[next].focus();
  });
  function updateTilt() {
    phoneFrame = null; if (!pointerPosition || reducedMotion.matches) return;
    const rect = phone.getBoundingClientRect();
    const x = (pointerPosition.x - rect.left) / rect.width - .5;
    const y = (pointerPosition.y - rect.top) / rect.height - .5;
    phone.style.setProperty('--phone-y', `${x * 9}deg`); phone.style.setProperty('--phone-x', `${-y * 7}deg`);
  }
  phone.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' || reducedMotion.matches) return; phone.classList.add('is-tracking'); pointerPosition = { x: event.clientX, y: event.clientY }; if (!phoneFrame) phoneFrame = requestAnimationFrame(updateTilt); });
  phone.addEventListener('pointerleave', () => { pointerPosition = null; if (phoneFrame) cancelAnimationFrame(phoneFrame); phoneFrame = null; phone.classList.remove('is-tracking'); phone.style.removeProperty('--phone-x'); phone.style.removeProperty('--phone-y'); });
  renderPhone('overview');
})();
