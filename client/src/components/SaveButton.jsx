import { useState } from "react";

export default function SaveButton({ transcript, audioBlob }) {
  const [status, setStatus] = useState("idle");
  const [stepMsg, setStepMsg] = useState("");

  const canSave = transcript.trim() && status === "idle";

  const handleSave = async () => {
    if (!canSave) return;
    setStatus("saving");

    const timestamp = new Date().toISOString();

    try {
      setStepMsg("Saving transcript…");
      const txRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, timestamp }),
      });
      const txData = await txRes.json();
      if (!txData.success) throw new Error(txData.error || "Transcript save failed");

      const { sessionId } = txData;

      if (audioBlob) {
        setStepMsg("Uploading audio…");
        const audioRes = await fetch(`/api/sessions/${sessionId}/audio`, {
          method: "POST",
          headers: { "Content-Type": "audio/webm" },
          body: audioBlob,
        });
        const audioData = await audioRes.json();
        if (!audioData.success) throw new Error(audioData.error || "Audio upload failed");
      }

      setStatus("saved");
      setStepMsg("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setStatus("error");
      setStepMsg(err.message);
      setTimeout(() => { setStatus("idle"); setStepMsg(""); }, 4000);
    }
  };

  const label =
    status === "saving" ? stepMsg || "Saving…"
    : status === "saved" ? "✓ Saved!"
    : status === "error" ? "✗ Error"
    : audioBlob ? "Save Session + Audio"
    : "Save Session";

  return (
    <button
      className={`save-btn ${status}`}
      onClick={handleSave}
      disabled={!canSave}
      title={!audioBlob && transcript.trim() ? "No audio recorded yet — text only" : ""}
    >
      {label}
    </button>
  );
}
