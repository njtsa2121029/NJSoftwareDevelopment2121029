const express = require("express");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const router = express.Router();
const BUCKET = process.env.S3_BUCKET_NAME || "echosense-transcripts";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// colons in timestamps break url routing so swap them out for the s3 key
const toKey = ts => ts.replace(/[:.]/g, "-");

// POST /api/sessions — save transcript, returns sessionId
router.post("/", express.json(), async (req, res) => {
  const { transcript, timestamp } = req.body;
  if (!transcript?.trim())
    return res.status(400).json({ error: "nothing to save — transcript is empty" });

  if (transcript.trim().length < 3)
    return res.status(400).json({ error: "transcript too short to be worth saving" });

  const sid = toKey(timestamp || new Date().toISOString());

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `sessions/${sid}/transcript.txt`,
      Body: transcript,
      ContentType: "text/plain"
    }));
    res.json({ success: true, sessionId: sid });
  } catch (err) {
    console.error("[echosense] s3 write err:", err.message);
    res.status(500).json({ error: `S3 PutObject failed (${err.name}) — verify s3:PutObject permission` });
  }
});

// POST /api/sessions/:sessionId/audio — receives raw webm from the browser
router.post("/:sessionId/audio",
  express.raw({ type: "audio/*", limit: "100mb" }),
  async (req, res) => {
    if (!req.body?.length)
      return res.status(400).json({ error: "audio upload was empty" });

    const mb = req.body.length / 1_000_000;
    if (mb > 80)
      return res.status(413).json({ error: `audio too large (${mb.toFixed(1)}MB)` });

    const { sessionId } = req.params;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: `sessions/${sessionId}/audio.webm`,
        Body: req.body,
        ContentType: "audio/webm"
      }));
      console.log(`[echosense] audio saved — ${mb.toFixed(2)}MB for session ${sessionId}`);
      res.json({ success: true });
    } catch (err) {
      console.error("[echosense] s3 audio write:", err.message);
      res.status(500).json({ error: `S3 PutObject failed (${err.name})` });
    }
  }
);

// GET /api/sessions — list all saved sessions, newest first
router.get("/", async (req, res) => {
  try {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: "sessions/", Delimiter: "/"
    }));

    const sessions = (resp.CommonPrefixes || [])
      .map(p => ({ sessionId: p.Prefix.replace("sessions/", "").replace("/", "") }))
      .reverse();

    res.json(sessions);
  } catch (err) {
    console.error("[echosense] list sessions:", err.message);
    res.status(500).json({ error: `ListBucket failed (${err.name}) — verify s3:ListBucket permission` });
  }
});

router.get("/:sessionId/transcript", async (req, res) => {
  try {
    const obj = await s3.send(new GetObjectCommand({
      Bucket: BUCKET, Key: `sessions/${req.params.sessionId}/transcript.txt`
    }));
    res.setHeader("Content-Type", "text/plain");
    obj.Body.pipe(res);
  } catch (err) {
    res.status(err.name === "NoSuchKey" ? 404 : 500)
       .json({ error: err.name === "NoSuchKey" ? "not found" : err.message });
  }
});

router.get("/:sessionId/audio", async (req, res) => {
  try {
    const obj = await s3.send(new GetObjectCommand({
      Bucket: BUCKET, Key: `sessions/${req.params.sessionId}/audio.webm`
    }));
    res.setHeader("Content-Type", "audio/webm");
    obj.Body.pipe(res);
  } catch (err) {
    res.status(err.name === "NoSuchKey" ? 404 : 500)
       .json({ error: err.name === "NoSuchKey" ? "not found" : err.message });
  }
});

module.exports = router;
