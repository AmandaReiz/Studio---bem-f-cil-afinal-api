## 🎥 Studio Pro: É bem fácil, afinal

O Studio Pro é uma plataforma de gerenciamento de conteúdo e performance desenvolvida especificamente para o ecossistema do canal "É bem fácil, afinal". O projeto evoluiu de uma simples API para uma central de comando completa para canais faceless (dark), permitindo desde a roterização até o acompanhamento de métricas financeiras.

## 🛠️ Novas Implementações & Tecnologias

Além da base em Node.js e MySQL, o projeto agora conta com:

Prisma ORM (v6): Modelagem avançada com tabelas de vídeos e metas de performance.

Gestão de Roteiros: Sistema de edição individualizada de roteiros com persistência de dados em campos LongText.

Dashboard de Metas: Interface dinâmica para monitoramento de Visualizações, Inscritos e Receita.

Sistema de Temas: Implementação de Dark/Light Mode com persistência via localStorage.

UX/UI Apple Style: Design minimalista inspirado no ecossistema Apple, com foco em usabilidade e fluidez.

Gestão de Ativos: Upload e conversão de thumbnails em Base64 para visualização instantânea.

## 🧠 Funcionalidades Principais

Workflow de Produção: Separação de vídeos por status (Ideia, Editando, Postado) e nível de dificuldade (Rápido, Médio, Complexo).

Métricas em Tempo Real: Cálculo automático de CTR e AVD médio do canal direto no dashboard.

Metas Dinâmicas: Modal exclusivo para ajuste de objetivos mensais, permitindo atualizar tanto o progresso atual quanto o alvo final.

Favoritos & Filtros: Organização rápida para destacar conteúdos de sucesso e filtrar a grade de produção.

Backup & Portabilidade: Funções integradas para Exportar e Importar dados em formato JSON.

## 🚀 Como Rodar o Projeto

Instale as dependências:

Bash
npm install
Sincronize o Banco de Dados:

Bash
npx prisma db push
npx prisma generate
Inicie o Servidor:

Bash
npm run dev


Desenvolvedora: Amanda Reis

Projeto: É bem fácil, afinal

Status: Produção / Deploy Railway



pra voltar pra rodar localmente 
env. script tinhamos 

  //"scripts": {
   // "dev": "nodemon src/backend/server.js",
    //"test": "echo \"Error: no test specified\" && exit 1"
 // },
