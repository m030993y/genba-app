"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../supabase";

type PhotoItem = {
  file: File;
  previewUrl: string;
};

function EntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(searchParams.get("date") || today);
  const [siteName, setSiteName] = useState(searchParams.get("site") || "");
  const memo = searchParams.get("memo") || "";
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [hasSupport, setHasSupport] = useState("");
  const [supportCount, setSupportCount] = useState("");
  const [parkingFee, setParkingFee] = useState("");
  const [parkingPayer, setParkingPayer] = useState("");
  const [materialFee, setMaterialFee] = useState("");
  const [materialPayer, setMaterialPayer] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const names = ["冨澤", "岡田", "岩内"];

  const toggleName = (name: string) => {
    let updatedNames: string[];
    if (selectedNames.includes(name)) {
      updatedNames = selectedNames.filter((n) => n !== name);
      if (parkingPayer === name) setParkingPayer("");
      if (materialPayer === name) setMaterialPayer("");
    } else {
      updatedNames = [...selectedNames, name];
    }
    setSelectedNames(updatedNames);
    if (updatedNames.length === 1) {
      setParkingPayer(updatedNames[0]);
      setMaterialPayer(updatedNames[0]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPhotos: PhotoItem[] = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setPhotos([...photos, ...newPhotos]);
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const photoUrls: string[] = [];

    for (const photo of photos) {
      const extension = photo.file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, photo.file);
      if (uploadError) {
        setMessage("写真のアップロードに失敗しました：" + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      photoUrls.push(publicUrlData.publicUrl);
    }

    const { error } = await supabase.from("expenses").insert({
      date: date,
      site_name: siteName,
      names: selectedNames.join("、"),
      has_support: hasSupport,
      support_count: hasSupport === "あり" ? Number(supportCount) : null,
      parking_fee: parkingFee ? Number(parkingFee) : null,
      parking_payer: parkingPayer || null,
      material_fee: materialFee ? Number(materialFee) : null,
      material_payer: materialPayer || null,
      photo_url: photoUrls.join("、"),
    });

    setSaving(false);

    if (error) {
      setMessage("保存に失敗しました：" + error.message);
    } else {
      setMessage("保存しました！");
      setSiteName("");
      setSelectedNames([]);
      setHasSupport("");
      setSupportCount("");
      setParkingFee("");
      setParkingPayer("");
      setMaterialFee("");
      setMaterialPayer("");
      setPhotos([]);
    }
  };

  const payerOptions = selectedNames;

  const inputStyle: React.CSSProperties = {
    marginTop: "8px",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#111111",
  };

  const labelStyle: React.CSSProperties = {
    marginTop: "24px",
    fontSize: "18px",
    color: "#111111",
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <button
        onClick={() => router.push("/")}
        style={{ display: "inline-block", marginBottom: "16px", padding: "8px 16px", fontSize: "14px", color: "#2563eb", backgroundColor: "#ffffff", border: "1px solid #2563eb", borderRadius: "8px", cursor: "pointer" }}
      >
        ＜ カレンダーに戻る
      </button>

      <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#111111" }}>現場経費アプリ</h1>

      {memo && (
        <div style={{ marginTop: "16px", padding: "12px 16px", backgroundColor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", color: "#111111", fontSize: "14px", whiteSpace: "pre-wrap", textAlign: "left" }}>
          📝 {memo}
        </div>
      )}

      <p style={labelStyle}>日付</p>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />

      <p style={labelStyle}>現場名</p>
      <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="例：鵠沼" style={{ ...inputStyle, width: "200px", textAlign: "center" }} />

      <p style={labelStyle}>氏名を選択</p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px" }}>
        {names.map((name) => (
          <button key={name} onClick={() => toggleName(name)} style={{ padding: "12px 20px", fontSize: "16px", borderRadius: "8px", border: selectedNames.includes(name) ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: selectedNames.includes(name) ? "#dbeafe" : "#ffffff", color: "#111111" }}>
            {name}
          </button>
        ))}
      </div>

      <p style={labelStyle}>応援の有無</p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px" }}>
        {["あり", "なし"].map((option) => (
          <button key={option} onClick={() => setHasSupport(option)} style={{ padding: "12px 20px", fontSize: "16px", borderRadius: "8px", border: hasSupport === option ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: hasSupport === option ? "#dbeafe" : "#ffffff", color: "#111111" }}>
            {option}
          </button>
        ))}
      </div>

      {hasSupport === "あり" && (
        <>
          <p style={labelStyle}>応援人数</p>
          <input type="number" value={supportCount} onChange={(e) => setSupportCount(e.target.value)} placeholder="例:1" style={{ ...inputStyle, width: "100px", textAlign: "center" }} />
        </>
      )}

      <p style={labelStyle}>駐車場代</p>
      <input type="number" value={parkingFee} onChange={(e) => setParkingFee(e.target.value)} placeholder="例:800" style={{ ...inputStyle, width: "140px", textAlign: "center" }} />

      {parkingFee && (
        <>
          <p style={{ marginTop: "12px", fontSize: "15px", color: "#555555" }}>駐車場代を払った人</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
            {payerOptions.length === 0 && <p style={{ fontSize: "13px", color: "#999999" }}>先に氏名を選択してください</p>}
            {payerOptions.map((name) => (
              <button key={name} onClick={() => setParkingPayer(name)} style={{ padding: "10px 16px", fontSize: "15px", borderRadius: "8px", border: parkingPayer === name ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: parkingPayer === name ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      <p style={labelStyle}>材料代</p>
      <input type="number" value={materialFee} onChange={(e) => setMaterialFee(e.target.value)} placeholder="例:4800" style={{ ...inputStyle, width: "140px", textAlign: "center" }} />

      {materialFee && (
        <>
          <p style={{ marginTop: "12px", fontSize: "15px", color: "#555555" }}>材料代を払った人</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
            {payerOptions.length === 0 && <p style={{ fontSize: "13px", color: "#999999" }}>先に氏名を選択してください</p>}
            {payerOptions.map((name) => (
              <button key={name} onClick={() => setMaterialPayer(name)} style={{ padding: "10px 16px", fontSize: "15px", borderRadius: "8px", border: materialPayer === name ? "2px solid #2563eb" : "1px solid #ccc", backgroundColor: materialPayer === name ? "#dbeafe" : "#ffffff", color: "#111111" }}>
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      <p style={labelStyle}>領収書(複数枚OK)</p>
      <label htmlFor="photo-input" style={{ display: "inline-block", marginTop: "8px", padding: "16px 28px", fontSize: "16px", fontWeight: "bold", color: "#2563eb", border: "2px dashed #2563eb", borderRadius: "12px", backgroundColor: "#eff6ff", cursor: "pointer" }}>
        タップして撮影・追加
      </label>
      <input id="photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: "none" }} />

      {photos.length > 0 && (
        <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          {photos.map((photo, index) => (
            <div key={index} style={{ position: "relative" }}>
              <img src={photo.previewUrl} alt={`領収書${index + 1}`} style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", border: "1px solid #ccc" }} />
              <button onClick={() => removePhoto(index)} style={{ position: "absolute", top: "-8px", right: "-8px", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "14px", cursor: "pointer", lineHeight: "24px" }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && <p style={{ marginTop: "8px", fontSize: "13px", color: "#888888" }}>{photos.length}枚選択中</p>}

      <div style={{ marginTop: "32px" }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "14px 40px", fontSize: "18px", fontWeight: "bold", color: "#ffffff", backgroundColor: saving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: "10px", cursor: saving ? "default" : "pointer" }}>
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {message && (
        <p style={{ marginTop: "16px", fontSize: "16px", color: message.includes("失敗") ? "#dc2626" : "#16a34a" }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>読み込み中...</div>}>
      <EntryForm />
    </Suspense>
  );
}