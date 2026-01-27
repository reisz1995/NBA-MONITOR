<div align="center">
<img width="1200" height="475" alt="NBA Monitor Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# NBA MONITOR 🏀
### AI-Driven Analytics & Professional Betting Insights
</div>

---

## 🚀 Visão Geral do Projeto

O **NBA Monitor** é uma plataforma analítica de alto desempenho desenvolvida para transformar dados brutos da NBA em inteligência estratégica. Projetada tanto para **desenvolvedores** quanto para **analistas de apostas (bets)**, a aplicação utiliza o poder do **Google Gemini AI** para realizar análises preditivas e de momentum em tempo real.

O fluxo de trabalho da plataforma é otimizado para a **Comparação de Times**, permitindo que o usuário cruze dados estatísticos, momentum recente e a situação física dos jogadores para uma tomada de decisão precisa.

## 🎯 Principais Funcionalidades

- **🤖 Análise com Google Gemini AI:** Integração com modelos de IA de última geração para interpretar classificações e prever o momentum das equipes.
- **⚖️ Sistema de Comparação Avançada:** O núcleo da aplicação, onde os usuários podem comparar métricas chave entre dois times selecionados.
- **🚑 Monitoramento de Lesões (The Betting Edge):** Acompanhamento detalhado de jogadores indisponíveis, essencial para analistas de bets calcularem o impacto real em cada confronto.
- **📊 Dados em Tempo Real:** Sincronização de estatísticas, classificações e recordes (L10, Streak) através de uma interface reativa.
- **💬 ChatBot Integrado:** Assistente de IA para consultas rápidas sobre estatísticas e tendências da liga.

## 🛠️ Stack Tecnológica

O projeto utiliza as tecnologias mais modernas do ecossistema web para garantir velocidade e confiabilidade:

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Data Fetching:** [SWR](https://swr.vercel.app/) para cache e revalidação de dados.
- **Backend/Storage:** [Supabase](https://supabase.com/)
- **AI Engine:** [Google Gemini API](https://ai.google.dev/)

---

## 💻 Como Executar Localmente

**Pré-requisitos:** Node.js (v18+)

1.  **Clone o repositório:**
    ```bash
    git clone [url-do-repositorio]
    cd nba-monitor
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configuração de Ambiente:**
    Crie ou edite o arquivo `.env.local` na raiz do projeto e adicione suas chaves:
    ```env
    VITE_SUPABASE_URL=sua_url_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anonima
    VITE_GEMINI_API_KEY=sua_chave_gemini
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

---

## 📊 Para Analistas de Bets

A aplicação fornece métricas cruciais que vão além da pontuação básica:
- **Momentum Score:** Calculado com base nos últimos 10 jogos (L10).
- **Roster Depth Impact:** Analise como ausências de jogadores chave afetam a rotação do time através do painel de `Unavailable Players`.
- **Matchup Analysis:** Utilize a IA para identificar vantagens táticas antes do início da partida.

---

> [!TIP]
> Visualize o fluxo interativo no AI Studio: [NBA Monitor App](https://ai.studio/apps/drive/12hzgdDFtn2JlYzNV0kgqr7s5PTQHC6J7)
