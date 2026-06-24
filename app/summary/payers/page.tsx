"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";

type Expense = {
  id: number;
  date: string;
  site_name: string;
  parking_fee: number | null;
  parking_payer: string | null;
  material_fee: number | null;
  material_payer: string | null;
};

type PayerSummary = {
  payer: string;
  parkingTotal: number;
  materialTotal: number;
  total: number;
};

export default function PayersPage() {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      const mm = String(viewMonth + 1).padStart(2, "0");
      const monthStart = `${viewYear}-${mm}-01`;
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const monthEnd = `${viewYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (!error && data) setExpenses(data as Expense[]);
      setLoading(false);
    };
    fetchExpenses();
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // 立替者ごとに集計
  const payerMap: { [name: string]: PayerSummary } = {};
  expenses.forEach((e) => {
    if (e.parking_payer && e.parking_fee) {
      if (!payerMap[e.parking_payer]) {
        payerMap[e.parking_payer] = { payer: e.parking_payer, parkingTotal: 0, materialTotal: 0, total: 0 };
      }
      payerMap[e.parking_payer].parkingTotal += e.parking_fee;
    }
    if (e.material_payer && e.material_fee) {
      if (!payerMap[e.material_payer]) {
        payerMap[e.material_payer] = { payer: e.material_payer, parkingTotal: 0, materialTotal: 0, total: 0 };
      }
      payerMap[e.material_payer].materialTotal += e.material_fee;
    }
  });

  Object.keys(payerMap).forEach((name) => {
    payerMap[name].total = payerMap[name].parkingTotal + payerMap[name].materialTotal;
  });

  const payers = Object.values(payerMap).sort((a, b) => b.total - a.total);

  const grandTotal = payers.reduce((sum, p) => sum + p.total, 0);

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
          立替金 集計
        </h1>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
          <button onClick={goPrevMonth} style={{ padding: "8px 14px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", cursor: "pointer" }}>
            ＜
          </button>
          <p style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#111111" }}>
            {viewYear}年 {viewMonth + 1}月
          </p>
          <button onClick={goNextMonth} style={{ padding: "8px 14px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", cursor: "pointer" }}>
            ＞
          </button>
        </div>

        {loading ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>読み込み中...</p>
        ) : payers.length === 0 ? (
          <p style={{ marginTop: "32px", textAlign: "center", color: "#888888" }}>この月の立替はありません</p>
        ) : (
          <>
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {payers.map((p) => (
                <div
                  key={p.payer}
                  style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#ffffff" }}
                >
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#111111" }}>{p.payer}</p>
                  <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "14px", color: "#333333" }}>
                    <div>駐車場代</div>
                    <div style={{ textAlign: "right" }}>¥{p.parkingTotal.toLocaleString()}</div>

                    <div>材料代</div>
                    <div style={{ textAlign: "right" }}>¥{p.materialTotal.toLocaleString()}</div>
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
                    <span>立替合計</span>
                    <span>¥{p.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                backgroundColor: "#eff6ff",
                border: "1px solid #93c5fd",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#111111",
              }}
            >
              <span>全員合計</span>
              <span>¥{grandTotal.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}