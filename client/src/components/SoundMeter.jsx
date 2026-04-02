import { useEffect, useState, useRef } from "react";

export default function SoundMeter({ analyserNode, isActive }) {
  const [level, setLevel] = useState(0);
  const [label, setLabel] = useState("Quiet");
  const rafRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      rafRef.current = requestAnimationFrame(measure);

      if (!analyserNode || !isActive) {
        setLevel(0);
        setLabel("Quiet");
        return;
      }

      const bufferLength = analyserNode.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / bufferLength);
      const normalized = Math.min(100, (rms / 255) * 100 * 3);

      setLevel(normalized);
      setLabel(normalized < 20 ? "Quiet" : normalized < 60 ? "Moderate" : "Loud");
    };

    measure();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isActive]);

  const barColor = level < 20 ? "#00d4aa" : level < 60 ? "#ffaa00" : "#ff2233";

  return (
    <div className="sound-meter">
      <span className="panel-label">SOUND LEVEL</span>
      <div className="meter-bar-bg">
        <div
          className="meter-bar-fill"
          style={{ width: `${level}%`, background: barColor }}
        />
      </div>
      <span className="meter-label" style={{ color: barColor }}>
        {label}
      </span>
    </div>
  );
}
