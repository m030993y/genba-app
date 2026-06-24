"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

type Schedule = {
  id: number;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  site_name: string;
  memo: string | null;
};

export default function Home() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // ポップアップ
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalStartDate, setModalStartDate] = useState(today);
  const [modalEndDate, setModalEndDate] = useState(today);
  const [modalSiteName, setModalSiteName] = useState("");
  const [modalMemo, setModalMemo] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // 長押しメニュー
  const [actionSchedule, setActionSchedule] = useState<Schedule | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const fetchSchedules = async () => {
    const { data, error } = await supabase.from("schedules").select("*");
    if (!error && data) setSchedules(data as Schedule[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const getRange = (s: Schedule): { start: string; end: string } => {
    if (s.start_date && s.end_date) return { start: s.start_date, end: s.end_date };
    if (s.start_date) return { start: s.start_date, end: s.start_date };
    if (s.date) return { start: s.date, end: s.date };
    return { start: "", end: "" };
  };

  const handleSelectSchedule = (schedule: Schedule, dateOverride: string) => {
    const params = new URLSearchParams({
      date: dateOverride,
      site: schedule.site_name,
      memo: schedule.memo || "",
    });
    router.push(`/entry?${params.toString()}`);
  };

  const handleEmptyCellClick = (dateKey: string) => {
    const params = new URLSearchParams({ date: dateKey });
    router.push(`/entry?${params.toString()}`);
  };

  // 長押し検知
  const startPress = (schedule: Schedule) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setActionSchedule(schedule);
    }, 500);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleScheduleClick = (e: React.MouseEvent, schedule: Schedule, dateKey: string) => {
    e.stopPropagation();
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    handleSelectSchedule(schedule, dateKey);
  };

  // 編集モードを開く
  const openEditModal = (schedule: Schedule) => {
    const { start, end } = getRange(schedule);
    setEditingId(schedule.id);
    setModalStartDate(start || today);
    setModalEndDate(end || today);
    setModalSiteName(schedule.site_name);
    setModalMemo(schedule.memo || "");
    setModalMessage("");
    setActionSchedule(null);
    setShowModal(true);
  };

  // 削除
  const handleDelete = async () => {
    if (!actionSchedule) return;
    const ok = window.confirm(`「${actionSchedule.site_name}」を削除しますか?`);
    if (!ok) return;

    const { error } = await supabase.from("schedules").delete().eq("id", actionSchedule.id);
    if (error) {
      alert("削除に失敗しました：" + error.message);
    } else {
      setActionSchedule(null);
      fetchSchedules();
    }
  };

  // 追加または更新
  const handleAddOrUpdateSchedule = async () => {
    if (!modalSiteName) {
      setModalMessage("現場名を入力してください");
      return;
    }
    if (modalEndDate < modalStartDate) {
      setModalMessage("終了日は開始日以降にしてください");
      return;
    }
    setModalSaving(true);
    setModalMessage("");

    if (editingId !== null) {
      const { error } = await supabase
        .from("schedules")
        .update({
          start_date: modalStartDate,
          end_date: modalEndDate,
          date: modalStartDate,
          site_name: modalSiteName,
          memo: modalMemo || null,
        })
        .eq("id", editingId);

      setModalSaving(false);
      if (error) {
        setModalMessage("更新に失敗しました：" + error.message);
      } else {
        setShowModal(false);
        setEditingId(null);
        fetchSchedules();
      }
    } else {
      const { error } = await supabase.from("schedules").insert({
        start_date: modalStartDate,
        end_date: modalEndDate,
        date: modalStartDate,
        site_name: modalSiteName,
        memo: modalMemo || null,
      });

      setModalSaving(false);
      if (error) {
        setModalMessage("登録に失敗しました：" + error.message);
      } else {
        setShowModal(false);
        setModalStartDate(today);
        setModalEndDate(today);
        setModalSiteName("");
        setModalMemo("");
        fetchSchedules();
      }
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
    const { start, end } = getRange(s);
    if (!start || !end) return;
    const startDt = new Date(start);
    const endDt = new Date(end);
    for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      if (!scheduleMap[key]) scheduleMap[key] = [];
      scheduleMap[key].push(s);
    }
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
                    onClick={() => handleEmptyCellClick(dateKey)}
                    style={{
                      height: CELL_HEIGHT,
                      minWidth: 0,
                      border: isToday ? "2px solid #2563eb" : "1px solid #eeeeee",
                      borderRadius: "6px",
                      padding: "4px 2px",
                      backgroundColor: "#ffffff",
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: "12px", margin: 0, fontWeight: isToday ? "bold" : "normal", color: weekday === 0 ? "#dc2626" : weekday === 6 ? "#2563eb" : "#333333" }}>
                      {day}
                    </p>
                    <div style={{ marginTop: "2px", display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                      {daySchedules.map((s) => (
                        <button
                          key={s.id}
                          onClick={(e) => handleScheduleClick(e, s, dateKey)}
                          onMouseDown={() => startPress(s)}
                          onMouseUp={cancelPress}
                          onMouseLeave={cancelPress}
                          onTouchStart={() => startPress(s)}
                          onTouchEnd={cancelPress}
                          onTouchCancel={cancelPress}
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

      <button
        onClick={() => {
          setEditingId(null);
          setModalStartDate(today);
          setModalEndDate(today);
          setModalSiteName("");
          setModalMemo("");
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

      {/* 長押しメニュー */}
      {actionSchedule && (
        <div
          onClick={() => setActionSchedule(null)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "300px", boxSizing: "border-box" }}
          >
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#111111", textAlign: "center" }}>
              {actionSchedule.site_name}
            </p>
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => openEditModal(actionSchedule)}
                style={{ padding: "12px", fontSize: "15px", color: "#111111", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              >
                編集
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: "12px", fontSize: "15px", color: "#ffffff", backgroundColor: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                削除
              </button>
              <button
                onClick={() => setActionSchedule(null)}
                style={{ padding: "12px", fontSize: "15px", color: "#555555", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 追加・編集ポップアップ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "360px", boxSizing: "border-box" }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#111111", textAlign: "center" }}>
              {editingId !== null ? "予定を編集" : "予定を追加"}
            </h2>

            <p style={{ marginTop: "16px", fontSize: "14px", color: "#555555" }}>開始日</p>
            <input
              type="date"
              value={modalStartDate}
              onChange={(e) => {
                setModalStartDate(e.target.value);
                if (modalEndDate < e.target.value) setModalEndDate(e.target.value);
              }}
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box" }}
            />

            <p style={{ marginTop: "12px", fontSize: "14px", color: "#555555" }}>終了日</p>
            <input
              type="date"
              value={modalEndDate}
              onChange={(e) => setModalEndDate(e.target.value)}
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box" }}
            />

            <p style={{ marginTop: "12px", fontSize: "14px", color: "#555555" }}>現場名</p>
            <input
              type="text"
              value={modalSiteName}
              onChange={(e) => setModalSiteName(e.target.value)}
              placeholder="例：鵠沼インターホン"
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box" }}
            />

            <p style={{ marginTop: "12px", fontSize: "14px", color: "#555555" }}>メモ（任意）</p>
            <textarea
              value={modalMemo}
              onChange={(e) => setModalMemo(e.target.value)}
              placeholder="例：9時集合、駐車場は隣のコインパーキング"
              rows={3}
              style={{ width: "100%", marginTop: "4px", padding: "10px", fontSize: "15px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#ffffff", color: "#111111", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />

            {modalMessage && (
              <p style={{ marginTop: "12px", fontSize: "13px", color: "#dc2626", textAlign: "center" }}>{modalMessage}</p>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                style={{ padding: "10px 18px", fontSize: "15px", color: "#555555", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddOrUpdateSchedule}
                disabled={modalSaving}
                style={{ padding: "10px 18px", fontSize: "15px", color: "#ffffff", backgroundColor: modalSaving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: "8px", cursor: modalSaving ? "default" : "pointer" }}
              >
                {modalSaving ? "保存中..." : editingId !== null ? "保存" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}