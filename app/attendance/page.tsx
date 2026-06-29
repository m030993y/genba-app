"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

type Expense = {
  id: number;
  date: string;
  names: string;
  site_name: string;
};

const ALL_NAMES = ["冨澤", "岡田", "岩内"];

export default function AttendancePage() {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedName, setSelectedName] = useState(ALL_NAMES[0]);
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

  // 選んだ人が出勤した日付の集合を作る
  const attendedDates = new Set<string>();
 
  expenses.forEach((e) => {
    if (!e.names || !e.date) return;
    const namesArr = e.names.split(/[、,]/).map((n) => n.trim());
    if (namesArr.includes(selectedName)) {
      attendedDates.add(e.date);
      
    }
  });

  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const days: number[] = [];
  for (let d = 1; d <= lastDay; d++) days.push(d);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const formatDateKey = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
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
          出勤簿
        </h1>

        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
          {ALL_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setSelectedName(n)}
              style={{
                padding: "10px 18px",
                fontSize: "15px",
                borderRadius: "8px",
                border: selectedName === n ? "2px solid #2563eb" : "1px solid #ccc",
                backgroundColor: selectedName === n ? "#dbeafe" : "#ffffff",
                color: "#111111",
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>

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
        ) : (
          <>
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                backgroundColor: "#eff6ff",
                border: "1px solid #93c5fd",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "15px",
                fontWeight: "bold",
                color: "#111111",
              }}
            >
              <span>{selectedName} の出勤日数</span>
              <span>{attendedDates.size} 日</span>
            </div>

            <table style={{ marginTop: "16px", width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "8px 4px", border: "1px solid #e5e7eb", width: "50px" }}>日</th>
                  <th style={{ padding: "8px 4px", border: "1px solid #e5e7eb", width: "40px" }}>曜</th>
                  <th style={{ padding: "8px 4px", border: "1px solid #e5e7eb", width: "60px" }}>出勤</th>
                  <th style={{ padding: "8px 4px", border: "1px solid #e5e7eb" }}>現場</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const dateKey = formatDateKey(d);
                  const wDay = new Date(viewYear, viewMonth, d).getDay();
                  const attended = attendedDates.has(dateKey);
                  

                  return (
                    <tr key={d}>
                      <td style={{ padding: "6px 4px", border: "1px solid #e5e7eb", textAlign: "center", color: wDay === 0 ? "#dc2626" : wDay === 6 ? "#2563eb" : "#111111" }}>
                        {d}
                      </td>
                      <td style={{ padding: "6px 4px", border: "1px solid #e5e7eb", textAlign: "center", color: wDay === 0 ? "#dc2626" : wDay === 6 ? "#2563eb" : "#555555" }}>
                        {weekdays[wDay]}
                      </td>
                      <td style={{ padding: "6px 4px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "16px", fontWeight: "bold", color: attended ? "#16a34a" : "#cccccc" }}>
                        {attended ? "○" : ""}
                      </td>
                      
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}