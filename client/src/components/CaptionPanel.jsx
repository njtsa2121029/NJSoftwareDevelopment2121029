import { useEffect, useRef } from "react";

function highlightKeyword(text, word, level) {
  if (!word) return text;
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return text;

  const markClass = level === "danger" ? "mark-danger" : "mark-attention";
  return (
    <>
      {text.slice(0, idx)}
      <mark className={markClass}>{text.slice(idx, idx + word.length)}</mark>
      {text.slice(idx + word.length)}
    </>
  );
}

export default function CaptionPanel({ lines, partialText, dangerKeywords, attentionKeywords }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, partialText]);

  function detectKeywordInLine(text) {
    const lower = text.toLowerCase();
    const danger = dangerKeywords.find((kw) => lower.includes(kw.toLowerCase()));
    if (danger) return { word: danger, level: "danger" };
    const attention = attentionKeywords.find((kw) => lower.includes(kw.toLowerCase()));
    if (attention) return { word: attention, level: "attention" };
    return null;
  }

  return (
    <div className="caption-panel">
      <span className="panel-label">LIVE CAPTIONS</span>
      <div className="caption-scroll">
        {lines.length === 0 && !partialText && (
          <p className="caption-placeholder">Captions will appear here when recording starts…</p>
        )}

        {lines.map((line, i) => {
          const match = detectKeywordInLine(line);
          return (
            <p key={i} className="caption-line final">
              {match ? highlightKeyword(line, match.word, match.level) : line}
            </p>
          );
        })}

        {partialText && (
          <p className="caption-line partial">{partialText}</p>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
