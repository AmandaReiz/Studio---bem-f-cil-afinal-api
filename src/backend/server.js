const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const path = require('path');

const app = express();

// CONFIGURAÇÃO PRISMA PARA RAILWAY (PRISMA 7)
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// 1. Middlewares básicos
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Servir arquivos estáticos (CSS, JS, Imagens)
const frontendPath = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// 3. Rota de Teste (Healthcheck)
app.get('/health', (req, res) => res.json({ status: "On-line! 🚀", port: process.env.PORT || 3333 }));

// --- ROTAS DE VÍDEOS ---

app.get('/videos', async (req, res) => {
    try {
        const videos = await prisma.video.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(videos);
    } catch (error) {
        console.error("ERRO CRÍTICO /VIDEOS:", error);
        res.status(500).json({ error: "Erro ao buscar vídeos", details: error.message });
    }
});

app.get('/videos/favoritos', async (req, res) => {
    try {
        const favoritos = await prisma.video.findMany({ where: { favorito: true }, orderBy: { createdAt: 'desc' } });
        res.json(favoritos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar favoritos" });
    }
});

app.post('/videos', async (req, res) => {
    const { titulo, tema, roteiro, link, thumbnail, status, dificuldade } = req.body;
    try {
        const novoVideo = await prisma.video.create({
            data: { 
                titulo, 
                tema, 
                roteiro, 
                link, 
                thumbnail: thumbnail || null,
                status: status || "Ideia",
                dificuldade: dificuldade || "Médio",
                ctr: 0, 
                avd: 0, 
                views: "0", 
                favorito: false 
            }
        });
        res.status(201).json(novoVideo);
    } catch (error) {
        console.error("ERRO AO SALVAR VÍDEO:", error);
        res.status(500).json({ error: "Erro ao salvar", detalhes: error.message });
    }
});

app.patch('/videos/:id', async (req, res) => {
    const { id } = req.params;
    const { ctr, avd, views, status, dificuldade, thumbnail, roteiro } = req.body;
    
    try {
        const dadosParaAtualizar = {};
        if (ctr !== undefined) dadosParaAtualizar.ctr = parseFloat(ctr || 0);
        if (avd !== undefined) dadosParaAtualizar.avd = parseFloat(avd || 0);
        if (views !== undefined) dadosParaAtualizar.views = String(views);
        if (status !== undefined) dadosParaAtualizar.status = status;
        if (dificuldade !== undefined) dadosParaAtualizar.dificuldade = dificuldade;
        if (thumbnail !== undefined) dadosParaAtualizar.thumbnail = thumbnail;
        if (roteiro !== undefined) dadosParaAtualizar.roteiro = roteiro;

        const atualizado = await prisma.video.update({
            where: { id },
            data: dadosParaAtualizar
        });
        res.json(atualizado);
    } catch (error) {
        console.error("Erro Prisma Update:", error);
        res.status(500).json({ error: "Erro ao atualizar dados" });
    }
});

app.patch('/videos/:id/favoritar', async (req, res) => {
    const { id } = req.params;
    const { favorito } = req.body;
    try {
        const atualizado = await prisma.video.update({ 
            where: { id }, 
            data: { favorito: Boolean(favorito) } 
        });
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao favoritar" });
    }
});

app.delete('/videos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.video.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Erro ao deletar" });
    }
});

// --- ROTAS DE METAS ---

app.get('/metas', async (req, res) => {
    try {
        let metas = await prisma.meta.findUnique({ where: { id: "config_metas" } });
        if (!metas) {
            metas = await prisma.meta.create({
                data: { id: "config_metas", metaViews: 100000, metaInsc: 1000, metaRec: 500 }
            });
        }
        res.json(metas);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar metas" });
    }
});

app.patch('/metas', async (req, res) => {
    const { views, inscritos, receita, metaViews, metaInsc, metaRec } = req.body;
    try {
        const atualizado = await prisma.meta.update({
            where: { id: "config_metas" },
            data: {
                views: views !== undefined ? parseInt(views) : undefined,
                inscritos: inscritos !== undefined ? parseInt(inscritos) : undefined,
                receita: receita !== undefined ? parseFloat(receita) : undefined,
                metaViews: metaViews !== undefined ? parseInt(metaViews) : undefined,
                metaInsc: metaInsc !== undefined ? parseInt(metaInsc) : undefined,
                metaRec: metaRec !== undefined ? parseFloat(metaRec) : undefined,
            }
        });
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar metas" });
    }
});

// --- ROTA RAIZ ---
app.get(/^\/(?!videos|metas|health).*/, (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send("Arquivo index.html não encontrado na pasta frontend.");
        }
    });
});

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Studio PRO ON na porta ${PORT}`);
});