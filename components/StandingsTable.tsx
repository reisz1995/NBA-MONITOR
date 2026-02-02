import React from 'react';
import { Team } from '../types';

interface StandingsTableProps {
  teams: Team[];
  selectedTeams: number[];
  onToggleRecord: (teamId: number, recordIndex: number) => void;
  onToggleSelect: (teamId: number) => void;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ teams, selectedTeams, onToggleRecord, onToggleSelect }) => {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/5">
      {/* Container com altura padronizada e scroll */}
      <div className="table-container custom-scrollbar max-h-[480px]">
        <div className="min-w-[500px]">
          {/* Header Sticky */}
          <div className="sticky top-0 z-20 grid grid-cols-12 px-5 py-3.5 bg-slate-900/90 backdrop-blur-md text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Franquia</div>
            <div className="col-span-4 text-right">Momentum Recente</div>
          </div>

          {/* Body */}
          <div className="divide-y divide-white/5">
            {teams.map((team, index) => {
              const record = team.record || [];
              const isSelected = selectedTeams.includes(team.id);

              return (
                <div
                  key={team.id}
                  className={`grid grid-cols-12 items-center px-5 py-2.5 hover:bg-white/5 transition-all group ${isSelected ? 'bg-orange-500/10' : ''}`}
                >
                  <div className="col-span-1 flex items-center gap-2.5">
                    <button
                      onClick={() => onToggleSelect(team.id)}
                      className={`w-3.5 h-3.5 rounded-md border transition-all flex items-center justify-center ${isSelected
                        ? 'bg-orange-500 border-orange-400 text-white'
                        : 'border-slate-700 hover:border-orange-500/50'
                        }`}
                    >
                      {isSelected && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className="text-slate-600 font-bold text-[10px] group-hover:text-orange-400/70 transition-colors">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="col-span-7 flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-8 h-8 md:w-9 md:h-9 object-contain drop-shadow-xl transition-transform group-hover:scale-110 duration-500 cursor-pointer relative z-10"
                        onClick={() => onToggleSelect(team.id)}
                      />
                    </div>
                    <div className="flex flex-col cursor-pointer" onClick={() => onToggleSelect(team.id)}>
                      <span className="text-slate-100 font-bold text-sm tracking-tight leading-tight">{team.name}</span>
                      <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest hidden sm:block">
                        {team.conference === 'East' ? 'Leste' : 'Oeste'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-4 flex justify-end gap-1">
                    {record.map((result, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRecord(team.id, i);
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[9px] font-black transition-all border shadow-sm active:scale-90 ${result === 'V'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                      >
                        {result}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="bg-slate-900/50 px-4 py-2 border-t border-white/5 flex justify-between items-center">
        <span className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em]">Deslize para ver mais →</span>
        <span className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em]">{teams.length} Franquias</span>
      </div>
    </div>
  );
};

export default StandingsTable;