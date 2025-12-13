"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface PhotoUploadProps {
  photoUrl: string | null;
  onPhotoChange: (photoUrl: string | null) => void;
  uploadEndpoint: string;
  disabled?: boolean;
}

export default function PhotoUpload({
  photoUrl,
  onPhotoChange,
  uploadEndpoint,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");

    // ファイルタイプチェック
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG、PNG、WebP形式のみ対応しています");
      return;
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onPhotoChange(data.photoUrl);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "アップロードに失敗しました");
      }
    } catch (err) {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDelete = async () => {
    if (!confirm("写真を削除しますか？")) return;

    setUploading(true);
    try {
      const res = await fetch(uploadEndpoint, {
        method: "DELETE",
      });

      if (res.ok) {
        onPhotoChange(null);
      } else {
        setError("削除に失敗しました");
      }
    } catch (err) {
      setError("削除に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {photoUrl ? (
        // 写真がある場合
        <div className="relative group">
          <div className="w-[120px] h-[160px] border-2 border-[#dfe3eb] rounded-lg overflow-hidden bg-white">
            <Image
              src={photoUrl}
              alt="証明写真"
              width={120}
              height={160}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-white text-xs bg-[#ff7a59] hover:bg-[#e8573f] px-3 py-1.5 rounded-lg transition-colors"
              >
                変更
              </button>
              <button
                onClick={handleDelete}
                disabled={uploading}
                className="text-white text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                削除
              </button>
            </div>
          )}
        </div>
      ) : (
        // 写真がない場合
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            w-[120px] h-[160px] border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center gap-2
            transition-colors cursor-pointer
            ${dragOver ? "border-[#ff7a59] bg-[#ff7a59]/10" : "border-[#dfe3eb] bg-[#f5f8fa]"}
            ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-[#ff7a59] hover:bg-[#ff7a59]/5"}
          `}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-[#ff7a59] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="text-3xl text-[#7c98b6]">📷</div>
              <div className="text-xs text-[#7c98b6] text-center px-2">
                クリックまたは<br />ドラッグ&ドロップ
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <p className="text-xs text-[#7c98b6]">
        JPG/PNG/WebP • 5MB以下
      </p>
    </div>
  );
}









