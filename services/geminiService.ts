import { Team, Insight, MatchupAnalysis, PlayerStat } from "../types";
import { supabase } from "../lib/supabase";

const parsePrediction = (predictionStr: string): Partial<MatchupAnalysis> => {
  if (!predictionStr) return {};

  const parts = predictionStr.split('|').map(p => p.trim());
  const result: Partial<MatchupAnalysis> = {
    keyFactor: "Análise do Banco de Dados",
    detailedAnalysis: predictionStr
  };

  parts.forEach(part => {
    if (part.startsWith('Palpite:')) {
      result.winner = part.replace('Palpite:', '').trim();
    } else if (part.startsWith('Confiança:')) {
      const conf = part.replace('Confiança:', '').trim().toLowerCase();
      if (conf.includes('alta')) result.confidence = 90;
      else if (conf.includes('média') || conf.includes('media')) result.confidence = 70;
      else result.confidence = 50;
    } else if (part.startsWith('Análise:')) {
      result.detailedAnalysis = part.replace('Análise:', '').trim();
    }
  });

  return result;
};

export const compareTeams = async (teamA: Team, teamB: Team, playerStats: PlayerStat[], injuries: any[] = []): Promise<MatchupAnalysis> => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('game_predictions')
      .select('*')
      .or(`and(home_team.ilike.%${teamA.name}%,away_team.ilike.%${teamB.name}%),and(home_team.ilike.%${teamB.name}%,away_team.ilike.%${teamA.name}%)`)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        winner: "Indisponível",
        confidence: 0,
        keyFactor: "Sem dados para hoje",
        detailedAnalysis: "Não encontramos previsões para este confronto no banco de dados para a data de hoje.",
        bettingTips: []
      };
    }

    const parsed = parsePrediction(data.prediction);

    return {
      winner: parsed.winner || "Análise Pendente",
      confidence: parsed.confidence || data.win_probability || 70,
      keyFactor: parsed.keyFactor || "Análise do Banco de Dados",
      detailedAnalysis: parsed.detailedAnalysis || "Análise detalhada não disponível.",
      bettingTips: [],
      sources: []
    };
  } catch (error: any) {
    console.error("Supabase Comparison Error:", error);
    return {
      winner: "Erro na Busca",
      confidence: 0,
      keyFactor: "Erro de Conexão",
      detailedAnalysis: "Não foi possível recuperar os dados do Supabase.",
    };
  }
};

// analyzeStandings remains for other parts of the app if needed, 
// but we could also migrate it to Supabase if requested.
export const analyzeStandings = async (teams: Team[]): Promise<Insight[]> => {
  return []; // Desativado conforme solicitação de não precisar mais das APIs
};

