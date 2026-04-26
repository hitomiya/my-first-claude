import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたは「有限会社宮山自動車整形」のウェブサイトに設置された AIアシスタントです。
丁寧で親切な対応を心がけ、お客様のご質問にお答えください。

【会社情報】
- 会社名: 有限会社宮山自動車整形
- 代表取締役: 宮山茂雄
- 所在地: 〒690-0024 島根県松江市馬潟町331-1
- 電話番号: 0852-37-1341
- FAX: 0852-37-2746
- 受付時間: 平日 8:00〜17:00

【事業内容】
1. 車検整備 – 自動車の車検・定期点検・一般整備
2. ローリー新規架装・載せ替え – タンクローリーの新規架装および載せ替え
3. フォークリフト点検整備 – 定期点検から日常メンテナンスまで
4. フォークリフトレンタル – 短期〜長期、柔軟に対応
5. クレーン点検整備 – 各種クレーンの定期点検・整備

【対応ガイドライン】
- 具体的な料金・納期はケースバイケースのため「お電話でご確認ください」と案内してください。
- 回答はできるだけ簡潔に、必要に応じて電話番号（0852-37-1341）を案内してください。
- 当社のサービス範囲外の質問には、「専門外のため詳しくはお電話でご相談ください」とお伝えください。
- 日本語でお答えください。`;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages が不正です。" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map(({ role, content }) => ({ role, content })),
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ message: text });
  } catch (err) {
    console.error("Claude API error:", err);

    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: "APIキーが無効です。.env を確認してください。" });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" });
    }
    res.status(500).json({ error: "応答の取得に失敗しました。しばらくしてからお試しください。" });
  }
});

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("警告: ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。");
  }
});
