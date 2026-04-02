import { useState, useEffect } from "react";

// converts the s3-safe session id back to a readable date string
function formatSessionId(id) {
  try {
    const iso = id.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z");
    return new Date(iso).toLocaleString();
  } catch {
    return id;
  }
}

function SessionDetail({ sessionId, onClose }) {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/transcript`)
      .then((r) => r.text())
      .then((text) => { setTranscript(text); setLoading(false); })
      .catch(() => { setTranscript("Could not load transcript."); setLoading(false); });
  }, [sessionId]);

  const audioUrl = `/api/sessions/${sessionId}/audio`;

  return (
    <div className="session-detail">
      <div className="session-detail-header">
        <span className="session-detail-title">{formatSessionId(sessionId)}</span>
        <button className="session-detail-close" onClick={onClose}>✕ Close</button>
      </div>

      <div className="session-audio">
        <span className="panel-label">AUDIO PLAYBACK</span>
        <audio controls src={audioUrl} className="audio-player">
          Your browser does not support audio playback.
        </audio>
      </div>

      <div className="session-transcript">
        <span className="panel-label">TRANSCRIPT</span>
        {loading ? (
          <p className="session-loading">Loading…</p>
        ) : (
          <pre className="transcript-text">{transcript}</pre>
        )}
      </div>
    </div>
  );
}

export default function SessionsPanel({ onClose }) {
  const [sessions, setSessions]    = useState([]);
  const [loading, setLoading]      = useState(true);
  const [activeSession, setActive] = useState(null);
  const [error, setError]          = useState(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); })
      .catch(() => { setError("Failed to load sessions."); setLoading(false); });
  }, []);

  return (
    <div className="sessions-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sessions-modal">

        <div className="sessions-header">
          <h2 className="sessions-title">Saved Sessions</h2>
          <button className="sessions-close" onClick={onClose}>✕</button>
        </div>

        {activeSession ? (
          <SessionDetail
            sessionId={activeSession}
            onClose={() => setActive(null)}
          />
        ) : (
          <div className="sessions-list">
            {loading && <p className="session-loading">Loading sessions…</p>}
            {error   && <p className="session-error">{error}</p>}

            {!loading && !error && sessions.length === 0 && (
              <p className="session-empty">No saved sessions yet. Record something and hit Save!</p>
            )}

            {sessions.map(({ sessionId }) => (
              <button
                key={sessionId}
                className="session-item"
                onClick={() => setActive(sessionId)}
              >
                <span className="session-item-icon">🎙</span>
                <span className="session-item-date">{formatSessionId(sessionId)}</span>
                <span className="session-item-arrow">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
