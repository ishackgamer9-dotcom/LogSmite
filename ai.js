const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in environment');
}

// Initialize Google GenAI client with API key auth
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generate release notes markdown using Google Gemini via @google/genai SDK.
 * @param {{repoName: string, commits: Array<{sha?:string,message:string}>, changedFiles: string[]}} input
 * @returns {Promise<string>} Markdown string
 */
async function generateReleaseNotes(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid input to generateReleaseNotes');

  const { repoName, commits = [], changedFiles = [] } = input;
  if (!repoName) throw new Error('Missing repoName in input');

  // Build a concise prompt instructing the model to return Markdown only.
  const lines = [];
  lines.push('You are a release notes generator. Produce MARKDOWN ONLY.');
  lines.push('Include the following sections in this order:');
  lines.push('1. Executive Summary\n2. Features\n3. Bug Fixes\n4. Improvements\n5. Refactoring\n6. Documentation');
  lines.push('Each section should contain short bullet points summarizing relevant commits and changed files.');
  lines.push(`Repository: ${repoName}`);

  if (commits && commits.length) {
    lines.push('\nCommits:');
    for (const c of commits) {
      const sha = c.sha ? ` (${String(c.sha).slice(0, 7)})` : '';
      lines.push(`- ${c.message}${sha}`);
    }
  }

  if (changedFiles && changedFiles.length) {
    lines.push('\nChanged files:');
    for (const f of changedFiles) lines.push(`- ${f}`);
  }

  const prompt = lines.join('\n');

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    // Prefer the convenience .text getter when available
    if (response && typeof response.text === 'string' && response.text.trim()) {
      return response.text.trim();
    }

    // Fallback: inspect candidates/contents
    if (response && response.candidates && response.candidates.length > 0) {
      const cand = response.candidates[0];
      const content = cand.content || cand.output || cand.text;
      if (!content) return '';
      if (typeof content === 'string') return content.trim();
      if (Array.isArray(content.parts)) {
        return content.parts.map(p => (p && (p.text || p) ? (p.text || p) : '')).join('').trim();
      }
      return String(content).trim();
    }

    throw new Error('Unexpected response from GenAI SDK');
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Failed to generate release notes: ${msg}`);
  }
}

module.exports = { generateReleaseNotes };
