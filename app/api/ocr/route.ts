import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "画像データが不足しています" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const prompt = `この画像は領収書です。書かれている合計金額（税込）を読み取って、数字だけJSON形式で返してください。
形式: {"amount": 数字}
例: {"amount": 1280}
合計が読み取れない場合は {"amount": null} を返してください。
解説や追加のテキストは一切不要、JSONのみを返してください。`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini APIエラー: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // JSONを抽出
    const jsonMatch = textOutput.match(/\{[^}]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ amount: null, raw: textOutput });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ amount: parsed.amount, raw: textOutput });
    } catch {
      return NextResponse.json({ amount: null, raw: textOutput });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}