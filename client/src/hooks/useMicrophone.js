import { useRef, useState, useCallback } from "react";

export function useMicrophone({ onAudioChunk }) {
  const [error,        setError]        = useState(null);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [audioBlob,    setAudioBlob]    = useState(null);

  const streamRef    = useRef(null);
  const ctxRef       = useRef(null);
  const processorRef = useRef(null);
  const analyserRef  = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);

  const startMic = useCallback(async () => {
    setError(null);
    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 16khz matches what we tell transcribe, avoids resampling issues
      const ctx = new AudioContext({ sampleRate: 16000 });
      ctxRef.current = ctx;

      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
      src.connect(analyser);

      // scriptprocessor is deprecated but audioworklet needs cross-origin isolation
      // which breaks the dev setup, so keeping this for now
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const f32 = e.inputBuffer.getChannelData(0);
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          const clamped = Math.max(-1, Math.min(1, f32[i]));
          i16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }
        onAudioChunk(i16.buffer);
      };

      analyser.connect(processor);
      processor.connect(ctx.destination);

      // mediarecorder runs on the raw stream, gives us webm/opus for saving
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        chunksRef.current = [];
      };

      recorder.start(1000);

    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Mic permission denied — allow access and try again"
          : `Mic setup failed: ${err.message}`
      );
    }
  }, [onAudioChunk]);

  const stopMic = useCallback(() => {
    // stop recorder first so ondataavailable fires before we close the stream
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();

    processorRef.current?.disconnect();
    analyserRef.current?.disconnect();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());

    streamRef.current    = null;
    ctxRef.current       = null;
    processorRef.current = null;
    analyserRef.current  = null;
    recorderRef.current  = null;
    setAnalyserNode(null);
  }, []);

  return { startMic, stopMic, analyserNode, audioBlob, error };
}
