import React, { useState } from 'react';
import { PlayerStat, Team } from '../types';
import { supabase } from '../lib/supabase';

interface ScoreboardProps {
  playerStats: PlayerStat[];
  loading: boolean;
  teams: Team[];
  onRefresh: () => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ playerStats, loading, teams, onRefresh }) => {
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getTeamLogo = (teamName: string) => {
    if (!teamName) return 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png';
    const cleanName = teamName.toLowerCase();
    const team = teams.find(t => 
      t.name.toLowerCase() === cleanName || 
      cleanName.includes(t.name.toLowerCase()) ||
      t.name.toLowerCase().includes(cleanName)
    );
    return team?.logo || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png';
  };

  const seedPlayers = async () => {
    setSeeding(true);
    const mockPlayers = [
      { nome: 'Luka Doncic', time: 'Los Angeles Lakers', pontos: 33.59, rebotes: 7.71, assistencias: 8.68, posicao: 'Guard' },
      { nome: 'Shai Gilgeous-Alexander', time: 'Oklahoma City Thunder', pontos: 31.80, rebotes: 4.41, assistencias: 6.24, posicao: 'Guard' },
      { nome: 'Nikola Jokic', time: 'Denver Nuggets', pontos: 29.62, rebotes: 12.15, assistencias: 10.96, posicao: 'Center' },
      { nome: 'Giannis Antetokounmpo', time: 'Milwaukee Bucks', pontos: 28.77, rebotes: 9.51, assistencias: 5.48, posicao: 'Forward' },
      { nome: 'Tyrese Maxey', time: 'Philadelphia 76ers', pontos: 30.26, rebotes: 4.42, assistencias: 6.68, posicao: 'Guard' },
      { nome: 'Stephen Curry', time: 'Golden State Warriors', pontos: 27.63, rebotes: 3.75, assistencias: 4.93, posicao: 'Guard' },
    ];
    try {
      const { error } = await supabase.from('nba_jogadores_stats').insert(mockPlayers);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const filteredStats = playerStats.filter(player => 
    player.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.time.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl">
      <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0 gap-2">
        <div>
          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            Estatísticas
          </h2>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-tighter">Temporada Regular 2026</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950/50 border border-slate-700 text-[10px] text-white px-3 py-1.5 rounded-lg w-28 focus:w-36 md:w-32 md:focus:w-40 transition-all focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 font-medium"
            />
            <svg className="w-3 h-3 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-30"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo com altura fixa e scroll */}
      <div className="overflow-auto custom-scrollbar max-h-[450px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-950 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800 shadow-sm">
              <th className="px-4 py-3">Jogador</th>
              <th className="px-2 py-3 text-center">PTS</th>
              <th className="px-2 py-3 text-center">REB</th>
              <th className="px-2 py-3 text-center">AST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {loading && playerStats.length === 0 ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse"><td colSpan={4} className="h-12 bg-slate-800/20"></td></tr>
              ))
            ) : filteredStats.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-600 text-[10px] uppercase font-black tracking-widest">
                  {playerStats.length === 0 ? (
                     <span className="cursor-pointer hover:text-indigo-400" onClick={seedPlayers}>Sem dados. Clique aqui.</span>
                  ) : (
                     "Nenhum resultado encontrado"
                  )}
                </td>
              </tr>
            ) : (
              filteredStats.map((player, idx) => (
                <tr key={player.id || idx} className="hover:bg-indigo-500/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={getTeamLogo(player.time)} className="w-6 h-6 object-contain" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-100 truncate">{player.nome}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{player.time}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-xs font-black text-indigo-400 font-mono">{Number(player.pontos).toFixed(1)}</td>
                  <td className="px-2 py-3 text-center text-xs font-bold text-slate-400 font-mono">{Number(player.rebotes).toFixed(1)}</td>
                  <td className="px-2 py-3 text-center text-xs font-bold text-slate-400 font-mono">{Number(player.assistencias).toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scoreboard;