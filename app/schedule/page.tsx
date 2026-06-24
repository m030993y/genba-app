"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

type Schedule = {
  id: number;
  date: string;
  site_name: string;
};

export default function Home() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // ポップアップ関連
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(today);
  const [modalSiteName, setModalSiteName] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const fetchSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*").order("date", { ascending: true });
    if (!error && data) setSchedules(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSelectSchedule = (schedule: Schedule) => {
    const params = new URLSearchParams({ date: schedule.date, site: schedule.site_name });
    router.push(`/entry?${params.toString()}`);
  };

  const handleEmptyCellClick = (dateKey: string) => {
    const params = new URLSearchParams({ date: dateKey });
    router.push(`/entry?${params.toString()}`);
  };

  const handleAddSchedule = async () => {
    if (!modalSiteName) {
      setModalMessage("現場名を入力してください");
      return;
    }
    setModalSaving(true);
    setModalMessage("");

    const { error } = await supabase.from("schedules").insert({
      date: modalDate,
      site_name: modalSiteName,
    });

    setModalSaving(false);

    if (error) {
      setModalMessage("登録に失敗しました：" + error.message);
    } else {
      setModalMessage("");
      setShowModal(false);
      setModalDate(today);
      setModalSiteName("");
      fetchSchedules();
    }
  };

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

  const scheduleMap: { [date: string]: Schedule[] } = {};
  schedules.forEach((s) => {
    if (!scheduleMap[s.date]) scheduleMap[s.date] = [];
    scheduleMap[s.date].push(s);
  });

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const formatDateKey = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const CELL_HEIGHT = "78px";

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh", position: "relative" }}>
      <div style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center", margin: 0, color: "#111111" }}>
          現場経費アプリ
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
        ) : (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px" }}>
              {weekdayLabels.map((label, i) => (
                <div key={label} style={{ textAlign: "center", fontSize: "12px", fontWeight: "bold", padding: "6px 0", color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#555555" }}>
                  {label}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px", marginTop: "2px" }}>
              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={index} style={{ height: CELL_HEIGHT, minWidth: 0, backgroundColor: "#fafafa", border: "1px solid #eeeeee", borderRadius: "6px" }} />;
                }
                const dateKey = formatDateKey(day);
                const daySchedules = scheduleMap[dateKey] || [];
                const isToday = dateKey === todayStr;
                const weekday = (startWeekday + day - 1) % 7;

                return (
                  <div
                    key={index}
                    onClick={() => daySchedules.length === 0 && handleEmptyCellClick(dateKey)}
                    style={{
                      height: CELL_HEIGHT,
                      minWidth: 0,
                      border: isToday ? "2px solid #2563eb" : "1px solid #eeeeee",
                      borderRadius: "6px",
                      padding: "4px 2px",
                      backgroundColor: "#ffffff",
                      overflow: "hidden",
                      cursor: daySchedules.length === 0 ? "pointer" : "default",
                    }}
                  >
                    <p style={{ fontSize: "12px", margin: 0, fontWeight: isToday ? "bold" : "normal", color: weekday === 0 ? "#dc2626" : weekday === 6 ? "#2563eb" : "#333333" }}>
                      {day}
                    </p>
                    <div style={{ marginTop: "2px", display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                      {daySchedules.map((s) => (
                        <button
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSchedule(s);
                          }}
                          style={{ fontSize: "10px", padding: "2px 3px", backgroundColor: "#1d9e75", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", textAlign: "left", lineHeight: "1.3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%", minWidth: 0 }}
                        >
                          {s.site_name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 右下の＋ボタン */}
      <button
        onClick={() => {
          setModalDate(today);
          setModalSiteName("");
          setModalMessage("");
          setShowModal(true);
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          border: "none",
          fontSize: "28px",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          lineHeight: "1",
        }}
      >
        ＋
      </button>

      {/* 予定追加ポップアップ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "360px",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#111111", textAlign: "center" }}>
              予定を追加
            </h2>

            <p style={{ marginTop: "16px", fontSize: "14px", color: "#555555" }}>日付</p>
            <input
              type="date"
              value={modalDate}
              onChange={(e) => setModalDate(e.target.value)}
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box" }}
            />

            <p style={{ marginTop: "16px", fontSize: "14px", color: "#555555" }}>現場名</p>
            <input
              type="text"
              value={modalSiteName}
              onChange={(e) => setModalSiteName(e.target.value)}
              placeholder="例：鵠沼インターホン"
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box" }}
            />

            {modalMessage && (
              <p style={{ marginTop: "12px", fontSize: "13px", color: "#dc2626", textAlign: "center" }}>{modalMessage}</p>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: "10px 18px", fontSize: "15px", color: "#555555", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={modalSaving}
                style={{ padding: "10px 18px", fontSize: "15px", color: "#ffffff", backgroundColor: modalSaving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: "8px", cursor: modalSaving ? "default" : "pointer" }}
              >
                {modalSaving ? "登録中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}