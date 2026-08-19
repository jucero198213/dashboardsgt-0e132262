import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles } from "@/hooks/useProfiles";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl: string | null;
  onUpdated: (url: string) => void;
}

async function getCroppedImg(imageSrc: string, croppedAreaPixels: Area): Promise<Blob> {
  const image = await createImageBitmap(await (await fetch(imageSrc)).blob());
  const canvas = document.createElement("canvas");
  const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, size, size
  );
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.92));
}

export function AvatarUploadModal({ open, onClose, userId, currentAvatarUrl, onUpdated }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upsertProfile } = useProfiles();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setError(null);
    try {
      // Ensure bucket exists (idempotent — ignores "already exists" error)
      await supabase.storage.createBucket("avatars", {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      }).catch(() => {});

      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await upsertProfile(userId, { avatar_url: url });
      onUpdated(url);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar foto";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col rounded-2xl border p-5 w-[360px] gap-4"
        style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold dark:text-white text-slate-800">Foto de perfil</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
          >×</button>
        </div>

        {/* Crop area or file picker */}
        {imageSrc ? (
          <>
            <div className="relative w-full h-[260px] rounded-xl overflow-hidden" style={{ background: "#111" }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range" min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            {error && (
              <p className="text-[11px] text-rose-400 text-center">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setImageSrc(null)}
                className="flex-1 rounded-xl border py-2 text-[12px] font-semibold text-slate-400 transition-colors hover:text-slate-200"
                style={{ borderColor: "var(--sgt-border-subtle)", background: "transparent" }}
              >
                Trocar foto
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 rounded-xl py-2 text-[12px] font-bold transition-all"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
              >
                {uploading ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--sgt-border-subtle)")}
          >
            <span className="text-3xl">📷</span>
            <span className="text-[12px] text-slate-500">Clique para escolher uma foto</span>
            <span className="text-[10px] text-slate-600">JPG, PNG ou WebP · máx. 5MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
        )}

        {/* Current avatar preview */}
        {currentAvatarUrl && !imageSrc && (
          <div className="flex items-center gap-3 pt-1">
            <img src={currentAvatarUrl} alt="avatar atual" className="h-9 w-9 rounded-full object-cover" style={{ border: "1px solid var(--sgt-border-subtle)" }} />
            <span className="text-[11px] text-slate-500">Foto atual</span>
          </div>
        )}
      </div>
    </div>
  );
}
