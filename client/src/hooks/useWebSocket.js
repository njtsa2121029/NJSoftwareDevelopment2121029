import { useRef, useCallback, useState } from "react";

const SERVER_WS = "ws://localhost:3001";

export function useWebSocket({ onMessage }) {
  const socketRef    = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current) return;
    setConnecting(true);

    const ws = new WebSocket(SERVER_WS);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };

    ws.onmessage = (evt) => {
      try {
        onMessage(JSON.parse(evt.data));
      } catch {
        console.warn("[echosense] unparseable ws frame:", evt.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      socketRef.current = null;
    };

    ws.onerror = () => {
      setConnecting(false);
    };
  }, [onMessage]);

  const sendAudio = useCallback((buf) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(buf);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  return { connect, disconnect, sendAudio, connected, connecting };
}
