import { HARD_STOP_SECONDS } from "../hooks/useTranscribeUsage";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function UsageDisplay({
  sessionSeconds,
  monthlySeconds,
  remainingSeconds,
  isWarning,
  isAtLimit,
  isRecording,
}) {
  const usedPct  = Math.min(100, (monthlySeconds / HARD_STOP_SECONDS) * 100);
  const barColor = isAtLimit ? "#ff2233" : isWarning ? "#ffaa00" : "#00d4aa";

  return (
    <div className={`usage-display ${isWarning ? "usage-warn" : ""} ${isAtLimit ? "usage-limit" : ""}`}>

      <div className="usage-row">
        <div className="usage-stat">
          <span className="usage-label">SESSION</span>
          <span className="usage-value mono">
            {isRecording ? fmt(sessionSeconds) : "--:--"}
          </span>
        </div>

        <div className="usage-divider" />

        <div className="usage-stat">
          <span className="usage-label">MONTH USED</span>
          <span className="usage-value mono" style={{ color: barColor }}>
            {fmt(monthlySeconds)}
          </span>
        </div>

        <div className="usage-divider" />

        <div className="usage-stat">
          <span className="usage-label">FREE TIME LEFT</span>
          <span className="usage-value mono" style={{ color: barColor }}>
            {fmt(remainingSeconds)}
          </span>
        </div>
      </div>

      <div className="usage-bar-bg" title={`${Math.round(usedPct)}% of free tier used`}>
        <div
          className="usage-bar-fill"
          style={{ width: `${usedPct}%`, background: barColor }}
        />
      </div>

      {isAtLimit && (
        <p className="usage-msg limit-msg">
          Monthly free-tier limit reached — recording stopped. No charges incurred.
        </p>
      )}
      {isWarning && (
        <p className="usage-msg warn-msg">
          ⚠ Approaching free tier limit — {fmt(remainingSeconds)} remaining this month.
        </p>
      )}
    </div>
  );
}
