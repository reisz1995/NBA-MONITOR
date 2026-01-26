
export type GameResult = 'V' | 'D';

export interface Team {
  id: number;
  name: string;
  logo: string;
  record: GameResult[];
  wins: number;
  losses: number;
  conference: 'East' | 'West';
  stats?: {
    media_pontos_ataque: number;
    media_pontos_defesa: number;
    aproveitamento: number;
    ultimos_5_espn?: string;
  };
  espnData?: ESPNData;
}

export interface PlayerStat {
  id: number;
  nome: string;
  time: string;
  posicao?: string;
  pontos: number;
  rebotes: number;
  assistencias: number;
  min?: string;
  created_at?: string;
}

export interface UnavailablePlayer {
  id: number;
  nome: string;
  time: string;
  motivo: string;
  retorno_previsto: string;
  gravidade: 'leve' | 'moderada' | 'grave';
}

export interface Source {
  title: string;
  url: string;
}

export interface Insight {
  title: string;
  content: string;
  type: 'prediction' | 'analysis' | 'warning';
  sources?: Source[];
}

export interface MatchupAnalysis {
  winner: string;
  confidence: number;
  keyFactor: string;
  detailedAnalysis: string;
  sources?: Source[];
}

export interface ESPNData {
  id: number;
  time?: string;
  ultimos_5?: string;
  strk?: string;
  streak?: string;
  last_5?: string;
  media_pontos_ataque?: number;
  media_pontos_defesa?: number;
  aproveitamento?: number;
  [key: string]: any;
}

export interface GameScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  date: string;
  winnerLeader?: string;
  loserLeader?: string;
}
