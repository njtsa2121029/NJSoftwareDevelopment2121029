import { useState, useEffect, useRef } from "react";

// hard stop at 58 min to stay inside the aws free tier (60 min/month)
export const FREE_TIER_SECONDS = 60 * 60;
export const HARD_STOP_SECONDS = 58 * 60;
export const WARN_AT_SECONDS   = 50 * 60;

// usage is keyed by calendar month so it resets automatically
function monthKey() {
  const d = new Date();
  return `echosense-usage-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function readUsed()         { return parseInt(localStorage.getItem(monthKey()) || "0", 10); }
function writeUsed(seconds) { localStorage.setItem(monthKey(), String(seconds)); }

export function useTranscribeUsage({ isRecording, onAutoStop }) {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [monthlySeconds, setMonthlySeconds] = useState(readUsed);

  const tickRef       = useRef(null);
  const elapsedRef    = useRef(0);
  const onAutoStopRef = useRef(onAutoStop);

  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);

  useEffect(() => {
    if (isRecording) {
      elapsedRef.current = 0;
      setSessionSeconds(0);
      const start = Date.now();

      tickRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        elapsedRef.current = elapsed;
        setSessionSeconds(elapsed);

        const total = readUsed() + elapsed;
        setMonthlySeconds(total);

        if (total >= HARD_STOP_SECONDS) {
          onAutoStopRef.current();
        }
      }, 1000);

    } else {
      clearInterval(tickRef.current);
      tickRef.current = null;

      const elapsed = elapsedRef.current;
      if (elapsed > 0) {
        writeUsed(readUsed() + elapsed);
        setMonthlySeconds(readUsed());
      }
      elapsedRef.current = 0;
      setSessionSeconds(0);
    }

    return () => clearInterval(tickRef.current);
  }, [isRecording]);

  const remainingSeconds = Math.max(0, HARD_STOP_SECONDS - monthlySeconds);

  return {
    sessionSeconds,
    monthlySeconds,
    remainingSeconds,
    isWarning: monthlySeconds >= WARN_AT_SECONDS && monthlySeconds < HARD_STOP_SECONDS,
    isAtLimit: monthlySeconds >= HARD_STOP_SECONDS,
  };
}
