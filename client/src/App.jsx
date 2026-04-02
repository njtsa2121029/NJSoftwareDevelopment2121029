import { useState, useCallback, useRef } from "react";

import Waveform      from "./components/Waveform";
import SoundMeter    from "./components/SoundMeter";
import CaptionPanel  from "./components/CaptionPanel";
import SaveButton    from "./components/SaveButton";
import AlertOverlay  from "./components/AlertOverlay";
import KeywordConfig from "./components/KeywordConfig";
import UsageDisplay  from "./components/UsageDisplay";
import SessionsPanel from "./components/SessionsPanel";

import { useMicrophone }       from "./hooks/useMicrophone";
import { useWebSocket }        from "./hooks/useWebSocket";
import { useKeywordDetection } from "./hooks/useKeywordDetection";
import { useTranscribeUsage }  from "./hooks/useTranscribeUsage";

import { DANGER_KEYWORDS, ATTENTION_KEYWORDS } from "./constants/keywords";

export default function App() {
  const [isRecording, setIsRecording]   = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const [finalLines, setFinalLines]       = useState([]);
  const [partialText, setPartialText]     = useState("");
  const [lastFinalLine, setLastFinalLine] = useState("");

  const [dangerKeywords, setDangerKeywords]       = useState(DANGER_KEYWORDS);
  const [attentionKeywords, setAttentionKeywords] = useState(ATTENTION_KEYWORDS);

  const [errorMsg, setErrorMsg] = useState(null);

  const { alert } = useKeywordDetection(lastFinalLine, dangerKeywords, attentionKeywords);

  const handleWsMessage = useCallback((data) => {
    if (data.type === "transcript") {
      if (data.isFinal) {
        setFinalLines((prev) => [...prev, data.text]);
        setPartialText("");
        setLastFinalLine(data.text);
      } else {
        setPartialText(data.text);
      }
    } else if (data.type === "error") {
      setErrorMsg(`Transcription error: ${data.message}`);
    }
  }, []);

  const { connect, disconnect, sendAudio } = useWebSocket({ onMessage: handleWsMessage });

  const { startMic, stopMic, analyserNode, audioBlob, error: micError } = useMicrophone({
    onAudioChunk: sendAudio,
  });

  // use refs so the usage hook can call stop without a stale closure
  const stopMicRef    = useRef(stopMic);
  const disconnectRef = useRef(disconnect);
  stopMicRef.current    = stopMic;
  disconnectRef.current = disconnect;

  const handleStop = useCallback(() => {
    stopMicRef.current();
    disconnectRef.current();
    setIsRecording(false);
    setPartialText("");
  }, []);

  const { sessionSeconds, monthlySeconds, remainingSeconds, isWarning, isAtLimit } =
    useTranscribeUsage({ isRecording, onAutoStop: handleStop });

  const handleStart = async () => {
    if (isAtLimit) {
      setErrorMsg("Monthly free-tier limit reached (58 min). Recording blocked — no charges incurred.");
      return;
    }
    setErrorMsg(null);
    setIsConnecting(true);
    connect();
    await new Promise((r) => setTimeout(r, 500));
    await startMic();
    setIsConnecting(false);
    setIsRecording(true);
  };

  const handleKeywordUpdate = ({ dangerKeywords: dk, attentionKeywords: ak }) => {
    setDangerKeywords(dk);
    setAttentionKeywords(ak);
  };

  const fullTranscript = finalLines.join("\n");

  return (
    <>
      <AlertOverlay alert={alert} />
      {showSessions && <SessionsPanel onClose={() => setShowSessions(false)} />}

      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-title">
            <span className="title-echo">Echo</span>
            <span className="title-sense">Sense</span>
          </h1>
          <p className="app-subtitle">Real-time accessibility captions</p>
          <p className="app-competition">TSA 2026 Competition</p>
          <div className={`status-indicator ${isRecording ? "status-recording" : "status-idle"}`}>
            <span className="status-dot" />
            <span className="status-text">{isRecording ? "RECORDING" : "IDLE"}</span>
          </div>
        </header>

        <UsageDisplay
          sessionSeconds={sessionSeconds}
          monthlySeconds={monthlySeconds}
          remainingSeconds={remainingSeconds}
          isWarning={isWarning}
          isAtLimit={isAtLimit}
          isRecording={isRecording}
        />

        <div className="viz-row">
          <Waveform   analyserNode={analyserNode} isActive={isRecording} />
          <SoundMeter analyserNode={analyserNode} isActive={isRecording} />
        </div>

        <CaptionPanel
          lines={finalLines}
          partialText={partialText}
          dangerKeywords={dangerKeywords}
          attentionKeywords={attentionKeywords}
        />

        {(errorMsg || micError) && (
          <div className="error-banner" role="alert">{errorMsg || micError}</div>
        )}
        {isConnecting && (
          <div className="status-banner">
            <span className="spinner" /> Connecting to transcription service…
          </div>
        )}

        <div className="control-bar">
          {isRecording ? (
            <button className="primary-btn stop-btn" onClick={handleStop}>⏹ Stop</button>
          ) : (
            <button
              className="primary-btn start-btn"
              onClick={handleStart}
              disabled={isConnecting || isAtLimit}
              title={isAtLimit ? "Monthly free-tier limit reached" : ""}
            >
              {isConnecting ? "Starting…" : "▶ Start"}
            </button>
          )}

          <SaveButton transcript={fullTranscript} audioBlob={audioBlob} />

          <button className="sessions-btn" onClick={() => setShowSessions(true)}>
            🗂 Sessions
          </button>

          <KeywordConfig
            dangerKeywords={dangerKeywords}
            attentionKeywords={attentionKeywords}
            onUpdate={handleKeywordUpdate}
          />
        </div>
      </div>
    </>
  );
}
