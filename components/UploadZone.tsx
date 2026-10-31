"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Camera, Image as ImageIcon, ShieldAlert, CheckCircle2 } from "lucide-react";

interface UploadZoneProps {
  onImageProcessed: (base64: string, previewUrl: string, stats: { originalKb: number; compressedKb: number }) => void;
  isLoading: boolean;
}

export function UploadZone({ onImageProcessed, isLoading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /**
   * Resizes image to max ~1600px on the longest side, converts to clean JPEG, and strips EXIF.
   */
  const processImageFile = (file: File) => {
    setErrorMsg(null);

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    const originalKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        // Draw to canvas to strip EXIF metadata
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Could not process image on canvas.");
          return;
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality JPEG
        const base64Jpeg = canvas.toDataURL("image/jpeg", 0.88);
        const compressedKb = Math.round((base64Jpeg.length * 3) / 4 / 1024);

        onImageProcessed(base64Jpeg, base64Jpeg, {
          originalKb,
          compressedKb,
        });
      };

      img.onerror = () => {
        setErrorMsg("Failed to decode image data.");
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto 0" }}>
      <div
        className={`dropzone ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
        />

        <div
          style={{
            width: "60px",
            height: "60px",
            background: "var(--brand-light)",
            color: "var(--brand-blue)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          {isLoading ? <div className="spinner" /> : <UploadCloud size={30} />}
        </div>

        <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
          Upload Lab Report or Prescription
        </h3>
        <p style={{ fontSize: "13.5px", marginBottom: "20px" }}>
          Drag & drop report photo, or browse from device
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImageIcon size={15} />
            <span>Select File</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading}
          >
            <Camera size={15} />
            <span>Use Camera</span>
          </button>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            fontSize: "12px",
            color: "var(--text-light)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            Auto EXIF Stripped
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            Client 1600px Resized
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            No Storage / In-Memory Only
          </span>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "var(--status-danger-bg)",
            color: "var(--status-danger-text)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
