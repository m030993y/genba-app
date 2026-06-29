"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";

export default function OcrTestPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [amounts, setAmounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUrl(URL.createObjectURL(file));
    setRawText("");
    setAmounts([]);
    setLoading(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(file, "jpn+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setRawText(text);

      // 金額っぽい数字を抽出
      const matches = text.match(/[¥￥]?\d{1,3}(?:,\d{3})+|\d{2,}/g);
      if (matches) {
        const numbers = matches
          .map((m) => Number(m.replace(/[¥￥,]/g, "")))
          .filter((n) => !isNaN(n) && n >= 10 && n < 10000000);
        // 重複削除して大きい順
        const unique = Array.from(new Set(numbers)).sort((a, b) => b - a);
        setAmounts(unique);
      }
    } catch (err) {
      console.error(err);
      setRawText("読み取り失敗：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }

    e.target.value = "";
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", margin: 0 }}>
          OCR テスト
        </h1>
        <p style={{ marginTop: "8px", textAlign: "center", fontSize: "13px", color: "#666666" }}>
          領収書を選んで、金額が読み取れるか試す画面
        </p>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <label
            htmlFor="ocr-input"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#2563eb",
              border: "2px dashed #2563eb",
              borderRadius: "12px",
              backgroundColor: "#eff6ff",
              cursor: "pointer",
            }}
          >
            画像を選ぶ
          </label>
          <input
            id="ocr-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {imageUrl && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <img
              src={imageUrl}
              alt="選択画像"
              style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
          </div>
        )}

        {loading && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "15px" }}>読み取り中… {progress}%</p>
          </div>
        )}

        {!loading && amounts.length > 0 && (
          <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>検出された金額候補（大きい順）</p>
            <ul style={{ marginTop: "8px", paddingLeft: "20px", fontSize: "15px" }}>
              {amounts.map((n, i) => (
                <li key={i}>¥{n.toLocaleString()}</li>
              ))}
            </ul>
          </div>
        )}

        {!loading && rawText && (
          <details style={{ marginTop: "20px" }}>
            <summary style={{ cursor: "pointer", fontSize: "14px", color: "#555555" }}>読み取った全文（参考）</summary>
            <pre
              style={{
                marginTop: "8px",
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {rawText}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}