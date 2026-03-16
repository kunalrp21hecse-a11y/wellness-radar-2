export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trend, redditSignal, googleTrendsScore, youtubeScore } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a brutally sharp D2C market analyst for Indian wellness in 2026. You have deep knowledge of what makes trends last vs fade in India.

Analyze this wellness trend for the Indian D2C market:

Trend: "${trend.name}" — ${trend.desc}

Live signals collected:
- Google Trends score (India, last 90 days): ${googleTrendsScore}/100 (higher = more search interest)
- Reddit India activity (last 30 days): ${redditSignal.count} posts, ${redditSignal.relevantCount} India-relevant, top post: "${redditSignal.topPost || 'none'}"
- YouTube India signal: ${youtubeScore} relevant videos found recently

Historical pattern context:
- REAL TREND example: Ashwagandha — multiple independent signals (Ayurveda credibility + Western science validation + repeat purchase + Tier 2 demand), solving persistent stress problem
- FAD example: Charcoal toothpaste — aesthetic novelty, no functional differentiation, no repeat purchase logic, Western import with no India-specific demand driver

Reply ONLY with valid JSON, no markdown:
{
  "verdict": "REAL TREND" or "EMERGING" or "FAD RISK",
  "score": <0-100>,
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "one_line_reason": "<punchy one sentence verdict>",
  "market_maturity": <1-10>,
  "repeat_purchase": <1-10>,
  "tier2_potential": <1-10>,
  "competition_intensity": <1-10>,
  "time_to_mainstream": "<6 months / 1 year / 2 years / Already mainstream / 3+ years>",
  "market_size_estimate": "<e.g. ₹500Cr opportunity by 2027>",
  "fad_vs_trend_reasoning": "<2-3 sentences specific to India — what makes this lasting or not>",
  "opportunity_brief": "<specific product idea, target audience, price point, and distribution channel for an Indian D2C brand — 2-3 sentences, be very specific>",
  "early_signals": ["<signal 1>", "<signal 2>", "<signal 3>"],
  "risk_factors": ["<risk 1>", "<risk 2>"]
}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
        })
      }
    );

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: `Gemini error: ${err.slice(0, 200)}` });
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
