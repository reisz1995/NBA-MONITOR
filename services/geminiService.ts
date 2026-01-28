
import { Team, Insight, MatchupAnalysis, PlayerStat } from "../types";

const cleanJsonOutput = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  clean = clean.replace(/\s*```$/, "");
  return clean;
};

export const analyzeStandings = async (teams: Team[]): Promise<Insight[]> => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teams })
    });

    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    return data.insights || data;
  } catch (error) {
    console.error("Analysis Error:", error);
    return [];
  }
};

export const compareTeams = async (teamA: Team, teamB: Team, playerStats: PlayerStat[], injuries: any[] = []): Promise<MatchupAnalysis> => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `analysis_v2_${teamA.id}_${teamB.id}_${today}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { }

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamA, teamB, playerStats, injuries })
    });

    if (!response.ok) throw new Error("API request failed");

    const analysis = await response.json();

    try {
      localStorage.setItem(cacheKey, JSON.stringify(analysis));
    } catch (e) { }

    return analysis;
  } catch (error: any) {
    console.error("Comparison Error:", error);
    throw error;
  }
};

// Fallback logic is now handled server-side if implemented there.
export async function callGroqFallback(prompt: string, systemInstruction: string, schema?: any): Promise<any> {
  console.warn("Groq fallback should be called from the server-side API.");
  return { error: "Client-side fallback disabled for security" };
}

