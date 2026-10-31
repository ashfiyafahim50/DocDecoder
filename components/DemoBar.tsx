"use client";

import React from "react";
import { Sparkles, FileText, AlertTriangle, Pill, Scan } from "lucide-react";
import { DEMO_SAMPLES, DemoSample } from "@/lib/demo-data";

interface DemoBarProps {
  activeSampleId: string | null;
  onSelectSample: (sample: DemoSample) => void;
  onClearSample: () => void;
}

export function DemoBar({ activeSampleId, onSelectSample, onClearSample }: DemoBarProps) {
  return (
    <div className="golden-bar">
      <div className="container golden-bar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Sparkles size={13} style={{ color: "var(--brand-blue)" }} />
          <span>Demo Presets:</span>
        </div>

        {DEMO_SAMPLES.map((sample) => {
          const isActive = activeSampleId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className={`golden-pill ${isActive ? "active" : ""}`}
              title={sample.description}
            >
              {sample.id === "critical-potassium" ? (
                <AlertTriangle size={13} style={{ color: isActive ? "#ffffff" : "#ef4444" }} />
              ) : sample.docType === "prescription" ? (
                <Pill size={13} style={{ color: isActive ? "#ffffff" : "#3b82f6" }} />
              ) : sample.docType === "radiology_imaging" ? (
                <Scan size={13} style={{ color: isActive ? "#ffffff" : "#8b5cf6" }} />
              ) : (
                <FileText size={13} />
              )}
              <span>{sample.title}</span>
            </button>
          );
        })}

        {activeSampleId && (
          <button
            onClick={onClearSample}
            className="golden-pill"
            style={{ color: "var(--text-light)", borderColor: "transparent" }}
          >
            Clear Preset
          </button>
        )}
      </div>
    </div>
  );
}
