import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { callGroqFallback } from '../services/geminiService';

// Load .env.local for tests
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

describe('Groq Fallback Service', () => {
    it('should return a valid JSON response from Groq', async () => {
        // Skip if no API key
        if (!process.env.GROQ_API_KEY) {
            console.warn("Skipping Groq test: GROQ_API_KEY not found");
            return;
        }

        const prompt = "Teste simples: Quem é melhor, Lakers ou Celtics?";
        const system = "Você é um especialista em NBA. Responda em JSON.";

        try {
            const result = await callGroqFallback(prompt, system, true);
            console.log("Groq Result:", result);
            expect(result).toBeDefined();
            // Since we requested JSON, it should be an object
            expect(typeof result).toBe('object');
        } catch (error) {
            console.error("Groq Test Failed:", error);
            throw error;
        }
    });
});

