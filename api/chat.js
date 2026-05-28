export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { question, summary } = req.body;
  if (!question) return res.status(400).json({ error: "No question provided" });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      system: `تو یه دستیار مالی هوشمند فارسی‌زبان هستی برای ایرانی‌های کانادا. 
داده‌های مالی کاربر:
- جمع کل هزینه‌ها: $${summary.totalExpenses}
- جمع کل درآمد: $${summary.totalIncome}
- هزینه‌ها بر اساس دسته: ${summary.byCategory}
- هزینه‌های ثابت ماهانه: ${summary.recurring}

لیست هزینه‌ها:
${summary.expenses}

لیست درآمد:
${summary.incomeList}

پاسخ‌هایت رو به فارسی و کوتاه بده. اگه داده‌ای نیست صادقانه بگو.`,
      messages: [{ role: "user", content: question }],
    }),
  });

  const data = await response.json();
  if (data.error) return res.status(500).json({ error: data.error.message });
  res.status(200).json({ answer: data.content[0].text });
}
