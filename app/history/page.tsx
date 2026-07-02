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
  support_names: string | null;
  parking_fee: number | null;
  parking_payer: string | null;
  material_fee: number | null;
  material_payer: string | null;
  photo_url: string | null;
};

type NewPhoto = {
  file: File;
  previewUrl: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [eDate, setEDate] = useState("");
  const [eSiteName, setESiteName] = useState("");
  const [eSelectedNames, setESelectedNames] = useState<string[]>([]);
  const [eHasSupport, setEHasSupport] = useState("");
  const [eSupportCount, setESupportCount] = useState("");
  const [eSupportNames, setESupportNames] = useState<string[]>([]);
  const [eParkingFee, setEParkingFee] = useState("");
  const [eParkingPayer, setEParkingPayer] = useState("");
  const [eMaterialFee, setEMaterialFee] = useState("");
  const [eMaterialPayer, setEMaterialPayer] = useState("");
  const [eExistingPhotos, setEExistingPhotos] = useState<string[]>([]);
  const [eNewPhotos, setENewPhotos] = useState<NewPhoto[]>([]);
  const [eSaving, setESaving] = useState(false);
  const [eMessage, setEMessage] = useState("");

  const names = ["冨澤", "岡田", "岩内"];

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

  // 応援人数に合わせて応援者名前入力欄を調整
  useEffect(() => {
    const count = Number(eSupportCount) || 0;
    setESupportNames((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
  }, [eSupportCount]);

  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setEDate(e.date || "");
    setESiteName(e.site_name || "");
    setESelectedNames(e.names ? e.names.split(/[、,]/).filter((n) => n.trim().length > 0) : []);
    setEHasSupport(e.has_support || "");
    setESupportCount(e.support_count !== null ? String(e.support_count) : "");
    setESupportNames(e.support_names ? e.support_names.split(/[、,]/).map((n) => n.trim()) : []);
    setEParkingFee(e.parking_fee !== null ? String(e.parking_fee) : "");
    setEParkingPayer(e.parking_payer || "");
    setEMaterialFee(e.material_fee !== null ? String(e.material_fee) : "");
    setEMaterialPayer(e.material_payer || "");
    setEExistingPhotos(e.photo_url ? e.photo_url.split("、").filter((u) => u) : []);
    setENewPhotos([]);
    setEMessage("");
  };

  const closeEdit = () => {
    setEditingExpense(null);
    setENewPhotos([]);
  };

  const toggleEditName = (name: string) => {
    let updated: string[];
    if (eSelectedNames.includes(name)) {
      updated = eSelectedNames.filter((n) => n !== name);
      if (eParkingPayer === name) setEParkingPayer("");
      if (eMaterialPayer === name) setEMaterialPayer("");
    } else {
      updated = [...eSelectedNames, name];
    }
    setESelectedNames(updated);
    if (updated.length === 1) {
      if (!eParkingPayer) setEParkingPayer(updated[0]);
      if (!eMaterialPayer) setEMaterialPayer(updated[0]);
    }
  };

  const updateSupportName = (index: number, value: string) => {
    setESupportNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddPhoto = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files;
    if (files && files.length > 0) {
      const newOnes: NewPhoto[] = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setENewPhotos([...eNewPhotos, ...newOnes]);
    }
    ev.target.value = "";
  };

  const removeNewPhoto = (index: number) => {
    setENewPhotos(eNewPhotos.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    setESaving(true);
    setEMessage("");

    const uploadedUrls: string[] = [];
    for (const p of eNewPhotos) {
      const extension = p.file.name.split(".").pop();
      const photoIndex = eExistingPhotos.length + uploadedUrls.length + 1;
      const fileName = `${eDate}_${photoIndex}_${Date.now().toString(36)}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, p.file);
      if (uploadError) {
        setEMessage("写真のアップロードに失敗しました：" + uploadError.message);
        setESaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      uploadedUrls.push(publicUrlData.publicUrl);
    }

    const allPhotos = [...eExistingPhotos, ...uploadedUrls];
    const cleanSupportNames = eSupportNames.map((n) => n.trim()).filter((n) => n.length > 0);

    const { error } = await supabase
      .from("expenses")
      .update({
        date: eDate,
        site_name: eSiteName,
        names: eSelectedNames.join("、"),
        has_support: eHasSupport,
        support_count: eHasSupport === "あり" && eSupportCount ? Number(eSupportCount) : null,
        support_names: eHasSupport === "あり" && cleanSupportNames.length > 0 ? cleanSupportNames.join("、") : null,
        parking_fee: eParkingFee ? Number(eParkingFee) : null,
        parking_payer: eParkingPayer || null,
        material_fee: eMaterialFee ? Number(eMaterialFee) : null,
        material_payer: eMaterialPayer || null,
        photo_url: allPhotos.join("、"),
      })
      .eq("id", editingExpense.id);

    setESaving(false);

    if (error) {
      setEMessage("保存に失敗しました：" + error.message);
    } else {
      closeEdit();
      fetchExpenses();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    marginTop: "4px",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#111111",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    marginTop: "14px",
    marginBottom: "0",
    fontSize: "14px",
    color: "#555555",
  };

  const payerOptions = eSelectedNames;

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

              let supportText = "";
              if (e.has_support === "あり" && e.support_count) {
                supportText = `（応援${e.support_count}人`;
                if (e.support_names) {
                  supportText += `：${e.support_names}`;
                }
                supportText += `）`;
              }

              return (
                <div
                  key={e.id}
                  style={{ padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#ffffff" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>{formatDate(e.date)}</p>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEdit(e)}
                        style={{ padding: "4px 10px", fontSize: "12px", color: "#2563eb", backgroundColor: "#ffffff", border: "1px solid #2563eb", borderRadius: "6px", cursor: "pointer" }}
                      >
                        編集
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: "6px 0 0 0", fontSize: "17px", fontWeight: "bold", color: "#111111" }}>
                    {e.site_name || "(現場名なし)"}
                  </p>

                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#333333" }}>
                    {e.names}
                    {supportText}
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

      {editingExpense && (
        <div
          onClick={closeEdit}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", zIndex: 50, overflowY: "auto" }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "420px", boxSizing: "border-box", marginTop: "20px", marginBottom: "20px" }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#111111", textAlign: "center" }}>
              経費を編集
            </h2>

            <p style={labelStyle}>日付</p>
            <input type="date" value={eDate} onChange={(ev) => setEDate(ev.target.value)} style={inputStyle} />

            <p style={labelStyle}>現場名</p>
            <input type="text" value={eSiteName} onChange={(ev) => setESiteName(ev.target.value)} style={inputStyle} />

            <p style={labelStyle}>氏名</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              {names.map((n) => (
                <button key={n} onClick={() => toggleEditName(n)} style={{ padding: "8px 14px", fontSize: "14px", borderRadius: "8px", border: eSelectedNames.includes(n) ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: eSelectedNames.includes(n) ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                  {n}
                </button>
              ))}
            </div>

            <p style={labelStyle}>応援</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              {["あり", "なし"].map((opt) => (
                <button key={opt} onClick={() => setEHasSupport(opt)} style={{ padding: "8px 14px", fontSize: "14px", borderRadius: "8px", border: eHasSupport === opt ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: eHasSupport === opt ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                  {opt}
                </button>
              ))}
            </div>

            {eHasSupport === "あり" && (
              <>
                <p style={labelStyle}>応援人数</p>
                <input type="number" value={eSupportCount} onChange={(ev) => setESupportCount(ev.target.value)} style={inputStyle} />

                {eSupportNames.length > 0 && (
                  <>
                    <p style={labelStyle}>応援者の氏名</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      {eSupportNames.map((n, i) => (
                        <input
                          key={i}
                          type="text"
                          value={n}
                          onChange={(ev) => updateSupportName(i, ev.target.value)}
                          placeholder={`応援者${i + 1}`}
                          style={inputStyle}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <p style={labelStyle}>駐車場代</p>
            <input type="number" value={eParkingFee} onChange={(ev) => setEParkingFee(ev.target.value)} style={inputStyle} />

            {eParkingFee && (
              <>
                <p style={labelStyle}>駐車場代を払った人</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                  {payerOptions.length === 0 && <p style={{ fontSize: "13px", color: "#999999" }}>先に氏名を選択してください</p>}
                  {payerOptions.map((n) => (
                    <button key={n} onClick={() => setEParkingPayer(n)} style={{ padding: "8px 14px", fontSize: "14px", borderRadius: "8px", border: eParkingPayer === n ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: eParkingPayer === n ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p style={labelStyle}>材料代</p>
            <input type="number" value={eMaterialFee} onChange={(ev) => setEMaterialFee(ev.target.value)} style={inputStyle} />

            {eMaterialFee && (
              <>
                <p style={labelStyle}>材料代を払った人</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                  {payerOptions.length === 0 && <p style={{ fontSize: "13px", color: "#999999" }}>先に氏名を選択してください</p>}
                  {payerOptions.map((n) => (
                    <button key={n} onClick={() => setEMaterialPayer(n)} style={{ padding: "8px 14px", fontSize: "14px", borderRadius: "8px", border: eMaterialPayer === n ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: eMaterialPayer === n ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p style={labelStyle}>領収書（追加のみ可能、削除不可）</p>
            {eExistingPhotos.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {eExistingPhotos.map((url, i) => (
                  <img key={i} src={url} alt={`領収書${i + 1}`} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc" }} />
                ))}
              </div>
            )}

            <label
              htmlFor="add-photo-input"
              style={{ display: "inline-block", marginTop: "10px", padding: "10px 18px", fontSize: "14px", fontWeight: "bold", color: "#2563eb", border: "2px dashed #2563eb", borderRadius: "10px", backgroundColor: "#eff6ff", cursor: "pointer" }}
            >
              ＋ 領収書を追加
            </label>
            <input id="add-photo-input" type="file" accept="image/*" onChange={handleAddPhoto} style={{ display: "none" }} />

            {eNewPhotos.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {eNewPhotos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p.previewUrl} alt={`新しい領収書${i + 1}`} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc" }} />
                    <button onClick={() => removeNewPhoto(i)} style={{ position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "12px", cursor: "pointer", lineHeight: "20px" }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {eMessage && (
              <p style={{ marginTop: "10px", fontSize: "13px", color: "#dc2626", textAlign: "center" }}>{eMessage}</p>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={async () => {
                  if (!editingExpense) return;
                  const ok = window.confirm(`${editingExpense.date} ${editingExpense.site_name} の経費を削除しますか?`);
                  if (!ok) return;
                  const { error } = await supabase.from("expenses").delete().eq("id", editingExpense.id);
                  if (error) {
                    alert("削除に失敗しました：" + error.message);
                  } else {
                    closeEdit();
                    fetchExpenses();
                  }
                }}
                style={{ padding: "10px 18px", fontSize: "15px", color: "#ffffff", backgroundColor: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                削除
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={closeEdit} style={{ padding: "10px 18px", fontSize: "15px", color: "#555555", backgroundColor: "#ffffff", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}>
                  キャンセル
                </button>
                <button onClick={handleSaveEdit} disabled={eSaving} style={{ padding: "10px 18px", fontSize: "15px", color: "#ffffff", backgroundColor: eSaving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: "8px", cursor: eSaving ? "default" : "pointer" }}>
                  {eSaving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}