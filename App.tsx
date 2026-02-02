
import React, { useState, useCallback, useMemo } from 'react';
import { GameResult } from './types';
import StandingsTable from './components/StandingsTable';
import TeamComparison from './components/TeamComparison';
import ESPNTable from './components/ESPNTable';
import Scoreboard from './components/Scoreboard';
import UnavailablePlayers from './components/UnavailablePlayers';
import Header from './components/Header';
import { useNBAData } from './hooks/useNBAData';
import { supabase } from './lib/supabase';
import { getMomentumScore } from './lib/nbaUtils';

const App: React.FC = () => {
  const {
    mergedTeams,
    playerStats,
    unavailablePlayers,
    loading,
    mutateTeams,
    mutatePlayers,
    mutateUnavailable
  } = useNBAData();

  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

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
      <Header
        selectedCount={selectedTeamIds.length}
        onClearSelection={() => setSelectedTeamIds([])}
      />

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

            {loading && mergedTeams.length === 0 ? (
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
              loading={loading}
              teams={mergedTeams}
              onRefresh={() => mutatePlayers()}
            />

            <UnavailablePlayers
              players={unavailablePlayers}
              loading={loading}
              teams={mergedTeams}
              onRefresh={() => mutateUnavailable()}
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
