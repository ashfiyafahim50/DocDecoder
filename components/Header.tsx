"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Moon, Sun, Stethoscope, Languages } from "lucide-react";

interface HeaderProps {
  language: string;
  onLanguageChange: (lang: string) => void;
}

export function Header({ language, onLanguageChange }: HeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("doc_theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("doc_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand-group">
          <div className="brand-icon-box">
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="brand-title">
              Doc Decoder
              <span className="brand-badge">Clinical Grade</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-light)" }}>
              Human-in-the-Loop Report Translation
            </div>
          </div>
        </div>

        <div className="header-controls">
          <div className="privacy-ribbon" title="Stateless Architecture: zero patient data is ever logged or stored.">
            <ShieldCheck size={14} style={{ color: "#10b981" }} />
            <span>0 Data Stored</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Languages size={15} style={{ color: "var(--text-muted)" }} />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="table-input"
              style={{
                fontSize: "12px",
                padding: "5px 8px",
                fontWeight: 600,
                width: "auto",
                cursor: "pointer",
              }}
            >
              <option value="hinglish">Hinglish (Hindi-English)</option>
              <option value="hindi">Hindi (हिंदी)</option>
              <option value="english">English</option>
              <option value="bengali">Bengali (বাংলা)</option>
              <option value="tamil">Tamil (தமிழ்)</option>
              <option value="telugu">Telugu (తెలుగు)</option>
            </select>
          </div>

          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ padding: "6px 10px" }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
