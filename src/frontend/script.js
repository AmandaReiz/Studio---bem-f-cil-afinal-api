const API_URL = window.location.origin + "/videos";
const METAS_URL = window.location.origin + "/metas";
// const API_URL = "http://localhost:3333/videos"; 
// const METAS_URL = "http://localhost:3333/metas"; 
let idVideoAtivo = null; 
let idVideoParaTrocaThumb = null; 
window.listaVideosAtual = []; 

// --- UTILITÁRIOS ---

function converterThumb(input) {
    const file = input.files[0];
    const label = document.getElementById('label-thumb');
    const text = document.getElementById('text-thumb');
    if (file) {
        text.innerText = "⏳ Carregando...";
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('thumbnail-b64').value = e.target.result;
            text.innerText = "✅ Imagem Pronta!";
            label.style.borderColor = "#32d74b";
        };
        reader.readAsDataURL(file);
    }
}

function toggleMenu() {
    document.getElementById("dropdown-menu").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.menu-dots-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('studio-theme', newTheme);
}

// --- CORE (CARREGAMENTO E RENDER) ---

async function carregarVideos() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) {
            renderizarCards([]); 
            return;
        }
        const videos = await res.json();
        window.listaVideosAtual = Array.isArray(videos) ? videos : [];
        renderizarCards(window.listaVideosAtual);
    } catch (error) {
        console.error("Erro ao carregar:", error);
        renderizarCards([]); 
    }
}

function renderizarCards(videos) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';
    document.getElementById('video-count').innerText = `${videos.length} vídeos`;
    calcularResumo(videos);

    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card animate-pop';
        const ctrClass = v.ctr < 5 ? 'm-low' : 'm-high';
        const avdClass = v.avd < 40 ? 'm-low' : 'm-high';
        
        // --- LÓGICA DE SEPARAÇÃO CANAL | TEMA ---
        // Se o tema tiver o separador "|", a gente divide. Se não, assume 'bem-facil'
        const partes = v.tema && v.tema.includes('|') ? v.tema.split('|') : ['bem-facil', v.tema || 'Geral'];
        const canalData = partes[0];
        const temaExibicao = partes[1];
        const nomeCanal = canalData === 'codigo' ? 'Código da Inteligência' : 'É bem fácil, afinal';

        card.innerHTML = `
            <div class="thumb-container" onclick="prepararTrocaThumb('${v.id}')" style="cursor:pointer; position:relative; overflow:hidden; border-radius:15px; margin-bottom:15px;">
                <img src="${v.thumbnail || 'placeholder-image-url'}" style="width:100%; height:150px; object-fit:cover; border: 1px solid rgba(255,255,255,0.1)">
                <div class="thumb-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;">
                    <span style="color:#fff; font-size:12px; font-weight:bold;">📷 TROCAR FOTO</span>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div>
                    <h3 style="margin:0; font-family: Helvetica, sans-serif; font-weight: bold;">${v.titulo}</h3>
                    <span class="canal-tag">${nomeCanal}</span>
                </div>
                <span onclick="toggleFav('${v.id}',${v.favorito})" style="cursor:pointer; font-size:22px; color:${v.favorito?'#ffd60a':'#333'}">★</span>
            </div>
            <p style="color:#8e8e93; font-size:12px; margin: 5px 0 15px 0;">${temaExibicao}</p>
            <div style="display:flex; gap:10px; margin-bottom:15px">
                <select onchange="atualizarTagDireto('${v.id}', 'status', this.value)" style="background:rgba(255,255,255,0.05); color:#fff; border:none; border-radius:5px; font-size:10px; padding:3px; cursor:pointer">
                    <option value="Ideia" ${v.status === 'Ideia' ? 'selected' : ''}>🔴 Ideia</option>
                    <option value="Roteirizando" ${v.status === 'Roteirizando' ? 'selected' : ''}>🟡 Editando</option>
                    <option value="Postado" ${v.status === 'Postado' ? 'selected' : ''}>🟢 Postado</option>
                </select>
                <select onchange="atualizarTagDireto('${v.id}', 'dificuldade', this.value)" style="background:rgba(255,255,255,0.05); color:#fff; border:none; border-radius:5px; font-size:10px; padding:3px; cursor:pointer">
                    <option value="Rápido" ${v.dificuldade === 'Rápido' ? 'selected' : ''}>⚡ Rápido</option>
                    <option value="Médio" ${v.dificuldade === 'Médio' ? 'selected' : ''}>🛠️ Médio</option>
                    <option value="Complexo" ${v.dificuldade === 'Complexo' ? 'selected' : ''}>🧠 Complexo</option>
                </select>
            </div>
            <div style="display:flex; gap:8px; flex-wrap: wrap;">
                <span class="metric-badge ${ctrClass}">${v.ctr || 0}% CTR</span>
                <span class="metric-badge ${avdClass}">${v.avd || 0}% AVD</span>
                <span class="metric-badge" style="background:rgba(255,255,255,0.05)">👁️ ${v.views || 0}</span>
            </div>
            <div class="metrics-edit">
                <input type="text" id="v-${v.id}" placeholder="Views">
                <input type="number" id="c-${v.id}" placeholder="CTR %">
                <input type="number" id="a-${v.id}" placeholder="AVD %">
                <button onclick="update('${v.id}')" style="background:var(--accent); color:#000; border:none; border-radius:6px; padding:0 10px; cursor:pointer; font-weight:bold">OK</button>
            </div>
            <div class="card-actions">
                <button class="btn-action" onclick="abrirRoteiroPeloId('${v.id}')">📜 Roteiro</button>
                ${v.link ? `<button class="btn-play" onclick="window.open('${v.link}')">▶ Play</button>` : ''}
            </div>
            <button onclick="excluir('${v.id}')" style="background:none; border:none; color:#333; font-size:10px; margin-top:20px; cursor:pointer; width:100%; text-align:center; font-weight:bold; letter-spacing:1px">EXCLUIR PERMANENTE</button>
        `;
        grid.appendChild(card);
    });
}

// --- THUMBNAIL ---

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
        };
        reader.readAsDataURL(file);
    }
});

// --- ROTEIRO ---

function abrirRoteiroPeloId(id) {
    const video = window.listaVideosAtual.find(v => v.id === id);
    if (video) {
        idVideoAtivo = id;
        document.getElementById('roteiro-titulo').innerText = video.titulo;
        document.getElementById('roteiro-editavel').value = video.roteiro || "";
        document.getElementById('overlay-roteiro').style.display = 'flex';
    }
}

function fecharRoteiro() { document.getElementById('overlay-roteiro').style.display = 'none'; }

async function salvarAlteracaoRoteiro() {
    const novoTexto = document.getElementById('roteiro-editavel').value;
    if (!idVideoAtivo) return;
    try {
        await fetch(`${API_URL}/${idVideoAtivo}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roteiro: novoTexto })
        });
        fecharRoteiro();
        carregarVideos();
    } catch (e) { console.error(e); }
}

// --- METAS ---

async function abrirMetas() {
    document.getElementById('overlay-metas').style.display = 'flex';
    try {
        const res = await fetch(METAS_URL);
        const m = await res.json();
        
        document.getElementById('m-views').value = m.views || 0;
        document.getElementById('m-insc').value = m.inscritos || 0;
        document.getElementById('m-rec').value = m.receita || 0;
        document.getElementById('mt-views').value = m.metaViews || 1;
        document.getElementById('mt-insc').value = m.metaInsc || 1;
        document.getElementById('mt-rec').value = m.metaRec || 1;

        const grid = document.querySelector('.metas-grid');
        const categorias = [
            { label: "Visualizações", atual: m.views || 0, meta: m.metaViews || 1, cor: "#32d74b" },
            { label: "Inscritos", atual: m.inscritos || 0, meta: m.metaInsc || 1, cor: "#ff9f0a" },
            { label: "Receita (R$)", atual: m.receita || 0, meta: m.metaRec || 1, cor: "#5e5ce6" }
        ];

        grid.innerHTML = categorias.map(c => {
            const porc = Math.min((c.atual / c.meta) * 100, 100).toFixed(1);
            return `
                <div class="meta-card">
                    <span class="meta-label">${c.label}</span>
                    <h2 class="meta-percent">${porc}%</h2>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${porc}%; background: ${c.cor}"></div>
                    </div>
                    <div class="meta-footer">
                        <span>${c.atual.toLocaleString()}</span>
                        <span>Alvo: ${c.meta.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Erro ao carregar metas:", e); }
}

function fecharMetas() { document.getElementById('overlay-metas').style.display = 'none'; }

async function salvarMetas() {
    const dados = {
        views: parseInt(document.getElementById('m-views').value) || 0,
        inscritos: parseInt(document.getElementById('m-insc').value) || 0,
        receita: parseFloat(document.getElementById('m-rec').value) || 0,
        metaViews: parseInt(document.getElementById('mt-views').value) || 0,
        metaInsc: parseInt(document.getElementById('mt-insc').value) || 0,
        metaRec: parseFloat(document.getElementById('mt-rec').value) || 0
    };
    try {
        await fetch(METAS_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        abrirMetas();
    } catch (e) { console.error("Erro ao salvar metas:", e); }
}

// --- AÇÕES DO BANCO ---

async function salvarVideo() {
    const canal = document.getElementById('canal-origem').value;
    const temaReal = document.getElementById('tema').value;

    const body = {
        titulo: document.getElementById('titulo').value,
        // SALVAMOS CANAL E TEMA NO MESMO CAMPO PARA NÃO DAR ERRO NO BANCO
        tema: `${canal}|${temaReal}`, 
        link: document.getElementById('link').value,
        thumbnail: document.getElementById('thumbnail-b64').value,
        status: document.getElementById('status-default').value,
        dificuldade: document.getElementById('dificuldade-default').value,
        roteiro: document.getElementById('roteiro').value
    };
    if(!body.titulo) return;
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(body) 
        });
        limparCampos();
        carregarVideos();
    } catch (e) { console.error(e); }
}

async function update(id) {
    const views = document.getElementById(`v-${id}`).value;
    const ctr = document.getElementById(`c-${id}`).value;
    const avd = document.getElementById(`a-${id}`).value;
    const dados = {};
    if (views !== "") dados.views = parseInt(views);
    if (ctr !== "") dados.ctr = parseFloat(ctr);
    if (avd !== "") dados.avd = parseFloat(avd);
    await fetch(`${API_URL}/${id}`, { 
        method: 'PATCH', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(dados) 
    });
    carregarVideos();
}

async function excluir(id) { 
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' }); 
    carregarVideos(); 
}

async function atualizarTagDireto(id, campo, valor) {
    const dados = {};
    dados[campo] = valor;
    await fetch(`${API_URL}/${id}`, { 
        method: 'PATCH', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(dados) 
    });
    carregarVideos();
}

async function toggleFav(id, stat) {
    await fetch(`${API_URL}/${id}/favoritar`, { 
        method: 'PATCH', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ favorito: !stat }) 
    });
    carregarVideos();
}

// --- FILTROS ---

function calcularResumo(videos) {
    if (videos.length === 0) {
        document.getElementById('avg-ctr').innerText = '0%';
        document.getElementById('avg-retention').innerText = '0%';
        return;
    }
    const totalCtr = videos.reduce((s, v) => s + (v.ctr || 0), 0);
    const totalAvd = videos.reduce((s, v) => s + (v.avd || 0), 0);
    document.getElementById('avg-ctr').innerText = (totalCtr / videos.length).toFixed(1) + '%';
    document.getElementById('avg-retention').innerText = (totalAvd / videos.length).toFixed(1) + '%';
}

function limparCampos() { 
    document.getElementById('titulo').value = '';
    document.getElementById('tema').value = '';
    document.getElementById('link').value = '';
    document.getElementById('roteiro').value = '';
    document.getElementById('thumbnail-b64').value = '';
    document.getElementById('text-thumb').innerText = "📁 Upload Thumbnail";
    document.getElementById('label-thumb').style.borderColor = "rgba(255,255,255,0.1)";
}

async function filtrarCanal(canalAlvo) {
    const res = await fetch(API_URL);
    const videos = await res.json();
    
    const filtrados = videos.filter(v => {
        const partes = v.tema && v.tema.includes('|') ? v.tema.split('|') : ['bem-facil'];
        return partes[0] === canalAlvo;
    });

    renderizarCards(filtrados);
}

async function filtrarStatus(status) {
    const res = await fetch(API_URL);
    const videos = await res.json();
    renderizarCards(status ? videos.filter(v => v.status === status) : videos);
}

async function filtrarDificuldade(dif) {
    const res = await fetch(API_URL);
    const videos = await res.json();
    renderizarCards(videos.filter(v => v.dificuldade === dif));
    toggleMenu(); 
}

function carregarSucessos() { filtrarStatus('Postado'); }

// --- BACKUP ---

async function exportarBackup() {
    try {
        const res = await fetch(API_URL);
        const videos = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(videos, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_studio.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (e) { console.error(e); }
}

async function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const videos = JSON.parse(e.target.result);
            for (const v of videos) {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...v })
                });
            }
            carregarVideos();
        } catch (err) { console.error(err); }
    };
    reader.readAsText(file);
}

window.onload = () => {
    const savedTheme = localStorage.getItem('studio-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    carregarVideos();
};