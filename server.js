const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');

// Load .env from project root if present
dotenv.config({ path: path.resolve(__dirname, '.env') });

const webhookHandler = require('./webhookHandler');
const axios = require('axios');

const app = express();

// Parse JSON bodies
app.use(bodyParser.json({ limit: '1mb' }));

// POST /webhook - GitHub App webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      // payload missing
      return res.status(400).json({ ok: false, error: 'Missing webhook payload' });
    }

    // Pass payload to modular handler and return its structured response
    const result = await webhookHandler(payload);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
});

// Temporary test endpoint for Gemini 2.5 Flash
app.get('/test-gemini', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY' });

    const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta2';
    const MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';

    const url = `${GEMINI_API_URL}/${MODEL}:generateText`;
    const prompt = { text: 'Say hello from Gemini' };
    const body = { prompt, temperature: 0.0, maxOutputTokens: 256 };

    const headers = {
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const apiRes = await axios.post(url, body, { headers, timeout: 10000 });

    return res.status(200).json({ ok: true, result: apiRes.data });
  } catch (err) {
    console.error('test-gemini error:', err && err.response ? err.response.data || err.response.statusText : err.message || err);
    const message = err && err.response && err.response.data ? err.response.data : (err && err.message ? err.message : String(err));
    return res.status(500).json({ ok: false, error: message });
  }
});

// Export the app for testing or server startup
module.exports = app;

// If this file is run directly, start the server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`GitHub App webhook server listening on port ${port}`);
  });
}
