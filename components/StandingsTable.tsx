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
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Container com altura padronizada e scroll */}
      <div className="table-container custom-scrollbar max-h-[550px]">
        <div className="min-w-[600px]">
          {/* Header Sticky */}
          <div className="sticky top-0 z-20 grid grid-cols-12 px-6 py-5 bg-slate-900 shadow-md text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Franquia</div>
            <div className="col-span-4 text-right">Ação / Sequência</div>
          </div>

          {/* Body */}
          <div className="divide-y divide-slate-800/50">
            {teams.map((team, index) => {
              const record = team.record || [];
              const isSelected = selectedTeams.includes(team.id);

              return (
                <div
                  key={team.id}
                  className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-slate-700/10 transition-all group ${isSelected ? 'bg-indigo-500/10' : ''}`}
                >
                  <div className="col-span-1 flex items-center gap-3">
                    <button 
                      onClick={() => onToggleSelect(team.id)}
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'border-slate-700 hover:border-indigo-500'
                      }`}
                    >
                      {isSelected && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                    </button>
                    <span className="text-slate-600 font-black text-xs group-hover:text-indigo-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  
                  <div className="col-span-7 flex items-center gap-4">
                    <img 
                      src={team.logo} 
                      alt={team.name}
                      className="w-10 h-10 object-contain drop-shadow-md transition-transform group-hover:scale-110 duration-300 cursor-pointer"
                      onClick={() => onToggleSelect(team.id)}
                    />
                    <div className="flex flex-col cursor-pointer" onClick={() => onToggleSelect(team.id)}>
                      <span className="text-slate-100 font-bold text-sm sm:text-base tracking-tight">{team.name}</span>
                      <span className="text-slate-600 text-[9px] uppercase font-black tracking-widest">
                        {team.conference === 'East' ? 'Leste' : 'Oeste'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="col-span-4 flex justify-end gap-1.5">
                    {record.map((result, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRecord(team.id, i);
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black shadow-lg transition-all border-b-2 active:scale-95 ${
                          result === 'V' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
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
    </div>
  );
};

export default StandingsTable;