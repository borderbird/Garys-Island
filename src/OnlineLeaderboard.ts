export interface ScoreEntry {
    name: string;
    score: number;
}

// We use a free, open JSON bucket for the prototype.
// For production, this should be replaced with Firebase, Supabase, or LootLocker.
const LEADERBOARD_API_URL = 'https://api.restful-api.dev/objects/ff8081819ff5b11001a0112056f83a97';

export class OnlineLeaderboard {
    static async getScores(): Promise<ScoreEntry[]> {
        try {
            const response = await fetch(LEADERBOARD_API_URL);
            if (!response.ok) return [];
            const data = await response.json();
            return data?.data?.scores || [];
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
            return [];
        }
    }

    static async submitScore(name: string, score: number): Promise<ScoreEntry[]> {
        try {
            // Fetch current scores
            const currentScores = await this.getScores();
            
            // Add new score
            currentScores.push({ name, score });
            
            // Sort by score descending
            currentScores.sort((a, b) => b.score - a.score);
            
            // Keep only top 10
            const top10 = currentScores.slice(0, 10);
            
            // Save back
            await fetch(LEADERBOARD_API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: { scores: top10 }
                })
            });
            
            return top10;
        } catch (error) {
            console.error("Failed to submit score:", error);
            return [];
        }
    }
}
