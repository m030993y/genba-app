"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

type Expense = {
  id: number;
  created_at: string;
  date: string;
  site_name: string;
  names: string;
  has_support: string | null;
  support_count: number | null;
  parking_fee: number | null;
  parking_payer: string | null;
  material_fee: number | null;
  material_payer: string | null;
  photo_url: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setExpenses(data as Expense[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (e: Expense) => {
    const ok = window.confirm(
      `${e.date} ${e.site_name} の経費を削除しますか?`
    );
    if (!ok) return;

    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) {
      alert("削除に失敗しました：" + error.message);
    } else {
      fetchExpenses();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <div style={{ padding: "16px", maxWidth: "640px", margin: "0 auto" }}>
        <button
          onClick={() => router.push("/")}
          style={{ marginBottom: "16px", padding: "8px 16px", fontSize: "14px", color: "#2563eb", backgroundColor: "#ffffff", border: "1px solid #2563eb", borderRadius: "8px", cursor: "pointer" }}
        >
          ＜ カレンダーに戻る
        </button>

        <h1 style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", margin: 0, color: "#111111" }}>
          入力履歴
        </h1>

        {loading ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>読み込み中...</p>
        ) : expenses.length === 0 ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>データがありません</p>
        ) : (
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {expenses.map((e) => {
              const photoUrls = e.photo_url ? e.photo_url.split("、").filter((u) => u) : [];
              const parkingFeeText = e.parking_fee ? `¥${e.parking_fee.toLocaleString()}${e.parking_payer ? ` (${e.parking_payer})` : ""}` : null;
              const materialFeeText = e.material_fee ? `¥${e.material_fee.toLocaleString()}${e.material_payer ? ` (${e.material_payer})` : ""}` : null;

              return (
                <div
                  key={e.id}
                  style={{ padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#ffffff" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>{formatDate(e.date)}</p>
                    <button
                      onClick={() => handleDelete(e)}
                      style={{ padding: "4px 10px", fontSize: "12px", color: "#dc2626", backgroundColor: "#ffffff", border: "1px solid #dc2626", borderRadius: "6px", cursor: "pointer" }}
                    >
                      削除
                    </button>
                  </div>

                  <p style={{ margin: "6px 0 0 0", fontSize: "17px", fontWeight: "bold", color: "#111111" }}>
                    {e.site_name || "(現場名なし)"}
                  </p>

                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#333333" }}>
                    {e.names}
                    {e.has_support === "あり" && e.support_count ? `（応援${e.support_count}人）` : ""}
                  </p>

                  {(parkingFeeText || materialFeeText) && (
                    <div style={{ marginTop: "8px", fontSize: "13px", color: "#333333", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {parkingFeeText && <div>駐車場代：{parkingFeeText}</div>}
                      {materialFeeText && <div>材料代：{materialFeeText}</div>}
                    </div>
                  )}

                  {photoUrls.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {photoUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`領収書${i + 1}`}
                            style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}