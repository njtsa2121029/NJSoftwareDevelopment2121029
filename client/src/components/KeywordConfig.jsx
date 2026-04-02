import { useState } from "react";

export default function KeywordConfig({ dangerKeywords, attentionKeywords, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [dangerInput, setDangerInput] = useState("");
  const [attentionInput, setAttentionInput] = useState("");

  const addKeyword = (list, value, key) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || list.includes(trimmed)) return;
    onUpdate({ dangerKeywords, attentionKeywords, [key]: [...list, trimmed] });
  };

  const removeKeyword = (list, word, key) => {
    onUpdate({ dangerKeywords, attentionKeywords, [key]: list.filter((k) => k !== word) });
  };

  return (
    <div className="keyword-config">
      <button className="config-toggle" onClick={() => setOpen((o) => !o)} title="Keyword Settings">
        ⚙️ Keywords
      </button>

      {open && (
        <div className="config-panel">
          <section>
            <h3 className="config-section-title danger-title">🔴 Danger Keywords</h3>
            <div className="pill-row">
              {dangerKeywords.map((kw) => (
                <span key={kw} className="pill pill-danger">
                  {kw}
                  <button
                    className="pill-remove"
                    onClick={() => removeKeyword(dangerKeywords, kw, "dangerKeywords")}
                    aria-label={`Remove ${kw}`}
                  >✕</button>
                </span>
              ))}
            </div>
            <div className="add-row">
              <input
                className="config-input"
                value={dangerInput}
                onChange={(e) => setDangerInput(e.target.value)}
                placeholder="Add danger keyword…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(dangerKeywords, dangerInput, "dangerKeywords");
                    setDangerInput("");
                  }
                }}
              />
              <button
                className="add-btn"
                onClick={() => { addKeyword(dangerKeywords, dangerInput, "dangerKeywords"); setDangerInput(""); }}
              >Add</button>
            </div>
          </section>

          <section>
            <h3 className="config-section-title attention-title">🟡 Attention Keywords</h3>
            <div className="pill-row">
              {attentionKeywords.map((kw) => (
                <span key={kw} className="pill pill-attention">
                  {kw}
                  <button
                    className="pill-remove"
                    onClick={() => removeKeyword(attentionKeywords, kw, "attentionKeywords")}
                    aria-label={`Remove ${kw}`}
                  >✕</button>
                </span>
              ))}
            </div>
            <div className="add-row">
              <input
                className="config-input"
                value={attentionInput}
                onChange={(e) => setAttentionInput(e.target.value)}
                placeholder="Add attention keyword…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(attentionKeywords, attentionInput, "attentionKeywords");
                    setAttentionInput("");
                  }
                }}
              />
              <button
                className="add-btn"
                onClick={() => { addKeyword(attentionKeywords, attentionInput, "attentionKeywords"); setAttentionInput(""); }}
              >Add</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
