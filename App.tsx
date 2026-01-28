
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { INITIAL_TEAMS, INITIAL_ESPN_DATA } from './constants';
import { Team, GameResult, Insight, PlayerStat, ESPNData } from './types';
import StandingsTable from './components/StandingsTable';
import AnalysisPanel from './components/AnalysisPanel';
import TeamComparison from './components/TeamComparison';
import ESPNTable from './components/ESPNTable';
import Scoreboard from './components/Scoreboard';
import UnavailablePlayers from './components/UnavailablePlayers';
import { analyzeStandings } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const { data: dbTeams = [], mutate: mutateTeams, isLoading: loadingTeams } = useSWR('nba/teams', async () => {
    const { data } = await supabase.from('teams').select('*');
    return data || [];
  }, { revalidateOnFocus: false });

  const { data: espnDataRaw = [], mutate: mutateEspn } = useSWR('nba/espn', async () => {
    const { data } = await supabase.from('classificacao_nba').select('*');
    return data || [];
  }, { revalidateOnFocus: false });

  const { data: playerStats = [], mutate: mutatePlayers, isLoading: loadingPlayers } = useSWR('nba/players', async () => {
    const { data } = await supabase.from('nba_jogadores_stats').select('*').order('pontos', { ascending: false });
    return data || [];
  }, { revalidateOnFocus: false });

  const { data: unavailablePlayers = [], mutate: mutateUnavailable, isLoading: loadingUnavailable } = useSWR('nba/unavailable', async () => {
    const { data } = await supabase.from('nba_injured_players').select('*');
    return data || [];
  }, { revalidateOnFocus: false });

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  const getMomentumScore = (record: GameResult[]) => {
    return record.reduce((score, res, idx) => {
      return score + (res === 'V' ? Math.pow(2, idx) : 0);
    }, 0);
  };

  const parseStreakToRecord = (streakStr: string): GameResult[] | null => {
    if (!streakStr) return null;
    const match = streakStr.match(/([WLVD])(\d+)/i);

    if (match) {
      const type = match[1].toUpperCase();
      const count = Math.min(parseInt(match[2], 10), 5);
      const winChar = (type === 'W' || type === 'V') ? 'V' : 'D';
      const lossChar = winChar === 'V' ? 'D' : 'V';

      const record: GameResult[] = new Array(5).fill(lossChar);
      for (let i = 0; i < count; i++) {
        record[4 - i] = winChar;
      }
      return record;
    }

    const chars = streakStr.match(/[VDWL]/g);
    if (chars && chars.length > 0) {
      let results = chars.map(c => (c === 'W' || c === 'V' ? 'V' : 'D')) as GameResult[];
      if (results.length > 5) results = results.slice(-5);
      while (results.length < 5) results.unshift(results[0] === 'V' ? 'D' : 'V');
      return results;
    }

    return null;
  };

  useEffect(() => {
    const channel = supabase
      .channel('nba-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => mutateTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classificacao_nba' }, () => mutateEspn())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mutateTeams, mutateEspn]);

  const espnData = useMemo(() => {
    const baseMap = new Map<string, any>();
    INITIAL_ESPN_DATA.forEach(d => {
      baseMap.set(d.time.toLowerCase(), { ...d });
    });

    espnDataRaw.forEach((d: any) => {
      const name = (d.time || d.nome || d.equipe || '').toLowerCase();
      if (!name) return;

      let targetKey = Array.from(baseMap.keys()).find(key => name.includes(key) || key.includes(name)) || name;
      const existing = baseMap.get(targetKey) || {};

      baseMap.set(targetKey, {
        ...existing,
        ...d,
        vitorias: d.v ?? d.vitorias ?? d.V ?? d.wins ?? existing.vitorias,
        derrotas: d.d ?? d.derrotas ?? d.D ?? d.losses ?? existing.derrotas,
        media_pontos_ataque: d.pts ?? d.media_pontos_ataque ?? d.pts_ataque ?? d.PTS_ATAQUE ?? existing.media_pontos_ataque,
        media_pontos_defesa: d.pts_contra ?? d.media_pontos_defesa ?? d.pts_defesa ?? d.PTS_DEFESA ?? existing.media_pontos_defesa,
        aproveitamento: d.pct_vit ?? d.aproveitamento ?? d.pct ?? d.PCT ?? existing.aproveitamento,
        ultimos_5: d.ultimos_5 || d.last_5 || d.strk || d.streak || existing.ultimos_5
      });
    });

    return Array.from(baseMap.values()).map(d => ({
      ...d,
      time: d.time || d.nome || d.equipe,
      vitorias: Number(d.vitorias ?? 0),
      derrotas: Number(d.derrotas ?? 0),
      media_pontos_ataque: Number(d.media_pontos_ataque || 0),
      media_pontos_defesa: Number(d.media_pontos_defesa || 0),
      aproveitamento: Number(d.aproveitamento || 0),
      ultimos_5: String(d.ultimos_5 || '')
    } as ESPNData));
  }, [espnDataRaw]);

  const mergedTeams = useMemo(() => {
    // Agora a base é o dbTeams (Supabase)
    return dbTeams.map((dbTeam: any) => {
      // 1. Encontrar o time correspondente nas constantes (por NOME) para Logo e Nome Oficial
      // Isso é necessário porque os IDs do DB podem não bater com os das constantes
      const dbNameClean = (dbTeam.name || dbTeam.nome || '').toLowerCase();
      const initial = INITIAL_TEAMS.find(t => {
        const initNameClean = t.name.toLowerCase();
        return dbNameClean.includes(initNameClean) || initNameClean.includes(dbNameClean);
      }) || {
        name: dbTeam.name || dbTeam.nome || 'Time Desconhecido',
        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/nba.png',
        record: [],
        wins: 0,
        losses: 0,
        conference: dbTeam.conference || 'East'
      };

      // 2. Encontrar dados da ESPN (apenas para métricas extras como PPG)
      const espnStats = espnData.find(e => {
        const teamName = (e.time || '').toLowerCase();
        const initialName = initial.name.toLowerCase();
        return teamName === initialName || teamName.includes(initialName) || initialName.includes(teamName);
      });

      // 3. PRIORIDADE ABSOLUTA: Supabase (dados reais)
      // Se o banco tiver dados, usamos o do banco. Fallback para ESPN apenas se nulo.
      const currentWins = dbTeam.wins !== undefined && dbTeam.wins !== null ? dbTeam.wins : (espnStats?.vitorias ?? initial.wins);
      const currentLosses = dbTeam.losses !== undefined && dbTeam.losses !== null ? dbTeam.losses : (espnStats?.derrotas ?? initial.losses);

      // --- RECORD (ÚLTIMOS 5 JOGOS) ---
      let currentRecord: GameResult[] = [];

      // PRIORIDADE 1: Record real no banco
      if (dbTeam?.record && Array.isArray(dbTeam.record) && dbTeam.record.length > 0) {
        currentRecord = dbTeam.record;
      }
      // PRIORIDADE 2: Fallback usando string da ESPN
      else if (espnStats?.ultimos_5) {
        const parsedRecord = parseStreakToRecord(espnStats.ultimos_5);
        if (parsedRecord) currentRecord = parsedRecord;
      }
      // PRIORIDADE 3: Inicial
      else {
        currentRecord = initial.record || [];
      }

      return {
        ...dbTeam,
        ...initial, // Sobrescreve Nome e Logo para garantir consistência visual baseada nas constantes
        name: initial.name,
        logo: initial.logo,
        record: currentRecord,
        wins: currentWins,
        losses: currentLosses,
        espnData: espnStats,
        stats: espnStats ? {
          media_pontos_ataque: espnStats.media_pontos_ataque,
          media_pontos_defesa: espnStats.media_pontos_defesa,
          aproveitamento: espnStats.aproveitamento,
          ultimos_5_espn: espnStats.ultimos_5
        } : undefined
      };
    });
  }, [dbTeams, espnData]);

  const sortedTeams = useMemo(() => {
    return [...mergedTeams].sort((a, b) => {
      const scoreA = getMomentumScore(a.record);
      const scoreB = getMomentumScore(b.record);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.stats?.aproveitamento || 0) - (a.stats?.aproveitamento || 0);
    });
  }, [mergedTeams]);

  const handleToggleRecord = useCallback(async (teamId: number, recordIndex: number) => {
    const team = mergedTeams.find(t => t.id === teamId);
    if (!team) return;
    const oldRecord = [...(team.record || [])] as GameResult[];
    const wasWin = oldRecord[recordIndex] === 'V';
    const newRecord = [...oldRecord];
    newRecord[recordIndex] = wasWin ? 'D' : 'V';

    mutateTeams((prev: any) => {
      return prev?.map((t: any) => t.id === teamId ? { ...t, record: newRecord } : t) || [];
    }, false);

    try {
      await supabase.from('teams').upsert({ id: teamId, record: newRecord });
    } catch (err) {
      console.error("Erro ao salvar record:", err);
    }
  }, [mergedTeams, mutateTeams]);

  const toggleTeamSelection = (id: number) => {
    setSelectedTeamIds(prev => {
      if (prev.includes(id)) return prev.filter(tid => tid !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparisonTeams = useMemo(() => {
    if (selectedTeamIds.length !== 2) return null;
    const tA = mergedTeams.find(t => t.id === selectedTeamIds[0]);
    const tB = mergedTeams.find(t => t.id === selectedTeamIds[1]);
    return tA && tB ? { teamA: tA, teamB: tB } : null;
  }, [selectedTeamIds, mergedTeams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-orange-500/30">
      <header className="sticky top-0 z-50 bg-[#1e293b] border-b-2 border-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.1)] px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Logo Container */}
            <div className="relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 shrink-0">
              {/* Crown */}
              <svg className="w-8 h-8 md:w-10 md:h-10 text-orange-500 absolute -top-1 md:-top-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l2-4 3 3 4-3 2 4 3-5 1 12H4l1-12z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 18h16" />
              </svg>
              {/* Ball */}
              <svg className="w-10 h-10 md:w-12 md:h-12 text-orange-500 mt-3 md:mt-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3c0 6-2 9-2 9s2 3 2 9" />
                <path d="M3 12h18" />
                <path d="M12 3a15 15 0 0 1 0 18" opacity="0.5" />
                <path d="M12 21a15 15 0 0 0 0-18" opacity="0.5" />
                <path d="M19.5 7a9 9 0 0 0-7.5 5" />
                <path d="M4.5 7a9 9 0 0 1 7.5 5" />
              </svg>
            </div>

            <div className="flex flex-col -space-y-0.5 md:-space-y-1">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-orange-500 uppercase font-['Inter'] leading-none drop-shadow-md">
                NBA MONITOR
              </h1>
              <div className="flex items-center gap-2">
                {/* Runner Icon */}
                <svg className="w-3 h-3 md:w-4 md:h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
                </svg>
                <span className="text-[10px] md:text-xs font-bold text-rose-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                  Live Scores & Stats 🏆
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedTeamIds.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 ml-2 animate-in fade-in slide-in-from-right-4">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{selectedTeamIds.length} / 2 Times</span>
                <button onClick={() => setSelectedTeamIds([])} className="text-orange-400 hover:text-white text-xs font-bold">✕</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="px-2">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic uppercase border-l-4 border-orange-500 pl-4">
                Power Ranking 2026
              </h2>
              <p className="text-slate-500 text-sm mt-2 pl-5">
                Ordenado por: <span className="text-orange-400 font-bold underline decoration-2 underline-offset-4">Momento Recente</span> seguido de Vitórias Totais.
              </p>
            </div>

            {loadingTeams && dbTeams.length === 0 ? (
              <div className="h-64 bg-slate-800/20 animate-pulse rounded-2xl border border-slate-800" />
            ) : (
              <>
                <StandingsTable
                  teams={sortedTeams}
                  selectedTeams={selectedTeamIds}
                  onToggleRecord={handleToggleRecord}
                  onToggleSelect={toggleTeamSelection}
                />
                <ESPNTable teams={sortedTeams} selectedTeams={selectedTeamIds} />
              </>
            )}
          </div>

          <aside className="lg:col-span-1 h-fit lg:sticky lg:top-24 space-y-6">
            <Scoreboard
              playerStats={playerStats}
              loading={loadingPlayers}
              teams={mergedTeams}
              onRefresh={() => mutatePlayers()}
            />

            <UnavailablePlayers
              players={unavailablePlayers}
              loading={loadingUnavailable}
              teams={mergedTeams}
              onRefresh={() => mutateUnavailable()}
            />

            <AnalysisPanel
              insights={insights}
              loading={loadingInsights}
              onRefresh={async () => {
                setLoadingInsights(true);
                try {
                  const results = await analyzeStandings(sortedTeams);
                  setInsights(results);
                } catch (e) { console.error(e); }
                setLoadingInsights(false);
              }}
            />
          </aside>
        </div>
      </main>

      {comparisonTeams && (
        <TeamComparison
          teamA={comparisonTeams.teamA}
          teamB={comparisonTeams.teamB}
          playerStats={playerStats}
          unavailablePlayers={unavailablePlayers}
          onClose={() => setSelectedTeamIds([])}
        />
      )}
    </div>
  );
};

export default App;
