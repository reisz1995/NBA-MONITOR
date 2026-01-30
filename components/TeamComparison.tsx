import React, { useState, useEffect, useMemo } from 'react';
import { Team, MatchupAnalysis, PlayerStat, UnavailablePlayer } from '../types';
import { compareTeams } from '../services/geminiService';

interface TeamComparisonProps {
  teamA: Team;
  teamB: Team;
  playerStats: PlayerStat[];
  unavailablePlayers: any[];
  onClose: () => void;
}

interface StatBarProps {
  label: string;
  valA: number;
  valB: number;
  inverse?: boolean;
  isPercentage?: boolean;
}

const StatBar: React.FC<StatBarProps> = ({ label, valA, valB, inverse = false, isPercentage = false }) => {
  const hasData = valA > 0 || valB > 0;
  const total = valA + valB || 1;
  const percA = hasData ? (valA / total) * 100 : 50;

  const isBetterA = hasData && (inverse ? valA < valB : valA > valB);
  const isBetterB = hasData && (inverse ? valB < valA : valB > valA);

  const formatVal = (v: number) => isPercentage ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
        <span className={isBetterA ? 'text-indigo-400' : ''}>{formatVal(valA)}</span>
        <span>{label}</span>
        <span className={isBetterB ? 'text-indigo-400' : ''}>{formatVal(valB)}</span>
      </div>
      <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden flex">
        <div
          className={`h-full transition-all duration-700 ${isBetterA ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-slate-700'}`}
          style={{ width: `${percA}%` }}
        />
        <div
          className={`h-full transition-all duration-700 ${isBetterB ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-slate-700'}`}
          style={{ width: `${100 - percA}%` }}
        />
      </div>
    </div>
  );
};

const TeamComparison: React.FC<TeamComparisonProps> = ({ teamA, teamB, playerStats, unavailablePlayers, onClose }) => {
  const [analysis, setAnalysis] = useState<MatchupAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper para deduplicar jogadores
  const getUniquePlayers = (players: any[]) => {
    const seen = new Set();
    return players.filter(p => {
      const name = p.player_name || p.nome;
      if (!name) return false;
      const key = name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const injuriesA = useMemo(() => {
    const teamPlayers = unavailablePlayers.filter(p => {
      const pTime = (p.team_name || p.time || p.equipe || '').toLowerCase();
      return pTime.includes(teamA.name.toLowerCase()) || teamA.name.toLowerCase().includes(pTime);
    });
    return getUniquePlayers(teamPlayers);
  }, [unavailablePlayers, teamA.name]);

  const injuriesB = useMemo(() => {
    const teamPlayers = unavailablePlayers.filter(p => {
      const pTime = (p.team_name || p.time || p.equipe || '').toLowerCase();
      return pTime.includes(teamB.name.toLowerCase()) || teamB.name.toLowerCase().includes(pTime);
    });
    return getUniquePlayers(teamPlayers);
  }, [unavailablePlayers, teamB.name]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await compareTeams(teamA, teamB, playerStats, [...injuriesA, ...injuriesB]);
        setAnalysis(result);
      } catch (e: any) {
        console.error("Analysis Error:", e);
        setError(e.message || "Erro ao carregar previsão do banco de dados");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [teamA.id, teamB.id]);

  const getInjuryColor = (p: any) => {
    const status = (p.status || p.injury_status || p.motivo || '').toLowerCase();
    if (status.includes('leve') || status.includes('day') || status.includes('questionable') || status.includes('doubtful')) {
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getMetric = (team: Team, key: 'media_pontos_ataque' | 'media_pontos_defesa' | 'aproveitamento') => {
    return Number(team.stats?.[key] || 0);
  };

  const totalPPG = useMemo(() => {
    return getMetric(teamA, 'media_pontos_ataque') + getMetric(teamB, 'media_pontos_ataque');
  }, [teamA, teamB]);

  const checkIsInjured = (playerName: string, injuries: any[]) => {
    if (!playerName) return false;
    const cleanPlayer = playerName.toLowerCase().trim();
    return injuries.some(inj => {
      const cleanInj = (inj.player_name || inj.nome || '').toLowerCase().trim();
      return cleanInj === cleanPlayer || (cleanInj.length > 4 && cleanPlayer.includes(cleanInj)) || (cleanPlayer.length > 4 && cleanInj.includes(cleanPlayer));
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <h2 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Análise de Banco de Dados 2026</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-12 grid grid-cols-2 gap-4 items-center justify-center py-4 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl md:text-7xl font-black text-slate-800 italic opacity-20 pointer-events-none">VS</div>
              <div className="flex flex-col items-center gap-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 group-hover:bg-indigo-500/30 transition-all"></div>
                  <img src={teamA.logo} className="w-24 h-24 md:w-40 md:h-40 object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 relative z-10" alt="" />
                </div>
                <h3 className="text-xl md:text-4xl font-black text-white italic uppercase tracking-tighter">{teamA.name}</h3>
              </div>
              <div className="flex flex-col items-center gap-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 group-hover:bg-indigo-500/30 transition-all"></div>
                  <img src={teamB.logo} className="w-24 h-24 md:w-40 md:h-40 object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 relative z-10" alt="" />
                </div>
                <h3 className="text-xl md:text-4xl font-black text-white italic uppercase tracking-tighter">{teamB.name}</h3>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8 bg-slate-950/30 p-6 rounded-3xl border border-white/5">
              <div>
                <div className="flex justify-between items-end mb-5 border-b border-indigo-500/20 pb-2">
                  <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Métricas ESPN (Dados 2026)</h4>
                </div>
                <div className="space-y-5">
                  <StatBar
                    label="Pontos Ataque"
                    valA={getMetric(teamA, 'media_pontos_ataque')}
                    valB={getMetric(teamB, 'media_pontos_ataque')}
                  />
                  <StatBar
                    label="Pontos Defesa"
                    valA={getMetric(teamA, 'media_pontos_defesa')}
                    valB={getMetric(teamB, 'media_pontos_defesa')}
                    inverse
                  />
                  <StatBar
                    label="Aproveitamento"
                    valA={getMetric(teamA, 'aproveitamento')}
                    valB={getMetric(teamB, 'aproveitamento')}
                    isPercentage
                  />
                  <StatBar label="V. Temporada" valA={teamA.wins} valB={teamB.wins} />

                  <div className="mt-8 pt-4 border-t border-slate-800/50">
                    <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-3 rounded-xl border border-indigo-500/10 flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Projetado (PPG Combinado)</span>
                      <span className="text-lg font-black text-indigo-400 font-mono tracking-tighter">{totalPPG.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-rose-500 font-black text-[10px] uppercase tracking-widest mb-5 border-b border-rose-500/20 pb-2">Fora do Jogo (Lesões)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {injuriesA.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic">Nenhum desfalque</div>
                    ) : injuriesA.map((p, i) => (
                      <div key={i} className={`text-[10px] p-2 rounded-lg truncate border ${getInjuryColor(p)}`}>
                        {p.player_name || p.nome}
                        <span className="opacity-50 ml-1 text-[8px]">
                          {p.status || p.injury_status || (p.gravidade === 'leve' ? 'D2D' : 'OUT')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {injuriesB.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic text-right">Nenhum desfalque</div>
                    ) : injuriesB.map((p, i) => (
                      <div key={i} className={`text-[10px] p-2 rounded-lg truncate text-right border ${getInjuryColor(p)}`}>
                        {p.player_name || p.nome}
                        <span className="opacity-50 ml-1 text-[8px]">
                          {p.status || (p.gravidade === 'leve' ? 'D2D' : 'OUT')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-5 border-b border-slate-800 pb-2">Jogadores Chave</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {playerStats.filter(p => (p.time || '').toLowerCase().includes(teamA.name.toLowerCase())).slice(0, 4).map(p => {
                      const isInjured = checkIsInjured(p.nome, injuriesA);
                      return (
                        <div key={p.id} className={`text-[10px] p-2 rounded-lg truncate border transition-colors ${isInjured
                          ? 'text-rose-400 bg-rose-900/20 border-rose-500/30 font-bold shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                          : 'text-slate-400 bg-slate-800/50 border-white/5'
                          }`}>
                          {p.nome}
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {playerStats.filter(p => (p.time || '').toLowerCase().includes(teamB.name.toLowerCase())).slice(0, 4).map(p => {
                      const isInjured = checkIsInjured(p.nome, injuriesB);
                      return (
                        <div key={p.id} className={`text-[10px] p-2 rounded-lg truncate text-right border transition-colors ${isInjured
                          ? 'text-rose-400 bg-rose-900/20 border-rose-500/30 font-bold shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                          : 'text-slate-400 bg-slate-800/50 border-white/5'
                          }`}>
                          {p.nome}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 lg:p-10 flex flex-col shadow-inner">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h4 className="text-indigo-400 font-black text-[11px] uppercase tracking-widest">Predição do Sistema 2026</h4>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Sincronizado com a tabela game_predictions do Supabase</span>
                </div>
                {analysis && (
                  <div className="bg-indigo-600 px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                    <span className="text-[10px] font-black text-white">{analysis.confidence}% CONFIANÇA</span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col justify-center items-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-500 text-[10px]">DB</div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Consultando Banco de Dados...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 p-10">
                  <div className="text-rose-500 font-black text-xl mb-2">Erro na Busca</div>
                  <p className="text-slate-400 text-xs">{error}</p>
                </div>
              ) : analysis ? (
                <div className="space-y-8 flex-1 flex flex-col">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <span className="text-emerald-400 font-black text-sm uppercase italic tracking-tighter shrink-0">Palpite Projetado:</span>
                    <span className="text-white font-black text-2xl md:text-3xl underline decoration-indigo-500 decoration-4 underline-offset-8 uppercase italic animate-pulse">{analysis.winner}</span>

                    {analysis.overUnderAlert && (
                      <div className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${analysis.overUnderAlert === 'OVER' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                        ALERTA {analysis.overUnderAlert}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Linha de Segurança:</p>
                      <p className="text-emerald-400 text-sm md:text-base font-bold leading-relaxed">{analysis.safetyMargin || 'Conforme análise do banco'}</p>
                    </div>
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fator Decisivo:</p>
                      <p className="text-indigo-100 text-sm font-bold leading-relaxed truncate group-hover:text-white transition-colors">{analysis.keyFactor}</p>
                    </div>
                  </div>

                  {analysis.bettingTips && analysis.bettingTips.length > 0 && (
                    <div className="p-5 bg-slate-800/30 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        Dicas do Sistema:
                      </p>
                      <ul className="space-y-2">
                        {analysis.bettingTips.map((tip, i) => (
                          <li key={i} className="text-[11px] text-slate-300 flex gap-2">
                            <span className="text-indigo-400">•</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Análise Detalhada:</p>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-medium">
                        {analysis.detailedAnalysis}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamComparison;