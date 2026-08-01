// Vercel serverless function: proxies chat requests to the Anthropic API
// so the API key never reaches the browser. Deploy this repo to Vercel and
// set the ANTHROPIC_API_KEY environment variable in the project settings.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
  }

  const { system, messages } = req.body || {};
  if (!system || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Request must include "system" and a non-empty "messages" array' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1000,
        system,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({ error: `Anthropic API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    return res.status(200).json({ text: text || "Hmm, I'm not sure how to answer that — try another question." });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API: ' + err.message });
  }
}
