# EchoSense

Real-time speech-to-text accessibility tool for users with hearing disabilities.
Live captions with keyword-triggered visual + haptic alerts.

---

## Architecture

```
Browser Mic (getUserMedia)
       │  PCM audio (Int16, 16kHz)
       ▼
  WebSocket (ws://localhost:3001)
       │
       ▼
  Express Server (Node.js)
       │  AWS TranscribeStreamingClient
       ▼
  AWS Transcribe Streaming
       │  TranscriptEvent results
       ▼
  Express Server
       │  { type: "transcript", text, isFinal }
       ▼
  WebSocket → React Frontend
       │
       ├─ CaptionPanel  (live scrolling captions)
       ├─ Waveform      (Web Audio oscilloscope)
       ├─ SoundMeter    (dB level bar)
       ├─ AlertOverlay  (keyword flash / haptic)
       └─ SaveButton ──► POST /api/save-transcript ──► AWS S3
```

---

## Setup

### 1. Clone & install

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure AWS credentials

```bash
cp server/.env.example server/.env
# Fill in your AWS credentials and S3 bucket name
```

### 3. Create the S3 bucket

Create a bucket named `echosense-transcripts` (or whatever you set in `.env`) in your AWS account.

### 4. Run

```bash
# Terminal 1 – start the backend
cd server
npm run dev

# Terminal 2 – start the frontend
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Required AWS IAM Permissions

Attach the following permissions to the IAM user whose credentials you configure:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartStreamTranscription"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:ListObjectsV2"
      ],
      "Resource": [
        "arn:aws:s3:::echosense-transcripts",
        "arn:aws:s3:::echosense-transcripts/*"
      ]
    }
  ]
}
```

---

## File Structure

```
/
├── server/
│   ├── index.js        # Express + WebSocket + AWS Transcribe + S3
│   ├── package.json
│   └── .env.example
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── constants/
        │   └── keywords.js         # Default danger + attention keywords
        ├── hooks/
        │   ├── useMicrophone.js    # getUserMedia + AudioContext + PCM encode
        │   ├── useWebSocket.js     # WS connection + audio send
        │   └── useKeywordDetection.js  # Keyword scanning + auto-reset
        └── components/
            ├── Waveform.jsx        # Canvas oscilloscope
            ├── SoundMeter.jsx      # dB level bar
            ├── CaptionPanel.jsx    # Scrolling live transcript
            ├── SaveButton.jsx      # S3 save trigger
            ├── AlertOverlay.jsx    # Fullscreen danger / amber attention alert
            └── KeywordConfig.jsx   # Add/remove keywords UI
```

---

## Design Notes

- **Keyword detection is client-side only** — it is stateless and instant, requiring no server round-trip. The server handles streaming and storage.
- **PCM encoding** — the browser encodes Float32 mic samples to Int16 PCM before sending, matching AWS Transcribe's expected format.
- **Haptic feedback** — `navigator.vibrate([500, 200, 500])` fires on danger alerts for mobile users.
- **Dark, high-contrast theme** — minimum 20px caption text, teal accent on dark background for accessibility.
