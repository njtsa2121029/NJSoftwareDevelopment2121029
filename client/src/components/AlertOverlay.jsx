import { useEffect } from "react";

export default function AlertOverlay({ alert }) {
  // haptic feedback on mobile when a danger word is detected
  useEffect(() => {
    if (alert?.level === "danger" && navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
    }
  }, [alert]);

  if (!alert) return null;

  if (alert.level === "danger") {
    return (
      <div className="alert-overlay danger" role="alert" aria-live="assertive">
        <div className="alert-content">
          <span className="alert-icon">⚠️</span>
          <p className="alert-title">ALERT DETECTED</p>
          <p className="alert-word">[ {alert.word} ]</p>
        </div>
      </div>
    );
  }

  if (alert.level === "attention") {
    return (
      <div className="alert-overlay attention" role="alert" aria-live="polite">
        <span>⚡ Attention: </span>
        <span className="alert-word-inline">[ {alert.word} ]</span>
      </div>
    );
  }

  return null;
}
