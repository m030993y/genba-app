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

type Override = {
  id: number;
  date: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
};

const ALL_NAMES = ["冨澤", "岡田", "岩内"];
const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";
const DEFAULT_BREAK = 60;

export default function AttendancePage() {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedName, setSelectedName] = useState(ALL_NAMES[0]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editStart, setEditStart] = useState(DEFAULT_START);
  const [editEnd, setEditEnd] = useState(DEFAULT_END);
  const [editBreak, setEditBreak] = useState(String(DEFAULT_BREAK));
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const mm = String(viewMonth + 1).padStart(2, "0");
    const monthStart = `${viewYear}-${mm}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const { data: expData } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd);
    if (expData) setExpenses(expData as Expense[]);

    const { data: ovData } = await supabase
      .from("attendance_overrides")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .eq("name", selectedName);
    if (ovData) setOverrides(ovData as Override[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [viewYear, viewMonth, selectedName]);

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

  const attendedDates = new Set<string>();
  expenses.forEach((e) => {
    if (!e.names || !e.date) return;
    const namesArr = e.names.split(/[、,]/).map((n) => n.trim());
    if (namesArr.includes(selectedName)) attendedDates.add(e.date);
  });

  const overrideMap: { [date: string]: Override } = {};
  overrides.forEach((o) => {
    overrideMap[o.date] = o;
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

  const calcWorkHours = (start: string, end: string, breakMin: number): string => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const diff = endMin - startMin - breakMin;
    if (diff <= 0) return "0:00";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  const openEdit = (dateKey: string) => {
    const ov = overrideMap[dateKey];
    setEditingDate(dateKey);
    setEditStart(ov?.start_time || DEFAULT_START);
    setEditEnd(ov?.end_time || DEFAULT_END);
    setEditBreak(String(ov?.break_minutes ?? DEFAULT_BREAK));
  };

  const closeEdit = () => {
    setEditingDate(null);
  };

  const saveEdit = async () => {
    if (!editingDate) return;
    setEditSaving(true);
    const existing = overrideMap[editingDate];
    const payload = {
      date: editingDate,
      name: selectedName,
      start_time: editStart,
      end_time: editEnd,
      break_minutes: Number(editBreak),
    };

    if (existing) {
      await supabase.from("attendance_overrides").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("attendance_overrides").insert(payload);
    }

    setEditSaving(false);
    closeEdit();
    fetchData();
  };

  const resetEdit = async () => {
    if (!editingDate) return;
    const existing = overrideMap[editingDate];
    if (!existing) {
      closeEdit();
      return;
    }
    const ok = window.confirm("この日のカスタム勤務時間を削除して、デフォルト（8:00〜17:00、休憩60分）に戻しますか?");
    if (!ok) return;
    await supabase.from("attendance_overrides").delete().eq("id", existing.id);
    closeEdit();
    fetchData();
  };

  // 月の合計実労働時間（分）
  let totalMinutes = 0;
  attendedDates.forEach((d) => {
    const ov = overrideMap[d];
    const s = ov?.start_time || DEFAULT_START;
    const e = ov?.end_time || DEFAULT_END;
    const b = ov?.break_minutes ?? DEFAULT_BREAK;
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    totalMinutes += eh * 60 + em - (sh * 60 + sm) - b;
  });
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <div style={{ padding: "16px", maxWidth: "720px", margin: "0 auto" }}>
        <button
          <button
          onClick={() => router.push("/")}
          className="no-print"
          style={{ marginBottom: "16px", padding: "8px 16px", fontSize: "14px", color: "#2563eb", backgroundColor: "#ffffff", border: "1px solid #2563eb", borderRadius: "8px", cursor: "pointer" }}
        >
          ＜ カレンダーに戻る
        </button>
        </button><button
          onClick={() => window.print()}
          className="no-print"
          style={{ marginBottom: "16px", marginLeft: "8px", padding: "8px 16px", fontSize: "14px", color: "#ffffff", backgroundColor: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          印刷・PDF
        </button>

        <h1 className="no-print" style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", margin: 0, color: "#111111" }}>
          出勤簿
        </h1>

        <div className="no-print" style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
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
                flexDirection: "column",
                gap: "6px",
                fontSize: "15px",
                color: "#111111",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>{selectedName} の出勤日数</span>
                <span>{attendedDates.size} 日</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>合計実労働時間</span>
                <span>{totalH}時間{totalM > 0 ? `${totalM}分` : ""}</span>
              </div>
            </div>

            <table style={{ marginTop: "16px", width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb", width: "40px" }}>日</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb", width: "36px" }}>曜</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb", width: "44px" }}>出勤</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb" }}>始業</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb" }}>終業</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb" }}>休憩</th>
                  <th style={{ padding: "6px 4px", border: "1px solid #e5e7eb" }}>実働</th>
                  <th className="no-print" style={{ padding: "6px 4px", border: "1px solid #e5e7eb", width: "50px" }}></th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const dateKey = formatDateKey(d);
                  const wDay = new Date(viewYear, viewMonth, d).getDay();
                  const attended = attendedDates.has(dateKey);
                  const ov = overrideMap[dateKey];

                  const start = attended ? ov?.start_time || DEFAULT_START : "";
                  const end = attended ? ov?.end_time || DEFAULT_END : "";
                  const breakMin = attended ? ov?.break_minutes ?? DEFAULT_BREAK : 0;
                  const work = attended ? calcWorkHours(start, end, breakMin) : "";

                  return (
                    <tr key={d}>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", color: wDay === 0 ? "#dc2626" : wDay === 6 ? "#2563eb" : "#111111" }}>
                        {d}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", color: wDay === 0 ? "#dc2626" : wDay === 6 ? "#2563eb" : "#555555" }}>
                        {weekdays[wDay]}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: "bold", color: attended ? "#16a34a" : "#cccccc" }}>
                        {attended ? "○" : ""}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", color: ov ? "#2563eb" : "#333333" }}>
                        {start}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", color: ov ? "#2563eb" : "#333333" }}>
                        {end}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center", color: ov ? "#2563eb" : "#333333" }}>
                        {attended ? `${breakMin}分` : ""}
                      </td>
                      <td style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                        {work}
                      </td>
                      <td className="no-print" style={{ padding: "5px 3px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                        {attended && (
                          <button
                            onClick={() => openEdit(dateKey)}
                            style={{ padding: "3px 6px", fontSize: "11px", color: "#2563eb", backgroundColor: "#ffffff", border: "1px solid #2563eb", borderRadius: "4px", cursor: "pointer" }}
                          >
                            編集
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {editingDate && (
        <div
          onClick={closeEdit}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "320px", boxSizing: "border-box" }}
          >
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#111111", textAlign: "center" }}>
              {editingDate} の勤務時間
            </p>

            <p style={{ marginTop: "16px", marginBottom: 0, fontSize: "13px", color: "#555555" }}>始業</p>
            <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box" }} />

            <p style={{ marginTop: "12px", marginBottom: 0, fontSize: "13px", color: "#555555" }}>終業</p>
            <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box" }} />

            <p style={{ marginTop: "12px", marginBottom: 0, fontSize: "13px", color: "#555555" }}>休憩（分）</p>
            <input type="number" value={editBreak} onChange={(e) => setEditBreak(e.target.value)} style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box" }} />

            <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={resetEdit} style={{ padding: "8px 12px", fontSize: "13px", color: "#dc2626", backgroundColor: "#ffffff", border: "1px solid #dc2626", borderRadius: "8px", cursor: "pointer" }}>
                リセット
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={closeEdit} style={{ padding: "8px 14px", fontSize: "14px", color: "#555555", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}>
                  キャンセル
                </button>
                <button onClick={saveEdit} disabled={editSaving} style={{ padding: "8px 14px", fontSize: "14px", color: "#ffffff", backgroundColor: editSaving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: "8px", cursor: editSaving ? "default" : "pointer" }}>
                  {editSaving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}