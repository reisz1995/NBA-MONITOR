import React from 'react';

interface HeaderProps {
    selectedCount: number;
    onClearSelection: () => void;
}

const Header: React.FC<HeaderProps> = ({ selectedCount, onClearSelection }) => {
    return (
        <header className="sticky top-0 z-50 glass-panel border-b border-orange-500/30 shadow-2xl px-4 py-2 md:px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-5">
                    {/* Logo Premium Integrado */}
                    <div className="relative group cursor-pointer">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative flex items-center justify-center w-11 h-11 md:w-13 md:h-13 bg-slate-900 rounded-full border border-slate-800 shadow-inner">
                            <svg className="w-8 h-8 md:w-9 md:h-9 text-orange-500 transform transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                {/* Basketball subtle texture */}
                                <circle cx="12" cy="12" r="9" className="opacity-20" />
                                <path d="M12 3c0 6-2 9-2 9s2 3 2 9" className="opacity-20" />
                                <path d="M3 12h18" className="opacity-20" />

                                {/* Crown integrated with ball */}
                                <path d="M7 14l2-3 3 2 3-2 2 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-orange-400" />
                                <path d="M12 3a9 9 0 0 1 0 18" strokeWidth="1" opacity="0.8" />
                                <path d="M12 3a9 9 0 0 0 0 18" strokeWidth="1" opacity="0.8" />
                                <circle cx="12" cy="12" r="9" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex flex-col -space-y-0.5 md:-space-y-1">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white uppercase font-['Inter'] leading-none">
                            NBA <span className="text-orange-500">MONITOR</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                                Live Intelligence & Analytics
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30 animate-fade-in">
                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{selectedCount} / 2 Ativos</span>
                            <button
                                onClick={onClearSelection}
                                className="text-orange-400 hover:text-white transition-colors"
                                aria-label="Clear selection"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
