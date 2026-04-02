import { useEffect, useRef } from "react";

export default function Waveform({ analyserNode, isActive }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, W, H);

      if (!analyserNode || !isActive) {
        // flat line when idle
        ctx.beginPath();
        ctx.strokeStyle = "#00B84A44";
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.beginPath();
      ctx.strokeStyle = "#00B84A";
      ctx.lineWidth = 2;

      const sliceWidth = W / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * H) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isActive]);

  return (
    <div className="waveform-container">
      <span className="panel-label">WAVEFORM</span>
      <canvas ref={canvasRef} width={400} height={80} />
    </div>
  );
}
