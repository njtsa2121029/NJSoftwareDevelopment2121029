import { useState, useEffect } from "react";

export function useKeywordDetection(transcriptLine, dangerKeywords, attentionKeywords) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!transcriptLine) return;
    const lower = transcriptLine.toLowerCase();

    // danger takes priority over attention
    const dangerHit = dangerKeywords.find(kw => lower.includes(kw.toLowerCase()));
    if (dangerHit) {
      setAlert({ level: "danger", word: dangerHit.toUpperCase() });
      return;
    }

    const attentionHit = attentionKeywords.find(kw => lower.includes(kw.toLowerCase()));
    if (attentionHit) {
      setAlert({ level: "attention", word: attentionHit.toUpperCase() });
    }
  }, [transcriptLine, dangerKeywords, attentionKeywords]);

  // auto-dismiss after 4 seconds
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  return { alert };
}
