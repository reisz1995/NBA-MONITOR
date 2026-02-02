import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { INITIAL_TEAMS, INITIAL_ESPN_DATA } from '../constants';
import { Team, ESPNData, GameResult } from '../types';
import { parseStreakToRecord } from '../lib/nbaUtils';

export const useNBAData = () => {
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

    // Real-time Subscriptions
    useEffect(() => {
        const channel = supabase
            .channel('nba-realtime-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => mutateTeams())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classificacao_nba' }, () => mutateEspn())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [mutateTeams, mutateEspn]);

    // ESPN Data Normalization
    const espnData = useMemo(() => {
        const baseMap = new Map<string, any>();
        INITIAL_ESPN_DATA.forEach(d => {
            baseMap.set(d.time.toLowerCase(), { ...d });
        });

        espnDataRaw.forEach((d: any) => {
            const name = (d.time || d.nome || d.equipe || '').toLowerCase();
            if (!name) return;

            const targetKey = Array.from(baseMap.keys()).find(key => name.includes(key) || key.includes(name)) || name;
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

    // Merge Logics
    const mergedTeams = useMemo(() => {
        return dbTeams.map((dbTeam: any) => {
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

            const espnStats = espnData.find(e => {
                const teamName = (e.time || '').toLowerCase();
                const initialName = initial.name.toLowerCase();
                return teamName === initialName || teamName.includes(initialName) || initialName.includes(teamName);
            });

            const currentWins = dbTeam.wins !== undefined && dbTeam.wins !== null ? dbTeam.wins : (espnStats?.vitorias ?? initial.wins);
            const currentLosses = dbTeam.losses !== undefined && dbTeam.losses !== null ? dbTeam.losses : (espnStats?.derrotas ?? initial.losses);

            let currentRecord: GameResult[] = [];
            if (dbTeam?.record && Array.isArray(dbTeam.record) && dbTeam.record.length > 0) {
                currentRecord = dbTeam.record;
            } else if (espnStats?.ultimos_5) {
                const parsedRecord = parseStreakToRecord(espnStats.ultimos_5);
                if (parsedRecord) currentRecord = parsedRecord;
            } else {
                currentRecord = initial.record || [];
            }

            return {
                ...dbTeam,
                ...initial,
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
            } as Team;
        });
    }, [dbTeams, espnData]);

    return {
        mergedTeams,
        playerStats,
        unavailablePlayers,
        loading: loadingTeams || loadingPlayers || loadingUnavailable,
        mutateTeams,
        mutatePlayers,
        mutateUnavailable
    };
};
