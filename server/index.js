require("dotenv").config();

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand
} = require("@aws-sdk/client-transcribe-streaming");

const sessionsRouter = require("./routes/sessions");

const txClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/sessions", sessionsRouter);

const srv = http.createServer(app);
const wss = new WebSocketServer({ server: srv });

// buffers incoming pcm chunks and feeds them to the transcribe sdk one at a time
class AudioStream {
  constructor() {
    this.buf = [];
    this._res = null;
    this.done = false;
  }

  push(chunk) {
    if (this.done) return;
    if (this._res) {
      const r = this._res;
      this._res = null;
      r({ value: { AudioEvent: { AudioChunk: chunk } }, done: false });
    } else {
      this.buf.push(chunk);
    }
  }

  end() {
    this.done = true;
    if (this._res) { this._res({ done: true }); this._res = null; }
  }

  [Symbol.asyncIterator]() { return this; }

  next() {
    if (this.buf.length)
      return Promise.resolve({ value: { AudioEvent: { AudioChunk: this.buf.shift() } }, done: false });
    if (this.done)
      return Promise.resolve({ done: true });
    return new Promise(r => { this._res = r; });
  }
}

wss.on("connection", ws => {
  console.log("[echosense] session opened");

  const audio = new AudioStream();
  let alive = true;
  let captionCount = 0;
  let partialDropped = 0;

  txClient.send(new StartStreamTranscriptionCommand({
    LanguageCode: "en-US",
    MediaEncoding: "pcm",
    MediaSampleRateHertz: 16000,
    AudioStream: audio
  }))
  .then(async resp => {
    for await (const evt of resp.TranscriptResultStream) {
      if (!alive) break;

      const results = evt?.TranscriptEvent?.Transcript?.Results;
      if (!results?.length) continue;

      for (const r of results) {
        const txt = r.Alternatives?.[0]?.Transcript;
        if (!txt) continue;

        if (!r.IsPartial) captionCount++;

        if (ws.readyState !== ws.OPEN) { partialDropped++; continue; }

        ws.send(JSON.stringify({
          type: "transcript",
          text: txt,
          isFinal: !r.IsPartial
        }));
      }
    }
  })
  .catch(err => {
    // BadRequestException fires on clean disconnect, that's expected
    if (!alive || err.name === "BadRequestException") return;
    console.error("[echosense] transcribe:", err.message);
    if (ws.readyState === ws.OPEN)
      ws.send(JSON.stringify({ type: "error", message: err.message }));
  });

  ws.on("message", chunk => {
    if (alive) audio.push(chunk);
  });

  ws.on("close", () => {
    alive = false;
    audio.end();
    console.log(`[echosense] session closed — ${captionCount} captions, ${partialDropped} dropped partials`);
  });

  ws.on("error", err => {
    console.error("[echosense] socket:", err.message);
    alive = false;
    audio.end();
  });
});

const PORT = process.env.PORT || 3001;
srv.listen(PORT, () => console.log(`[echosense] listening on :${PORT}`));
