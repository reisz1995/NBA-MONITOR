import React, { useState, useMemo } from 'react';
import { Team } from '../types';
import { supabase } from '../lib/supabase';

interface UnavailablePlayersProps {
  players: any[];
  loading: boolean;
  teams: Team[];
  onRefresh: () => void;
}

const UnavailablePlayers: React.FC<UnavailablePlayersProps> = ({ players, loading, teams, onRefresh }) => {
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra jogadores duplicados pelo nome
  const uniquePlayers = useMemo(() => {
    const seen = new Set();
    return players.filter(p => {
      const name = p.player_name || p.nome;
      if (!name) return false;
      const key = name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return uniquePlayers.filter(p => {
       const search = searchQuery.toLowerCase();
       const name = (p.player_name || p.nome || '').toLowerCase();
       const team = (p.team_name || p.time || '').toLowerCase();
       return name.includes(search) || team.includes(search);
    });
  }, [uniquePlayers, searchQuery]);

  const getPlayerData = (p: any) => ({
    nome: p.player_name || p.nome || 'Jogador',
    time: p.team_name || p.time || 'N/A',
    motivo: p.injury_description || p.motivo || 'Lesão',
    retorno: p.retorno_previsto || 'TBD',
    gravidade: (p.injury_status || p.gravidade || 'moderada').toLowerCase()
  });

  const getTeamLogo = (teamName: string) => {
    const team = teams.find(t => 
      t.name.toLowerCase().includes(teamName.toLowerCase()) || 
      teamName.toLowerCase().includes(t.name.toLowerCase())
    );
    return team?.logo || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png';
  };

  const seedUnavailable = async () => {
    setSeeding(true);
    const mockData = [
      { player_name: 'Joel Embiid', team_name: '76ers', injury_description: 'Cirurgia no Joelho', retorno_previsto: 'Abril/2026', injury_status: 'grave' },
      { player_name: 'Ja Morant', team_name: 'Grizzlies', injury_description: 'Dores no Ombro', retorno_previsto: 'Day-to-day', injury_status: 'leve' },
      { player_name: 'Kawhi Leonard', team_name: 'Clippers', injury_description: 'Inflamação', retorno_previsto: 'Indeterminado', injury_status: 'grave' }
    ];
    try {
      const { error } = await supabase.from('nba_injured_players').insert(mockData);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="bg-[#0b0e14]/80 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-2xl">
      <div className="p-4 md:p-5 border-b border-slate-800/50 flex items-center justify-between shrink-0 gap-2">
        <div>
          <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
            Fora do Jogo
          </h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">Relatório de Desfalques 2026</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950/50 border border-slate-700 text-[10px] text-white px-3 py-1.5 rounded-lg w-28 focus:w-36 md:w-32 md:focus:w-40 transition-all focus:outline-none focus:border-rose-500 placeholder:text-slate-600 font-medium"
            />
            <svg className="w-3 h-3 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button onClick={onRefresh} className="text-slate-500 hover:text-rose-400 transition-all">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo com altura fixa e scroll */}
      <div className="overflow-auto custom-scrollbar max-h-[450px] bg-slate-950/20">
        {filteredPlayers.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">
              {uniquePlayers.length === 0 ? "Sem registros" : "Nenhum resultado"}
            </span>
            {uniquePlayers.length === 0 && (
              <button onClick={seedUnavailable} className="text-[9px] font-black text-rose-500 border border-rose-500/20 px-4 py-2 rounded-full uppercase hover:bg-rose-500/10">Simular</button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {filteredPlayers.map((p, idx) => {
              const d = getPlayerData(p);
              return (
                <div key={p.id || idx} className="p-4 flex items-center gap-4 hover:bg-rose-500/[0.03] transition-colors group">
                  <img src={getTeamLogo(d.time)} className="w-8 h-8 object-contain shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-xs font-black text-slate-100 truncate">{d.nome}</h3>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase shrink-0 ${
                        d.gravidade === 'grave' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>{d.gravidade}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span className="truncate max-w-[120px]">{d.motivo}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400">{d.retorno}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnavailablePlayers;