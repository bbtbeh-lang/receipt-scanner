export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { image, mimeType, bizType, bizDesc } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    const bizContext = bizType || bizDesc
      ? `The user runs a ${bizType || 'small'} business${bizDesc ? ` (${bizDesc})` : ''}. Mark items as "business" if related to their work, otherwise "personal".`
      : `Mark all items as "personal".`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: image
              }
            },
            {
              type: "text",
              text: `Read this receipt carefully. ${bizContext}

Reply ONLY with this JSON (no extra text, no markdown):
{
  "vendor": "store name",
  "date": "YYYY-MM-DD",
  "amount": "0.00",
  "tax": "0.00",
  "total": "0.00",
  "category": "fuel or maintenance or insurance or phone or meals or carwash or parking or grocery or food or rent or entertainment or clothing or health or education or other",
  "items": [
    {"name": "item name", "price": "0.00", "qty": 1, "type": "business or personal"}
  ]
}

If you cannot read individual items, return an empty items array.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Could not parse receipt: " + text.substring(0, 100) });

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.items)) parsed.items = [];

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
}
