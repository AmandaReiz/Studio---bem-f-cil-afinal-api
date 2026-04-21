const STORAGE_KEYS = {
    videos: 'studio-pro-videos',
    metas: 'studio-pro-metas',
    theme: 'studio-theme'
};

const DEFAULT_METAS = {
    id: 'config_metas',
    periodo: 'Mensal',
    views: 0,
    inscritos: 0,
    receita: 0,
    metaViews: 100000,
    metaInsc: 1000,
    metaRec: 500
};

const CANAIS = [
    { id: 'bem-facil', nome: 'É bem fácil, afinal' },
    { id: 'codigo', nome: 'Código da Inteligência' },
    { id: 'amanda-reis', nome: 'Amanda Reis' },
    { id: 'simplificando-vida', nome: 'Simplificando a vida' }
];

const uiState = {
    canal: 'all',
    status: 'all',
    dificuldade: 'all',
    search: '',
    sort: 'date_desc',
    view: 'active',
    favoritesOnly: false
};

const PLACEHOLDER_THUMB =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#1f1f24" />
                    <stop offset="100%" stop-color="#101014" />
                </linearGradient>
            </defs>
            <rect width="800" height="450" fill="url(#g)"/>
            <circle cx="670" cy="90" r="80" fill="rgba(255,159,28,0.18)"/>
            <circle cx="130" cy="360" r="120" fill="rgba(50,215,75,0.10)"/>
            <text x="50%" y="47%" text-anchor="middle" fill="#ffffff" font-size="34" font-family="Helvetica, Arial, sans-serif" opacity="0.92">
                Thumbnail ainda não enviada
            </text>
            <text x="50%" y="58%" text-anchor="middle" fill="#ff9f1c" font-size="18" font-family="Helvetica, Arial, sans-serif" opacity="0.95">
                Studio Pro
            </text>
        </svg>
    `);

let idVideoAtivo = null;
let idVideoParaTrocaThumb = null;
window.listaVideosAtual = [];

function gerarId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `video-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerStorage(chave, fallback) {
    try {
        const raw = localStorage.getItem(chave);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Erro ao ler ${chave}:`, error);
        return fallback;
    }
}

function salvarStorage(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

function ordenarVideos(videos) {
    return [...videos].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function getVideos() {
    const videos = lerStorage(STORAGE_KEYS.videos, []);
    return Array.isArray(videos) ? ordenarVideos(videos) : [];
}

function saveVideos(videos) {
    salvarStorage(STORAGE_KEYS.videos, ordenarVideos(videos));
}

function normalizarMetasPorCanal(metasSalvas) {
    const metasNormalizadas = {};
    CANAIS.forEach((canal) => {
        metasNormalizadas[canal.id] = {
            ...DEFAULT_METAS,
            canal: canal.id,
            ...(metasSalvas?.[canal.id] || {})
        };
    });
    return metasNormalizadas;
}

function getMetas() {
    const metas = lerStorage(STORAGE_KEYS.metas, null);
    if (!metas) {
        const iniciais = normalizarMetasPorCanal({});
        saveMetas(iniciais);
        return iniciais;
    }

    if ('metaViews' in metas || 'views' in metas) {
        const migradas = normalizarMetasPorCanal({ 'bem-facil': metas });
        saveMetas(migradas);
        return migradas;
    }

    const normalizadas = normalizarMetasPorCanal(metas);
    saveMetas(normalizadas);
    return normalizadas;
}

function saveMetas(metas) {
    salvarStorage(STORAGE_KEYS.metas, normalizarMetasPorCanal(metas));
}

function getCanalMetasSelecionado() {
    return document.getElementById('metas-canal')?.value || 'bem-facil';
}

function getMetaDoCanal(canalId = getCanalMetasSelecionado()) {
    const metas = getMetas();
    return { ...DEFAULT_METAS, canal: canalId, ...(metas[canalId] || {}) };
}

function getNomeCanal(canalData) {
    if (canalData === 'codigo') return 'Código da Inteligência';
    if (canalData === 'amanda-reis') return 'Amanda Reis';
    if (canalData === 'simplificando-vida') return 'Simplificando a vida';
    return 'É bem fácil, afinal';
}

function parseViews(value) {
    const limpo = String(value ?? '0').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    return Number.parseFloat(limpo) || 0;
}

function getBestScore(video) {
    return (Number(video.ctr) || 0) * 3 + (Number(video.avd) || 0) * 2 + parseViews(video.views) * 0.01 + (video.favorito ? 500 : 0);
}

function getBaseVideos() {
    const todos = getVideos();
    return todos.filter((video) => (uiState.view === 'trash' ? Boolean(video.deletedAt) : !video.deletedAt));
}

function aplicarFiltros(videos) {
    return videos.filter((video) => {
        const partes = video.tema && video.tema.includes('|') ? video.tema.split('|') : ['bem-facil', video.tema || 'Geral'];
        const canal = partes[0];
        const tema = partes[1] || '';
        const termo = uiState.search.trim().toLowerCase();

        if (uiState.canal !== 'all' && canal !== uiState.canal) return false;
        if (uiState.status !== 'all' && video.status !== uiState.status) return false;
        if (uiState.dificuldade !== 'all' && video.dificuldade !== uiState.dificuldade) return false;
        if (uiState.favoritesOnly && !video.favorito) return false;

        if (termo) {
            const titulo = String(video.titulo || '').toLowerCase();
            const temaTexto = String(tema).toLowerCase();
            if (!titulo.includes(termo) && !temaTexto.includes(termo)) return false;
        }

        return true;
    });
}

function aplicarOrdenacao(videos) {
    const ordenados = [...videos];
    switch (uiState.sort) {
        case 'ctr_desc':
            ordenados.sort((a, b) => (Number(b.ctr) || 0) - (Number(a.ctr) || 0));
            break;
        case 'avd_desc':
            ordenados.sort((a, b) => (Number(b.avd) || 0) - (Number(a.avd) || 0));
            break;
        case 'views_desc':
            ordenados.sort((a, b) => parseViews(b.views) - parseViews(a.views));
            break;
        case 'favorites_desc':
            ordenados.sort((a, b) => Number(b.favorito) - Number(a.favorito) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        case 'best_desc':
            ordenados.sort((a, b) => getBestScore(b) - getBestScore(a));
            break;
        case 'date_desc':
        default:
            ordenados.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
    }
    return ordenados;
}

function getVisibleVideos() {
    return aplicarOrdenacao(aplicarFiltros(getBaseVideos()));
}

function atualizarListaAtual(videos = getVisibleVideos()) {
    window.listaVideosAtual = [...videos];
    return window.listaVideosAtual;
}

function atualizarResumoBarra() {
    const status = document.getElementById('grid-status');
    const partes = [];

    if (uiState.view === 'trash') partes.push('Lixeira');
    if (uiState.canal !== 'all') partes.push(getNomeCanal(uiState.canal));
    if (uiState.status !== 'all') partes.push(uiState.status);
    if (uiState.dificuldade !== 'all') partes.push(uiState.dificuldade);
    if (uiState.favoritesOnly) partes.push('Favoritos');
    if (uiState.search) partes.push(`Busca: "${uiState.search}"`);

    status.textContent = partes.length ? partes.join(' • ') : 'Visão geral';
}

function resetarFiltros() {
    uiState.canal = 'all';
    uiState.status = 'all';
    uiState.dificuldade = 'all';
    uiState.search = '';
    uiState.sort = 'date_desc';
    uiState.view = 'active';
    uiState.favoritesOnly = false;

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'date_desc';

    carregarVideos();
}

function atualizarBusca(valor) {
    uiState.search = valor;
    carregarVideos();
}

function atualizarOrdenacao(valor) {
    uiState.sort = valor || 'date_desc';
    carregarVideos();
}

function filtrarCanal(canalAlvo) {
    uiState.view = 'active';
    uiState.canal = canalAlvo;
    uiState.favoritesOnly = false;
    carregarVideos();
}

function filtrarStatus(status) {
    uiState.view = 'active';
    uiState.status = status || 'all';
    uiState.favoritesOnly = false;
    carregarVideos();
}

function filtrarDificuldade(dif) {
    uiState.view = 'active';
    uiState.dificuldade = dif;
    uiState.favoritesOnly = false;
    carregarVideos();
    toggleMenu();
}

function carregarSucessos() {
    uiState.view = 'active';
    uiState.favoritesOnly = true;
    uiState.sort = 'favorites_desc';
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'favorites_desc';
    carregarVideos();
}

function mostrarLixeira() {
    uiState.view = 'trash';
    uiState.favoritesOnly = false;
    carregarVideos();
}

function mostrarAtivos() {
    uiState.view = 'active';
    carregarVideos();
}

function renderizarMetasPorCanal(canalId = getCanalMetasSelecionado()) {
    const m = getMetaDoCanal(canalId);

    document.getElementById('m-views').value = m.views || 0;
    document.getElementById('m-insc').value = m.inscritos || 0;
    document.getElementById('m-rec').value = m.receita || 0;
    document.getElementById('mt-views').value = m.metaViews || 1;
    document.getElementById('mt-insc').value = m.metaInsc || 1;
    document.getElementById('mt-rec').value = m.metaRec || 1;

    const grid = document.querySelector('.metas-grid');
    const categorias = [
        { label: 'Visualizações', atual: m.views || 0, meta: m.metaViews || 1, cor: '#32d74b' },
        { label: 'Inscritos', atual: m.inscritos || 0, meta: m.metaInsc || 1, cor: '#ff9f0a' },
        { label: 'Receita (R$)', atual: m.receita || 0, meta: m.metaRec || 1, cor: '#5e5ce6' }
    ];

    grid.innerHTML = categorias
        .map((c) => {
            const porc = Math.min((c.atual / Math.max(c.meta, 1)) * 100, 100).toFixed(1);
            return `
                <div class="meta-card">
                    <span class="meta-label">${c.label}</span>
                    <h2 class="meta-percent">${porc}%</h2>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${porc}%; background: ${c.cor}"></div>
                    </div>
                    <div class="meta-footer">
                        <span>${Number(c.atual).toLocaleString('pt-BR')}</span>
                        <span>Alvo: ${Number(c.meta).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            `;
        })
        .join('');
}

function trocarCanalMetas() {
    renderizarMetasPorCanal();
}

function converterThumb(input) {
    const file = input.files[0];
    const label = document.getElementById('label-thumb');
    const text = document.getElementById('text-thumb');
    if (file) {
        text.innerText = '⏳ Carregando...';
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('thumbnail-b64').value = e.target.result;
            text.innerText = '✅ Imagem pronta!';
            label.style.borderColor = '#32d74b';
        };
        reader.readAsDataURL(file);
    }
}

function toggleMenu() {
    document.getElementById('dropdown-menu').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.menu-dots-btn')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (let i = 0; i < dropdowns.length; i += 1) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
};

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.theme, newTheme);
}

function carregarVideos() {
    const videos = atualizarListaAtual(getVisibleVideos());
    atualizarResumoBarra();
    renderizarCards(videos);
}

function renderizarCards(videos) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';

    if (!videos || videos.length === 0) {
        document.getElementById('video-count').innerText = uiState.view === 'trash' ? '0 itens na lixeira' : '0 vídeos';
        calcularResumo([]);
        grid.innerHTML = `
            <div class="empty-state">
                <h3>${uiState.view === 'trash' ? 'Lixeira vazia' : 'Nenhum card encontrado'}</h3>
                <p>${uiState.view === 'trash' ? 'Quando você mover um card para a lixeira, ele aparece aqui.' : 'Tente mudar a busca, a ordenação ou os filtros.'}</p>
            </div>
        `;
        return;
    }

    document.getElementById('video-count').innerText = uiState.view === 'trash' ? `${videos.length} na lixeira` : `${videos.length} vídeos`;
    calcularResumo(videos);

    videos.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'card animate-pop';
        const ctrClass = Number(v.ctr) < 5 ? 'm-low' : 'm-high';
        const avdClass = Number(v.avd) < 40 ? 'm-low' : 'm-high';
        const partes = v.tema && v.tema.includes('|') ? v.tema.split('|') : ['bem-facil', v.tema || 'Geral'];
        const canalData = partes[0];
        const temaExibicao = partes[1] || 'Geral';
        const nomeCanal = getNomeCanal(canalData);

        card.innerHTML = `
            <div class="thumb-container" onclick="prepararTrocaThumb('${v.id}')" style="cursor:pointer; position:relative; overflow:hidden; border-radius:15px; margin-bottom:15px;">
                <img src="${v.thumbnail || PLACEHOLDER_THUMB}" style="width:100%; height:150px; object-fit:cover; border: 1px solid rgba(255,255,255,0.1)">
                <div class="thumb-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;">
                    <span style="color:#fff; font-size:12px; font-weight:bold;">📷 TROCAR FOTO</span>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:start; gap:12px;">
                <div style="flex:1;">
                    <div class="title-inline-wrap">
                        <input
                            id="titulo-${v.id}"
                            class="card-title-inline"
                            type="text"
                            value="${(v.titulo || '').replace(/"/g, '&quot;')}"
                            onclick="this.select()"
                            onblur="salvarTituloInline('${v.id}', this.value)"
                            onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.blur(); }"
                        >
                    </div>
                    <span class="canal-tag" style="font-size: 10px; color: var(--accent); font-weight: bold; text-transform: uppercase;">${nomeCanal}</span>
                </div>
                <span onclick="toggleFav('${v.id}', ${v.favorito})" style="cursor:pointer; font-size:22px; color:${v.favorito ? '#ffd60a' : '#333'}">★</span>
            </div>
            <p style="color:#8e8e93; font-size:12px; margin: 5px 0 15px 0;">${temaExibicao}</p>
            <div style="display:flex; gap:10px; margin-bottom:15px">
                <select onchange="atualizarTagDireto('${v.id}', 'status', this.value)" style="background:#000; color:#fff; border:1px solid rgba(255,255,255,0.12); border-radius:5px; font-size:10px; padding:3px; cursor:pointer">
                    <option value="Ideia" ${v.status === 'Ideia' ? 'selected' : ''}>🔴 Ideia</option>
                    <option value="Roteirizando" ${v.status === 'Roteirizando' ? 'selected' : ''}>🟡 Editando</option>
                    <option value="Postado" ${v.status === 'Postado' ? 'selected' : ''}>🟢 Postado</option>
                </select>
                <select onchange="atualizarTagDireto('${v.id}', 'dificuldade', this.value)" style="background:#000; color:#fff; border:1px solid rgba(255,255,255,0.12); border-radius:5px; font-size:10px; padding:3px; cursor:pointer">
                    <option value="Rápido" ${v.dificuldade === 'Rápido' ? 'selected' : ''}>⚡ Rápido</option>
                    <option value="Médio" ${v.dificuldade === 'Médio' ? 'selected' : ''}>🛠️ Médio</option>
                    <option value="Complexo" ${v.dificuldade === 'Complexo' ? 'selected' : ''}>🧠 Complexo</option>
                </select>
            </div>
            <div class="card-metrics-modern">
                <div class="metric-panel ${ctrClass}">
                    <span class="metric-label">CTR</span>
                    <strong class="metric-value">${v.ctr || 0}%</strong>
                </div>
                <div class="metric-panel ${avdClass}">
                    <span class="metric-label">AVD</span>
                    <strong class="metric-value">${v.avd || 0}%</strong>
                </div>
                <div class="metric-panel metric-panel-neutral">
                    <span class="metric-label">Views</span>
                    <strong class="metric-value">${v.views || 0}</strong>
                </div>
            </div>
            <div class="metrics-edit">
                <input type="text" id="v-${v.id}" placeholder="Views">
                <input type="number" id="c-${v.id}" placeholder="CTR %">
                <input type="number" id="a-${v.id}" placeholder="AVD %">
                <button onclick="update('${v.id}')" style="background:var(--accent); color:#000; border:none; border-radius:6px; padding:0 10px; cursor:pointer; font-weight:bold">OK</button>
            </div>
            <div class="card-actions-modern">
                <button class="btn-action" onclick="abrirRoteiroPeloId('${v.id}')">📜 Roteiro</button>
                <div class="link-inline-wrap">
                    <span class="link-inline-icon">↗</span>
                    <input
                        id="link-${v.id}"
                        class="card-link-inline"
                        type="text"
                        value="${(v.link || '').replace(/"/g, '&quot;')}"
                        placeholder="Cole o link do vídeo"
                        onblur="salvarLinkInline('${v.id}', this.value)"
                        onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.blur(); }"
                    >
                </div>
                ${v.link ? `<button class="btn-play" onclick="window.open('${v.link}', '_blank')">▶ Play</button>` : ''}
            </div>
            ${
                uiState.view === 'trash'
                    ? `
                    <div class="trash-actions">
                        <button class="btn-action" onclick="restaurarDaLixeira('${v.id}')">Restaurar</button>
                        <button class="btn-trash-permanent" onclick="excluirPermanente('${v.id}')">Excluir permanente</button>
                    </div>
                `
                    : `<button onclick="moverParaLixeira('${v.id}')" class="btn-trash-soft">Mover para lixeira</button>`
            }
        `;
        grid.appendChild(card);
    });
}

async function salvarTituloInline(id, valor) {
    const tituloTratado = (valor || '').trim();
    if (!tituloTratado) {
        carregarVideos();
        return;
    }

    const video = getVideos().find((item) => item.id === id);
    if (!video || video.titulo === tituloTratado) return;

    await atualizarVideo(id, { titulo: tituloTratado });
    carregarVideos();
}

async function salvarLinkInline(id, valor) {
    const linkTratado = (valor || '').trim();
    const video = getVideos().find((item) => item.id === id);
    if (!video) return;
    if ((video.link || '') === linkTratado) return;

    await atualizarVideo(id, { link: linkTratado });
    carregarVideos();
}

function prepararTrocaThumb(id) {
    idVideoParaTrocaThumb = id;
    document.getElementById('update-thumb-input').click();
}

document.getElementById('update-thumb-input')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (file && idVideoParaTrocaThumb) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            await atualizarTagDireto(idVideoParaTrocaThumb, 'thumbnail', base64);
            idVideoParaTrocaThumb = null;
            this.value = '';
        };
        reader.readAsDataURL(file);
    }
});

function abrirRoteiroPeloId(id) {
    const video = window.listaVideosAtual.find((v) => v.id === id);
    if (video) {
        idVideoAtivo = id;
        document.getElementById('roteiro-titulo').innerText = video.titulo;
        document.getElementById('roteiro-editavel').value = video.roteiro || '';
        document.getElementById('overlay-roteiro').style.display = 'flex';
    }
}

function fecharRoteiro() {
    document.getElementById('overlay-roteiro').style.display = 'none';
}

async function salvarAlteracaoRoteiro() {
    const novoTexto = document.getElementById('roteiro-editavel').value;
    if (!idVideoAtivo) return;
    await atualizarTagDireto(idVideoAtivo, 'roteiro', novoTexto, false);
    fecharRoteiro();
    carregarVideos();
}

async function abrirMetas() {
    document.getElementById('overlay-metas').style.display = 'flex';
    const selectCanal = document.getElementById('metas-canal');
    if (selectCanal && !selectCanal.value) {
        selectCanal.value = 'bem-facil';
    }
    renderizarMetasPorCanal(selectCanal?.value || 'bem-facil');
}

function fecharMetas() {
    document.getElementById('overlay-metas').style.display = 'none';
}

async function salvarMetas() {
    const canalSelecionado = getCanalMetasSelecionado();
    const dados = {
        views: parseInt(document.getElementById('m-views').value, 10) || 0,
        inscritos: parseInt(document.getElementById('m-insc').value, 10) || 0,
        receita: parseFloat(document.getElementById('m-rec').value) || 0,
        metaViews: parseInt(document.getElementById('mt-views').value, 10) || 0,
        metaInsc: parseInt(document.getElementById('mt-insc').value, 10) || 0,
        metaRec: parseFloat(document.getElementById('mt-rec').value) || 0
    };

    const metasAtuais = getMetas();
    metasAtuais[canalSelecionado] = {
        ...getMetaDoCanal(canalSelecionado),
        ...dados,
        canal: canalSelecionado
    };
    saveMetas(metasAtuais);
    renderizarMetasPorCanal(canalSelecionado);
}

async function salvarVideo() {
    const canal = document.getElementById('canal-origem').value;
    const temaReal = document.getElementById('tema').value;

    const body = {
        id: gerarId(),
        titulo: document.getElementById('titulo').value.trim(),
        tema: `${canal}|${temaReal}`,
        link: document.getElementById('link').value.trim(),
        thumbnail: document.getElementById('thumbnail-b64').value,
        status: document.getElementById('status-default').value,
        dificuldade: document.getElementById('dificuldade-default').value,
        roteiro: document.getElementById('roteiro').value,
        ctr: 0,
        avd: 0,
        views: '0',
        favorito: false,
        deletedAt: null,
        createdAt: new Date().toISOString()
    };

    if (!body.titulo) return;

    const videos = getVideos();
    videos.push(body);
    saveVideos(videos);
    limparCampos();
    carregarVideos();
}

async function update(id) {
    const views = document.getElementById(`v-${id}`).value;
    const ctr = document.getElementById(`c-${id}`).value;
    const avd = document.getElementById(`a-${id}`).value;

    const dados = {};
    if (views !== '') dados.views = String(parseInt(views, 10) || 0);
    if (ctr !== '') dados.ctr = parseFloat(ctr) || 0;
    if (avd !== '') dados.avd = parseFloat(avd) || 0;

    await atualizarVideo(id, dados);
    carregarVideos();
}

async function moverParaLixeira(id) {
    await atualizarVideo(id, { deletedAt: new Date().toISOString() });
    carregarVideos();
}

async function restaurarDaLixeira(id) {
    await atualizarVideo(id, { deletedAt: null });
    carregarVideos();
}

async function excluirPermanente(id) {
    const videos = getVideos().filter((video) => video.id !== id);
    saveVideos(videos);
    carregarVideos();
}

async function atualizarVideo(id, dados) {
    const videos = getVideos();
    const index = videos.findIndex((video) => video.id === id);
    if (index === -1) return null;

    videos[index] = { ...videos[index], ...dados };
    saveVideos(videos);
    return videos[index];
}

async function atualizarTagDireto(id, campo, valor, recarregar = true) {
    await atualizarVideo(id, { [campo]: valor });
    if (recarregar) carregarVideos();
}

async function toggleFav(id, stat) {
    await atualizarVideo(id, { favorito: !stat });
    carregarVideos();
}

function calcularResumo(videos) {
    if (!videos || videos.length === 0) {
        document.getElementById('avg-ctr').innerText = '0%';
        document.getElementById('avg-retention').innerText = '0%';
        return;
    }
    const totalCtr = videos.reduce((s, v) => s + (Number(v.ctr) || 0), 0);
    const totalAvd = videos.reduce((s, v) => s + (Number(v.avd) || 0), 0);
    document.getElementById('avg-ctr').innerText = `${(totalCtr / videos.length).toFixed(1)}%`;
    document.getElementById('avg-retention').innerText = `${(totalAvd / videos.length).toFixed(1)}%`;
}

function limparCampos() {
    document.getElementById('titulo').value = '';
    document.getElementById('tema').value = '';
    document.getElementById('link').value = '';
    document.getElementById('roteiro').value = '';
    document.getElementById('thumbnail-b64').value = '';
    document.getElementById('text-thumb').innerText = '📁 Upload Thumbnail';
    document.getElementById('label-thumb').style.borderColor = 'rgba(255,255,255,0.1)';
    document.getElementById('thumbnail-pc').value = '';
}

async function exportarBackup() {
    try {
        const payload = {
            videos: getVideos(),
            metas: getMetas(),
            exportadoEm: new Date().toISOString()
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'backup_studio.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (e) {
        console.error(e);
    }
}

async function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const conteudo = JSON.parse(e.target.result);
            const videosImportados = Array.isArray(conteudo) ? conteudo : conteudo.videos;
            const metasImportadas = Array.isArray(conteudo) ? null : conteudo.metas;

            if (Array.isArray(videosImportados)) {
                const normalizados = videosImportados.map((v, index) => ({
                    id: v.id || gerarId(),
                    titulo: v.titulo || `Vídeo ${index + 1}`,
                    tema: v.tema || 'bem-facil|Geral',
                    roteiro: v.roteiro || '',
                    link: v.link || '',
                    thumbnail: v.thumbnail || '',
                    status: v.status || 'Ideia',
                    dificuldade: v.dificuldade || 'Médio',
                    ctr: Number(v.ctr) || 0,
                    avd: Number(v.avd) || 0,
                    views: String(v.views || '0'),
                    favorito: Boolean(v.favorito),
                    deletedAt: v.deletedAt || null,
                    createdAt: v.createdAt || new Date().toISOString()
                }));
                saveVideos(normalizados);
            }

            if (metasImportadas) {
                saveMetas(metasImportadas);
            }

            carregarVideos();
        } catch (err) {
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

window.onload = () => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = uiState.sort;
    getMetas();
    carregarVideos();
};
