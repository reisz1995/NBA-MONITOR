
import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

const SYSTEM_INSTRUCTION = `Você é o "Estatístico Chefe do NBA Hub", ... (truncated for brevity)`;

const FULL_SYSTEM_INSTRUCTION = `Você é o "Estatístico Chefe do NBA Hub", um assistente analítico especializado em fornecer insights baseados em dados reais da NBA. Seu objetivo é ajudar os usuários a entenderem o cenário atual da liga, desempenho de jogadores e impacto de lesões.

Diretrizes de Resposta:
- Sempre priorize os dados: Use as ferramentas para buscar os fatos. Nunca invente estatísticas.
- MÉTRICA DE PESO DOS JOGADORES:
    * Peso 10: Jogadores estrela/elite (média ~30 pontos ou alto volume de Rebotes + Assistências).
    * Peso 5: Jogadores de rotação/regulares (média ~10 pontos).
    * Calcule o peso proporcionalmente para outros valores.
- IMPACTO NO TOTAL (OVER/UNDER): Se um jogador de **Peso 10** estiver fora (Injury Report), há uma fortíssima tendência para o jogo ser **UNDER**.
- Alertar quando o jogo tende a ser under e quando pode ser over.
- APLIQUE A MARGEM DE SEGURANÇA: Over (-15%) / Under (+20%).
- Filtragem de Jogadores: Escolha jogadores consistentes que raramente ficam abaixo de suas médias.
- Margem de Segurança: Se a média de pontos de um jogador é 25, procure entrar em linhas de "Mais de 19.5" ou "Mais de 21.5" em bilhetes combinados (duplas) para aumentar a segurança.
- Back-to-Back: Times que jogaram na noite anterior e viajam para jogar novamente tendem a estar cansados e podem poupar jogadores (o famoso Load Management).
- Desfalques (Injury Report): No basquete, a ausência de um único jogador estrela muda completamente as odds e o favoritismo. Use o peso para quantificar esse impacto.
- Sistemas Defensivos: Algumas equipes focam em trancar o garrafão, o que diminui pontos de pivôs, mas libera chutes de fora para os alas.
- Handicap (Vantagem/Desvantagem): É o mercado mais popular. Como há grandes discrepâncias técnicas, a casa dá uma vantagem de pontos ao azarão (Ex: +7.5) ou uma desvantagem ao favorito (Ex: -7.5).
- Over/Under de Pontos (Totais): Aposta no somatório de pontos das duas equipes. É crucial analisar se os times têm estilo "Run and Gun" (ataque rápido) ou se focam na defesa. 
- Raciocínio Cruzado: Se um time está mal, verifique lesões (get_injuries).
- Sistema de Busca: Use a ferramenta web_search para buscar notícias de hoje, mas SEMPRE cruze essas informações com os dados das tabelas fornecidas para identificar tendências ou discrepâncias.
- Tom de Voz: Profissional, analítico e entusiasta (use termos como "Double-double", "Clutch", "Playoffs race").
- Data Atual: Considere que estamos em Janeiro de 2026.
- Formatação: Use tabelas Markdown para comparações.`;

const nbaTools: OpenAI.Chat.ChatCompletionTool[] = [
    // ... (Same tools as in analyze.ts)
    {
        type: "function",
        function: {
            name: "get_classificacao_nba",
            description: "Retorna vitórias, derrotas, pontos de ataque, pontos de defesa, conferência e aproveitamento.",
            parameters: {
                type: "object",
                properties: {
                    time: { type: "string", description: "Nome do time (ex: 'Lakers')" },
                    conf: { type: "string", description: "Filtrar por 'East' ou 'West'" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_nba_injured_playerss",
            description: "Lista desfalques e gravidade (Out, Day-To-Day).",
            parameters: {
                type: "object",
                properties: {
                    team_name: { type: "string", description: "Nome do time." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_nba_jogadores_stats",
            description: "Obtém médias de pontos, rebotes e assistências dos jogadores.",
            parameters: {
                type: "object",
                properties: {
                    nome: { type: "string", description: "Nome do jogador." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_teams",
            description: "Obtém a sequência dos últimos cinco jogos (vitórias e derrotas) de um time.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Nome do time." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Busca informações em tempo real na web sobre a NBA (notícias, lesões de última hora, odds).",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "A consulta de busca (ex: 'Lakers injury report today')" }
                },
                required: ["query"]
            }
        }
    }
];

async function handleNbaFunctionCall(name: string, args: any) {
    try {
        switch (name) {
            case "get_classificacao_nba": {
                let query = supabase.from('teams').select('*');
                if (args.conf) query = query.eq('conference', args.conf);
                if (args.time) query = query.ilike('name', `%${args.time}%`);
                const { data } = await query.order('wins', { ascending: false });
                return data;
            }
            case "get_nba_injured_playerss": {
                let query = supabase.from('nba_injured_players').select('*');
                if (args.team_name) query = query.ilike('team_name', `%${args.team_name}%`);
                const { data } = await query;
                return data;
            }
            case "get_nba_jogadores_stats": {
                let query = supabase.from('nba_jogadores_stats').select('*');
                if (args.nome) query = query.ilike('nome', `%${args.nome}%`);
                const { data } = await query.limit(5);
                return data;
            }
            case "get_teams": {
                let query = supabase.from('teams').select('name, record');
                if (args.name) query = query.ilike('name', `%${args.name}%`);
                const { data } = await query;
                return data;
            }
            case "web_search": {
                const apiKey = process.env.TAVILY_API_KEY;
                if (!apiKey) return { error: "Tavily API Key not configured" };

                const response = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: apiKey,
                        query: args.query,
                        search_depth: "advanced",
                        include_answer: true
                    })
                });
                const data = await response.json();
                return {
                    results: data.results?.map((r: any) => ({ title: r.title, url: r.url, snippet: r.content })),
                    answer: data.answer
                };
            }
            default:
                return { error: "Função não encontrada" };
        }
    } catch (err) {
        return { error: "Erro ao executar ferramenta" };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { teamA, teamB, playerStats, injuries } = req.body;

    const enhancedSystem = FULL_SYSTEM_INSTRUCTION + `
  
  DIRETRIZES TÉCNICAS ADICIONAIS:
  - Analise se o jogo tende a ser UNDER ou OVER pontos totais.
  - USE A MÉTRICA DE PESO: Identifique o peso dos jogadores (Elite = Peso 10, Regular = Peso 5) baseando-se em pontos, rebotes e assistências.
  - REGRA DO DESFALQUE: Se houver ausência de um jogador de **Peso 10**, a recomendação principal deve tender a **UNDER**.
  - Calcule e informe a MARGEM DE SEGURANÇA:
    * Se prever OVER, a linha segura é (Projeção - 15%).
    * Se prever UNDER, a linha segura é (Projeção + 20%).
  - Avalie o IMPACTO DAS LESÕES no desempenho defensivo e ofensivo usando os pesos calculados.
  - Considere o fator CANSAÇO (Back-to-back).
  - Identifique o SISTEMA DEFENSIVO (tranca garrafão vs libera chutes).

  VOCÊ DEVE RESPONDER EXCLUSIVAMENTE NO SEGUINTE FORMATO JSON:
  {
    "winner": "Nome do Time",
    "confidence": 85,
    "keyFactor": "Frase curta explicando o principal motivo",
    "detailedAnalysis": "Texto longo com análise tática",
    "overUnderAlert": "OVER" | "UNDER",
    "overUnderTarget": 225.5,
    "safetyMargin": "Texto explicando a linha segura (ex: 'Entrar em Under 235.5')",
    "injuryImpact": "Análise detalhada do peso das ausências",
    "bettingTips": ["Dica 1", "Dica 2"],
    "defensiveAnalysis": "Como os times defendem hoje"
  }`;

    const prompt = `Analise o confronto tático: ${teamA.name} vs ${teamB.name}.
  Contexto de Lesões (Jogadores Fora): ${injuries.map((p: any) => `${p.player_name || p.nome}`).join(', ') || 'Nenhum relevante'}.
  Estatísticas Reais:
  - ${teamA.name}: ${teamA.wins}V - ${teamA.losses}D | Últimos 5: ${teamA.record.join(', ')}
  - ${teamB.name}: ${teamB.wins}V - ${teamB.losses}D | Últimos 5: ${teamB.record.join(', ')}
  Métricas:
  - ${teamA.name}: Ataque ${teamA.stats?.media_pontos_ataque || 'N/A'}, Defesa ${teamA.stats?.media_pontos_defesa || 'N/A'}. 
  - ${teamB.name}: Ataque ${teamB.stats?.media_pontos_ataque || 'N/A'}, Defesa ${teamB.stats?.media_pontos_defesa || 'N/A'}.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: enhancedSystem },
                { role: "user", content: prompt }
            ],
            tools: nbaTools,
            response_format: { type: "json_object" }
        });

        let message = response.choices[0].message;

        if (message.tool_calls) {
            const toolMessages: any[] = [{ role: "system", content: enhancedSystem }, { role: "user", content: prompt }, message];
            for (const toolCall of message.tool_calls) {
                const result = await handleNbaFunctionCall(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                toolMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
            }
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: toolMessages,
                response_format: { type: "json_object" }
            });
            message = secondResponse.choices[0].message;
        }

        return res.status(200).json(JSON.parse(message.content || "{}"));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
