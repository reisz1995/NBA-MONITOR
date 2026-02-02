import React from 'react';

interface HeaderProps {
    selectedCount: number;
    onClearSelection: () => void;
}

const Header: React.FC<HeaderProps> = ({ selectedCount, onClearSelection }) => {
    return (
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
                    {selectedCount > 0 && (
                        <div className="hidden md:flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 ml-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{selectedCount} / 2 Teams</span>
                            <button
                                onClick={onClearSelection}
                                className="text-orange-400 hover:text-white text-xs font-bold"
                                aria-label="Clear selection"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
