import { GameResult } from '../types';

/**
 * Calculates a momentum score based on the last 5 games.
 * Wins closer to the present have higher weight (exponential).
 */
export const getMomentumScore = (record: GameResult[]): number => {
    return record.reduce((score, res, idx) => {
        return score + (res === 'V' ? Math.pow(2, idx) : 0);
    }, 0);
};

/**
 * Parses a streak string (e.g., 'W4', 'V-V-D-V-D') into a GameResult array of size 5.
 */
export const parseStreakToRecord = (streakStr: string): GameResult[] | null => {
    if (!streakStr) return null;

    // Format 1: 'W4' or 'V2'
    const match = streakStr.match(/([WLVD])(\d+)/i);
    if (match) {
        const type = match[1].toUpperCase();
        const count = Math.min(parseInt(match[2], 10), 5);
        const winChar: GameResult = (type === 'W' || type === 'V') ? 'V' : 'D';
        const lossChar: GameResult = winChar === 'V' ? 'D' : 'V';

        const record: GameResult[] = new Array(5).fill(lossChar);
        for (let i = 0; i < count; i++) {
            record[4 - i] = winChar;
        }
        return record;
    }

    // Format 2: 'V-V-D-V-D' or 'W-W-L-W-L'
    const chars = streakStr.match(/[VDWL]/g);
    if (chars && chars.length > 0) {
        let results = chars.map(c => (c === 'W' || c === 'V' ? 'V' : 'D')) as GameResult[];
        if (results.length > 5) results = results.slice(-5);
        while (results.length < 5) {
            // Fill with opposite of the first available result or 'D' as baseline
            const padChar: GameResult = results[0] === 'V' ? 'D' : 'V';
            results.unshift(padChar);
        }
        return results;
    }

    return null;
};
