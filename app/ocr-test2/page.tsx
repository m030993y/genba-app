"use client";

import { useState } from "react";

export default function OcrTest2Page() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUrl(URL.createObjectURL(file));
    setLoading(true);
    setResult("");
    setAmount(null);

    try {
      // 画像をBase64に変換
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64Part = dataUrl.split(",")[1];
          resolve(base64Part);
        };
        reader.onerror = () => reject(new Error("画像読み込み失敗"));
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setResult("エラー: " + data.error);
      } else {
        setAmount(data.amount);
        setResult(data.raw || "（結果なし）");
      }
    } catch (err) {
      setResult("通信エラー: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }

    e.target.value = "";
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", margin: 0 }}>
          OCR テスト2 (Gemini)
        </h1>
        <p style={{ marginTop: "8px", textAlign: "center", fontSize: "13px", color: "#666666" }}>
          領収書を選んで、AI で金額が読み取れるか試す画面
        </p>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <label
            htmlFor="ocr2-input"
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
            id="ocr2-input"
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
            <p style={{ margin: 0, fontSize: "15px" }}>AI が読み取り中...</p>
          </div>
        )}

        {!loading && amount !== null && (
          <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>検出された金額</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "28px", fontWeight: "bold", color: "#111111" }}>
              ¥{amount.toLocaleString()}
            </p>
          </div>
        )}

        {!loading && result && (
          <details style={{ marginTop: "20px" }}>
            <summary style={{ cursor: "pointer", fontSize: "14px", color: "#555555" }}>AIの返答全文（参考）</summary>
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
              {result}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}