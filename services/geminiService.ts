import { Team, Insight, MatchupAnalysis, PlayerStat } from "../types";
import { supabase } from "../lib/supabase";

import { Team, MatchupAnalysis, PlayerStat } from "../types";
import { supabase } from "../lib/supabase";

export const compareTeams = async (teamA: Team, teamB: Team, playerStats: PlayerStat[], injuries: any[] = []): Promise<MatchupAnalysis> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  console.log("Fetching predictions for:", { today, teamA: teamA.name, teamB: teamB.name });

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

    const jsonPred = typeof data.prediction === 'string' ? JSON.parse(data.prediction) : (data.prediction || {});

    const parseConfidence = (conf: string): number => {
      if (!conf) return 70;
      const c = conf.toLowerCase();
      if (c.includes('alta')) return 90;
      if (c.includes('média') || c.includes('media')) return 75;
      if (c.includes('baixa')) return 50;
      return 70;
    };

    return {
      winner: data.main_pick || jsonPred.palpite_principal || "Análise Pendente",
      confidence: parseConfidence(data.confidence || jsonPred.confianca),
      keyFactor: jsonPred.fator_decisivo || "Análise do Banco de Dados",
      detailedAnalysis: jsonPred.analise_curta || "Análise detalhada não disponível.",
      bettingTips: [
        data.over_line || jsonPred.linha_seguranca_over,
        data.under_line || jsonPred.linha_seguranca_under
      ].filter(Boolean),
      sources: data.sources || []
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

