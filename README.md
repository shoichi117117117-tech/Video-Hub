# 🎥 Video Hub Control Plane

A lightweight, zero-disk-footprint video ingestion and streaming control plane built for low-storage devices and seamless remote playback on portable devices (iPhone, iPads) via Tailscale.

The system uses a **Control Plane / Data Plane architecture**: your laptop orchestrates metadata retrieval and Just-In-Time (JIT) stream staging, while temporary local files are automatically purged immediately after delivery to maintain zero long-term storage overhead.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Python, FastAPI, SQLite, SQLAlchemy, `uv` (Fast Python package manager)
- **Extraction & Media Processing:** `yt-dlp`, Node.js (for signature/JS runtime challenge resolution), FFmpeg (for JIT video/audio merging)
- **Frontend:** Tailwind CSS, responsive single-page web dashboard optimized for iPad/mobile
- **Networking:** Tailscale VPN mesh network for secure, zero-config remote access

---

## 📦 Prerequisites

Before running the control plane, make sure you have the following installed on your host system:

1. **Python 3.10+** (Managed via [`uv`](https://github.com/astral-sh/uv) or standard Python `venv`)
2. **Node.js** (Required by `yt-dlp` to execute JavaScript runtimes for YouTube signature and challenge solver scripts)
3. **FFmpeg** (Required for merging high-definition video and audio streams)
   * *Ensure* `ffmpeg` *is available in your system* `PATH`*, or place the static binary inside the project root.*

---

## 🚀 Quickstart & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/video-hub.git
cd video-hub
```

### 2. Install Dependencies

Using [`uv`](https://github.com/astral-sh/uv):

```bash
uv sync
```

*(Alternatively, using standard pip)*:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the Control Plane

Start the FastAPI application server:

```bash
uv run python src/video_hub/main.py
```

### 4. Access the Dashboard

Open your web browser locally or on your mobile device over Tailscale:

```text
http://<your-laptop-ip>:8000
```