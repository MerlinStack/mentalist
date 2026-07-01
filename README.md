<div align="center">
  <img src="public/dmentalist_logo.svg" width="180" alt="D'mentalist Logo" />
  <h1 align="center">ScriptureFlow</h1>
  <p align="center">Real-time scripture detection & projection system powered by browser-based AI</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TanStack_Router-1.170-FF4154?logo=reactrouter" alt="TanStack Router" />
  <img src="https://img.shields.io/badge/Transformers.js-4.2-FED500?logo=huggingface" alt="Transformers.js" />
</p>

---

## Overview

ScriptureFlow is a browser-first application that listens to spoken audio through the microphone, transcribes it using **Whisper** (running entirely in-browser via Transformers.js / ONNX Runtime), and detects scripture references in real-time. Detected verses are presented in an operator console for review, staging, and projection to external displays.

### How it works

1. **Audio capture** — microphone input is streamed through the Web Audio API
2. **Transcription** — Whisper models (`tiny.en` or `large-v3-turbo`) run locally in a Web Worker, no server needed
3. **Reference detection** — transcribed text is matched against a verse database via reverse lookup and semantic similarity
4. **Operator console** — detected verses appear in a preview panel; operator can stage, queue, and push to live projection
5. **Projection** — live verses are broadcast to a second-screen view via `BroadcastChannel`

### AI Engine

The application uses a dual-tier Web Worker architecture:

| Tier           | Models                                        | Device     | Use case                    |
| -------------- | --------------------------------------------- | ---------- | --------------------------- |
| **A** (CPU)    | `whisper-tiny.en` + `all-MiniLM-L6-v2`        | CPU / WASM | Fast, low-latency detection |
| **B** (WebGPU) | `whisper-large-v3-turbo` + `bge-base-en-v1.5` | WebGPU     | High-accuracy fallback      |

Both tiers run entirely in the browser — no external API calls, no server-side inference.

---

## Pages

| Route       | Page       | Description                                                   |
| ----------- | ---------- | ------------------------------------------------------------- |
| `/`         | Landing    | Marketing / login entry point                                 |
| `/auth`     | Auth       | Authentication (Firebase)                                     |
| `/operator` | Operator   | Main control console — mic control, preview, queue, live push |
| `/project`  | Projection | Second-screen view for displaying live verses                 |
| `/admin`    | Admin      | Administrative panel                                          |

---

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | React 19, TypeScript                             |
| Routing   | TanStack Router (file-based, auto-generated)     |
| Styling   | Tailwind CSS v4, glassmorphism design system     |
| State     | Zustand, TanStack Query                          |
| UI        | Radix UI primitives, Lucide icons, Sonner toasts |
| Audio     | Web Audio API, MediaRecorder                     |
| AI        | HuggingFace Transformers.js, ONNX Runtime Web    |
| Storage   | Firebase                                         |
| Build     | Vite 8, Vitest                                   |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Generate scripture embeddings

```bash
npm run generate-embeddings
```

Generates semantic embeddings for the verse database (required for the semantic search fallback tier).

---

## Project Structure

```
src/
├── api/            # Firebase / external API clients
├── audio/          # Audio capture & processing
├── components/     # UI components (verse panels, status chips, etc.)
├── data/           # Static data & bible database
├── engine/         # Transcription & detection logic
├── gateway/        # API gateway abstraction
├── hooks/          # React hooks (useOrchestrator, useEnginePipeline, etc.)
├── lib/            # Utility libraries
├── pages/          # Page-level components
├── routes/         # Route definitions (TanStack Router)
├── services/       # Business logic services
├── store/          # Zustand stores (scripture, projection, sound)
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
└── workers/        # Web Workers (engine.worker.ts, whisper.worker.ts, semantic.worker.ts)
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Operator Console                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Preview  │  │   Live   │  │  Queue Board   │  │
│  │  Panel   │  │  Panel   │  │  (sidebar)     │  │
│  └────┬─────┘  └────┬─────┘  └───────────────┘  │
│       │             │                            │
│  ┌────▼─────────────▼────────────────────────┐   │
│  │          Orchestrator Layer                │   │
│  │  (useOrchestrator / useEnginePipeline)     │   │
│  └────┬─────────────┬────────────────────────┘   │
│       │             │                             │
│  ┌────▼────┐  ┌─────▼──────┐                     │
│  │ Engine  │  │ Audio      │                     │
│  │ Worker  │  │ Capture    │                     │
│  │(WebGPU/ │  │(Web Audio) │                     │
│  │  CPU)   │  └────────────┘                     │
│  └─────────┘                                     │
└─────────────────────────────────────────────────┘
         │
         │ BroadcastChannel("scriptureflow-projection")
         ▼
┌─────────────────────────────────────────────────┐
│              Projection Screen                   │
│          (second monitor / external display)      │
└─────────────────────────────────────────────────┘
```

---

## Design System

- **Palette:** Deep navy background (`#05070f` → `#0d1326`), gold accents (`#C9973A`, `#FFD580`)
- **Glassmorphism:** `backdrop-filter: blur(16px)` panels with semi-transparent backgrounds
- **Typography:** Inter (body), JetBrains Mono (code/monospace)
- **Glow effects:** Drop-shadow glow utilities for gold, red, green, and blue states
- **Animations:** Neon waveform pulse, confidence arc fill, glow keyframes

---

## License

MIT
