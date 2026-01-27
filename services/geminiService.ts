
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse, Chat } from "@google/genai";
import { Team, Insight, MatchupAnalysis, Source, PlayerStat } from "../types";
import { supabase } from "../lib/supabase";

declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
    };
  }
}


const cleanJsonOutput = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  clean = clean.replace(/\s*```$/, "");
  return clean;
};

const extractSources = (response: GenerateContentResponse): Source[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: Source[] = [];
  chunks.forEach((chunk: any) => {
    if (chunk.web?.uri && chunk.web?.title) {
      if (!sources.find(s => s.url === chunk.web.uri)) {
        sources.push({ title: chunk.web.title, url: chunk.web.uri });
      }
    }
  });
  return sources;
};

const SYSTEM_INSTRUCTION = `Você é o "Estatístico Chefe do NBA Hub", um assistente analítico especializado em fornecer insights baseados em dados reais da NBA. Seu objetivo é ajudar os usuários a entenderem o cenário atual da liga, desempenho de jogadores e impacto de lesões.

Diretrizes de Resposta:
- Sempre priorize os dados: Use as ferramentas para buscar os fatos. Nunca invente estatísticas.
- alertar quando o jogo tende a ser under e qunado pode ser over.
- APLIQUE A MARGEM DE SEGURANÇA: Over (-15%) / Under (+20%).
- Filtragem de Jogadores: Escolha jogadores consistentes que raramente ficam abaixo de suas médias.
- Margem de Segurança: Se a média de pontos de um jogador é 25, procure entrar em linhas de "Mais de 19.5" ou "Mais de 21.5" em bilhetes combinados (duplas) para aumentar a segurança.
- Back-to-Back: Times que jogaram na noite anterior e viajam para jogar novamente tendem a estar cansados e podem poupar jogadores (o famoso Load Management).
- Desfalques (Injury Report): No basquete, a ausência de um único jogador estrela muda completamente as odds e o favoritismo.
- Sistemas Defensivos: Algumas equipes focam em trancar o garrafão, o que diminui pontos de pivôs, mas libera chutes de fora para os alas.
- Handicap (Vantagem/Desvantagem): É o mercado mais popular. Como há grandes discrepâncias técnicas, a casa dá uma vantagem de pontos ao azarão (Ex: +7.5) ou uma desvantagem ao favorito (Ex: -7.5).
- Over/Under de Pontos (Totais): Aposta no somatório de pontos das duas equipes. É crucial analisar se os times têm estilo "Run and Gun" (ataque rápido) ou se focam na defesa. 
- Raciocínio Cruzado: Se um time está mal, verifique lesões (get_injuries).
- Tom de Voz: Profissional, analítico e entusiasta (use termos como "Double-double", "Clutch", "Playoffs race").
- Data Atual: Considere que estamos em Janeiro de 2026.
- Formatação: Use tabelas Markdown para comparações.`;
export const nbaTools: FunctionDeclaration[] = [
  {
    name: "get_classificacao_nba",
    description: "Retorna vitórias, derrotas, pontos de ataque, pontos de defesa, conferência e aproveitamento.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING, description: "Nome do time (ex: 'Lakers')" },
        conf: { type: Type.STRING, description: "Filtrar por 'East' ou 'West'" }
      }
    }
  },
  {
    name: "get_nba_injured_playerss",
    description: "Lista desfalques e gravidade (Out, Day-To-Day).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        team_name: { type: Type.STRING, description: "Nome do time." }
      }
    }
  },
  {
    name: "get_nba_jogadores_stats",
    description: "Obtém médias de pontos, rebotes e assistências dos jogadores.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: "Nome do jogador." }
      }
    }
  },
  {
    name: "get_teams",
    description: "Obtém a sequência dos últimos cinco jogos (vitórias e derrotas) de um time.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Nome do time." }
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
      default:
        return { error: "Função não encontrada" };
    }
  } catch (err) {
    return { error: "Erro ao consultar banco de dados" };
  }
}

// Fixed: Corrected response parameter type to GenerateContentResponse
async function handleStreamingFunctionCalls(response: GenerateContentResponse, prompt: string, chat: Chat | null, config: any) {
  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    const toolResponses = [];
    for (const call of functionCalls) {
      const result = await handleNbaFunctionCall(call.name, call.args);
      toolResponses.push({
        functionResponse: {
          name: call.name,
          id: call.id,
          response: { content: result }
        }
      });
    }
    return toolResponses;
  }
  return null;
}

export const analyzeStandings = async (teams: Team[]): Promise<Insight[]> => {
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['prediction', 'analysis', 'warning'] }
      },
      required: ["title", "content", "type"]
    }
  };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const config = {
    tools: [{ functionDeclarations: nbaTools }, { googleSearch: {} }],
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseSchema: schema
  };

  try {
    let response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Gere insights sobre a classificação atual e desfalques na NBA.",
      config
    });

    const toolResponses = await handleStreamingFunctionCalls(response, "", null, config);
    if (toolResponses) {
      response = await ai.models.generateContent({
        contents: [
          { role: 'user', parts: [{ text: "Gere insights sobre a classificação atual e desfalques na NBA." }] },
          { role: 'model', parts: response.candidates[0].content.parts },
          { role: 'user', parts: toolResponses }
        ],
        model: "gemini-2.0-flash", // Reuse the same model for consistency
        config
      });
    }

    if (!response.text) return [];
    const insights = JSON.parse(cleanJsonOutput(response.text));
    const sources = extractSources(response);
    if (insights.length > 0 && sources.length > 0) insights[0].sources = sources;
    return insights;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export async function callGroqFallback(prompt: string, systemInstruction: string, schema?: any): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured for fallback.");

  console.log("Using Groq Fallback...");

  // Append schema instruction if it's not a generic analysis
  let finalSystem = systemInstruction;
  if (schema) {
    finalSystem += `\n\nIMPORTANT: You must respond specifically in JSON format following this structure:
     {
       "winner": "Team Name",
       "confidence": 85,
       "keyFactor": "Short phrase",
       "detailedAnalysis": "Long text"
     }`;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: finalSystem },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Empty Groq response");

    return JSON.parse(content);

  } catch (error) {
    console.error("Groq Fallback Error:", error);
    throw error;
  }
}

export const compareTeams = async (teamA: Team, teamB: Team, playerStats: PlayerStat[], injuries: any[] = []): Promise<MatchupAnalysis> => {
  // 1. Check Cache
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `analysis_v1_${teamA.id}_${teamB.id}_${today}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log("Using Cached Analysis");
      return JSON.parse(cached);
    }
  } catch (e) { console.warn("Cache unavailable", e); }

  const schema = {
    type: Type.OBJECT,
    properties: {
      winner: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      keyFactor: { type: Type.STRING },
      detailedAnalysis: { type: Type.STRING }
    },
    required: ["winner", "confidence", "keyFactor", "detailedAnalysis"]
  };

  const MATCHUP_SYSTEM_INSTRUCTION = `Você é o "Estatístico Chefe do NBA Hub", um assistente analítico especializado em fornecer insights baseados em dados reais da NBA. Seu objetivo é ajudar os usuários a entenderem o cenário atual da liga, desempenho de jogadores e impacto de lesões.

Diretrizes de Resposta:
- Sempre priorize os dados: Use as ferramentas para buscar os fatos. Nunca invente estatísticas.
- alertar quando o jogo tende a ser under e qunado pode ser over.
- APLIQUE A MARGEM DE SEGURANÇA: Over (-15%) / Under (+20%).
- Filtragem de Jogadores: Escolha jogadores consistentes que raramente ficam abaixo de suas médias.
- Margem de Segurança: Se a média de pontos de um jogador é 25, procure entrar em linhas de "Mais de 19.5" ou "Mais de 21.5" em bilhetes combinados (duplas) para aumentar a segurança.
- Back-to-Back: Times que jogaram na noite anterior e viajam para jogar novamente tendem a estar cansados e podem poupar jogadores (o famoso Load Management).
- Desfalques (Injury Report): No basquete, a ausência de um único jogador estrela muda completamente as odds e o favoritismo.
- Sistemas Defensivos: Algumas equipes focam em trancar o garrafão, o que diminui pontos de pivôs, mas libera chutes de fora para os alas.
- Handicap (Vantagem/Desvantagem): É o mercado mais popular. Como há grandes discrepâncias técnicas, a casa dá uma vantagem de pontos ao azarão (Ex: +7.5) ou uma desvantagem ao favorito (Ex: -7.5).
- Over/Under de Pontos (Totais): Aposta no somatório de pontos das duas equipes. É crucial analisar se os times têm estilo "Run and Gun" (ataque rápido) ou se focam na defesa. 
- Raciocínio Cruzado: Se um time está mal, verifique lesões (get_injuries).
- Tom de Voz: Profissional, analítico e entusiasta (use termos como "Double-double", "Clutch", "Playoffs race").
- Data Atual: Considere que estamos em Janeiro de 2026.
- Formatação: Use tabelas Markdown para comparações.
- Saída JSON Obrigatória (conforme schema).`;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const config = {
    tools: [{ functionDeclarations: nbaTools }, { googleSearch: {} }],
    systemInstruction: MATCHUP_SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseSchema: schema
  };

  const prompt = `Analise o confronto tático: ${teamA.name} vs ${teamB.name}.
  Contexto de Lesões (Jogadores Fora): ${injuries.map(p => `${p.player_name || p.nome}`).join(', ') || 'Nenhum relevante'}.
  Estatísticas Reais (Tabela Oficial Teams):
  - ${teamA.name}: ${teamA.wins}V - ${teamA.losses}D | Últimos 5: ${teamA.record.join(', ')}
  - ${teamB.name}: ${teamB.wins}V - ${teamB.losses}D | Últimos 5: ${teamB.record.join(', ')}
  Métricas Adicionais (ESPN):
  - ${teamA.name}: Ataque ${teamA.stats?.media_pontos_ataque || 'N/A'}, Defesa ${teamA.stats?.media_pontos_defesa || 'N/A'}. 
  - ${teamB.name}: Ataque ${teamB.stats?.media_pontos_ataque || 'N/A'}, Defesa ${teamB.stats?.media_pontos_defesa || 'N/A'}.`;

  try {
    let response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Atualizado para modelo mais rápido e eficiente para JSON
      contents: prompt,
      config
    });

    const toolResponses = await handleStreamingFunctionCalls(response, prompt, null, config);
    if (toolResponses) {
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash", // Use consistent model

        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: response.candidates[0].content.parts },
          { role: 'user', parts: toolResponses }
        ],
        config
      });
    }

    if (!response.text) throw new Error("Empty response");
    const analysis = JSON.parse(cleanJsonOutput(response.text));
    // Fixed: Corrected the typo where 'sources' was used instead of 'response'
    analysis.sources = extractSources(response);

    // Save to Cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(analysis));
    } catch (e) { console.warn("Failed to cache analysis", e); }

    return analysis;
  } catch (error: any) {
    if (error.status === 403) throw new Error("PERMISSION_DENIED");

    // Fallback to Groq only if API Key is configured and it's not a permission error
    if (process.env.GROQ_API_KEY && (error.status === 429 || error.message?.includes("Quota") || error.message?.includes("429"))) {
      try {
        const fallbackAnalysis = await callGroqFallback(prompt, MATCHUP_SYSTEM_INSTRUCTION + "\nResponda em JSON.", schema);
        // Groq doesn't provide sources, so we leave it empty or add a note
        fallbackAnalysis.sources = [{ title: "Análise via Llama 3 (Groq Fallback)", url: "#" }];
        return fallbackAnalysis;
      } catch (groqError) {
        console.error("Fallback failed:", groqError);
        throw error; // Throw original Gemini error if fallback fails
      }
    }

    throw error;
  }
};

export const startChatSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: nbaTools }, { googleSearch: {} }],
    }
  });
};

export const sendChatMessage = async (chat: Chat, message: string) => {
  let response = await chat.sendMessage({ message });

  const toolResponses = await handleStreamingFunctionCalls(response, message, chat, {});
  if (toolResponses) {
    // Use correct object format for @google/genai chat.sendMessage
    response = await chat.sendMessage({ message: toolResponses });
  }

  return {
    text: response.text,
    sources: extractSources(response)
  };
};
