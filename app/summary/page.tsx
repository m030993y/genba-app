"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

type Expense = {
  id: number;
  date: string;
  site_name: string;
  names: string;
  has_support: string | null;
  support_count: number | null;
  support_names: string | null;
  parking_fee: number | null;
  parking_payer: string | null;
  material_fee: number | null;
  material_payer: string | null;
};

type SiteSummary = {
  siteName: string;
  totalPeople: number;
  parkingTotal: number;
  materialTotal: number;
  grandTotal: number;
  days: number;
};

export default function SummaryPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: true });
      if (!error && data) setExpenses(data as Expense[]);
      setLoading(false);
    };
    fetchExpenses();
  }, []);

  const summaryMap: { [siteName: string]: SiteSummary } = {};
  const daysSet: { [siteName: string]: Set<string> } = {};

  expenses.forEach((e) => {
    const site = e.site_name || "(未入力)";

    if (!summaryMap[site]) {
      summaryMap[site] = {
        siteName: site,
        totalPeople: 0,
        parkingTotal: 0,
        materialTotal: 0,
        grandTotal: 0,
        days: 0,
      };
      daysSet[site] = new Set();
    }

    // 通常の氏名の人数
    const nameCount = e.names
      ? e.names.split(/[、,]/).filter((n) => n.trim().length > 0).length
      : 0;
    summaryMap[site].totalPeople += nameCount;

    // 応援：名前があれば名前の数を、なければsupport_countを使う
    if (e.has_support === "あり") {
      const supportNameCount = e.support_names
        ? e.support_names.split(/[、,]/).filter((n) => n.trim().length > 0).length
        : 0;
      if (supportNameCount > 0) {
        summaryMap[site].totalPeople += supportNameCount;
      } else if (e.support_count) {
        summaryMap[site].totalPeople += e.support_count;
      }
    }

    if (e.parking_fee) summaryMap[site].parkingTotal += e.parking_fee;
    if (e.material_fee) summaryMap[site].materialTotal += e.material_fee;

    if (e.date) daysSet[site].add(e.date);
  });

  Object.keys(summaryMap).forEach((site) => {
    summaryMap[site].days = daysSet[site].size;
    summaryMap[site].grandTotal = summaryMap[site].parkingTotal + summaryMap[site].materialTotal;
  });

  const summaries: SiteSummary[] = Object.values(summaryMap).sort((a, b) =>
    a.siteName.localeCompare(b.siteName, "ja")
  );

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
          現場別 集計
        </h1>

        {loading ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>読み込み中...</p>
        ) : summaries.length === 0 ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>データがありません</p>
        ) : (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {summaries.map((s) => (
              <div
                key={s.siteName}
                style={{
                  padding: "16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                }}
              >
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#111111" }}>{s.siteName}</p>
                <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "14px", color: "#333333" }}>
                  <div>稼働日数</div>
                  <div style={{ textAlign: "right" }}>{s.days} 日</div>

                  <div>延べ人区</div>
                  <div style={{ textAlign: "right" }}>{s.totalPeople} 人</div>

                  <div>駐車場代</div>
                  <div style={{ textAlign: "right" }}>¥{s.parkingTotal.toLocaleString()}</div>

                  <div>材料代</div>
                  <div style={{ textAlign: "right" }}>¥{s.materialTotal.toLocaleString()}</div>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "15px",
                    fontWeight: "bold",
                    color: "#111111",
                  }}
                >
                  <span>経費合計</span>
                  <span>¥{s.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}