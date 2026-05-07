#!/usr/bin/env python3
# ruff: noqa: E402
from __future__ import annotations
"""
Laptop Activity Monitor — Daemon

Detects and logs suspicious activity on your laptop while you're away.

Usage:
    python monitor.py --run               Start the background daemon
    python monitor.py --arm               Arm: start watching for intruders
    python monitor.py --disarm            Disarm: stop watching (you're back)
    python monitor.py --status            Show current state and stats
    python monitor.py --webcam            Arm + capture webcam photo on each session
    python monitor.py --setup-telegram    Interactive helper to configure Telegram bot
"""

import os
import sys
import time
import json
import sqlite3
import logging
import subprocess
import threading
import signal
import smtplib
import socket
from datetime import datetime
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── optional deps ────────────────────────────────────────────────────────────

try:
    from pynput import keyboard as kb, mouse as ms
except ImportError:
    sys.exit("Missing dependency: pip install pynput")

try:
    import mss
    import mss.tools
    _MSS = True
except ImportError:
    _MSS = False

try:
    import psutil
    _PSUTIL = True
except ImportError:
    sys.exit("Missing dependency: pip install psutil")

try:
    import requests as _requests
    _REQUESTS = True
except ImportError:
    _REQUESTS = False

# ── paths ────────────────────────────────────────────────────────────────────

DATA_DIR = Path.home() / ".laptop-monitor"
CONFIG_FILE = DATA_DIR / "config.json"
DB_FILE = DATA_DIR / "monitor.db"
SCREENSHOTS_DIR = DATA_DIR / "screenshots"
ARMED_FLAG = DATA_DIR / ".armed"
LOG_FILE = DATA_DIR / "monitor.log"

DEFAULT_CONFIG = {
    "screenshot_interval": 30,       # seconds between screenshots during a session
    "process_check_interval": 10,    # seconds between process-list snapshots
    "idle_threshold": 120,           # seconds of silence before ending a session
    "email": {
        "enabled": False,
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "username": "",
        "password": "",              # use App Password for Gmail
        "to": ""
    },
    "telegram": {
        "enabled": False,
        "bot_token": "",             # from @BotFather
        "chat_id": "",               # run --setup-telegram to find yours
        "send_screenshots": True,    # attach screenshot to each alert
        "screenshot_every_n": 3      # also forward every Nth periodic screenshot
    },
    "ntfy": {
        "enabled": False,
        "topic": "",                 # e.g. "moj-laptop-xyz123" — keep it unguessable
        "server": "https://ntfy.sh"  # or your self-hosted instance
    },
    "log_keystrokes": True,          # record pressed keys (stored locally)
    "keylog_flush_interval": 10      # flush keystroke buffer to DB every N seconds
}

# ── database ─────────────────────────────────────────────────────────────────

class Database:
    def __init__(self, path: Path):
        self.path = path
        self._init_schema()

    def connect(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self.connect() as c:
            c.executescript("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time      TEXT    NOT NULL,
                    end_time        TEXT,
                    hostname        TEXT,
                    screenshot_count INTEGER DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS events (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id  INTEGER NOT NULL,
                    timestamp   TEXT    NOT NULL,
                    type        TEXT    NOT NULL,
                    data        TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id)
                );
                CREATE TABLE IF NOT EXISTS screenshots (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id  INTEGER NOT NULL,
                    timestamp   TEXT    NOT NULL,
                    path        TEXT    NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id)
                );
            """)

    def start_session(self) -> int:
        ts = _now()
        with self.connect() as c:
            cur = c.execute(
                "INSERT INTO sessions (start_time, hostname) VALUES (?, ?)",
                (ts, socket.gethostname()),
            )
            return cur.lastrowid

    def end_session(self, session_id: int):
        with self.connect() as c:
            c.execute(
                "UPDATE sessions SET end_time = ? WHERE id = ?",
                (_now(), session_id),
            )

    def log_event(self, session_id: int, etype: str, data: str = ""):
        with self.connect() as c:
            c.execute(
                "INSERT INTO events (session_id, timestamp, type, data) VALUES (?,?,?,?)",
                (session_id, _now(), etype, data),
            )

    def log_screenshot(self, session_id: int, path: str):
        with self.connect() as c:
            c.execute(
                "INSERT INTO screenshots (session_id, timestamp, path) VALUES (?,?,?)",
                (session_id, _now(), path),
            )
            c.execute(
                "UPDATE sessions SET screenshot_count = screenshot_count + 1 WHERE id = ?",
                (session_id,),
            )

# ── screenshot capture ────────────────────────────────────────────────────────

class Screenshotter:
    def __init__(self, out_dir: Path):
        self.out_dir = out_dir
        out_dir.mkdir(parents=True, exist_ok=True)

    def capture(self) -> str | None:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = self.out_dir / f"screen_{ts}.png"

        if sys.platform == "darwin":
            # screencapture is built-in; -x = silent (no shutter sound)
            try:
                r = subprocess.run(["screencapture", "-x", str(path)],
                                   capture_output=True, timeout=10)
                if r.returncode == 0 and path.exists() and path.stat().st_size > 0:
                    return str(path)
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass

        if _MSS:
            try:
                with mss.mss() as sct:
                    sct.shot(output=str(path))
                if path.exists() and path.stat().st_size > 0:
                    return str(path)
            except Exception as e:
                logging.debug(f"mss failed: {e}")

        for cmd in (["scrot", str(path)], ["import", "-window", "root", str(path)]):
            try:
                r = subprocess.run(cmd, capture_output=True, timeout=10)
                if r.returncode == 0 and path.exists():
                    return str(path)
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass

        logging.warning("Screenshot capture failed — no tool available")
        return None

# ── active window title ───────────────────────────────────────────────────────

def active_window_title() -> str:
    if sys.platform == "darwin":
        script = (
            'tell application "System Events"\n'
            '  set frontApp to name of first process whose frontmost is true\n'
            '  try\n'
            '    tell process frontApp\n'
            '      return name of front window\n'
            '    end tell\n'
            '  on error\n'
            '    return frontApp\n'
            '  end try\n'
            'end tell'
        )
        try:
            r = subprocess.run(["osascript", "-e", script],
                               capture_output=True, text=True, timeout=5)
            if r.returncode == 0:
                return r.stdout.strip()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return ""

    try:
        r = subprocess.run(
            ["xdotool", "getactivewindow", "getwindowname"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode == 0:
            return r.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return ""

# ── process snapshot ──────────────────────────────────────────────────────────

def process_snapshot() -> set[str]:
    names: set[str] = set()
    for p in psutil.process_iter(["name"]):
        try:
            names.add(p.info["name"])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return names

# ── email alert ───────────────────────────────────────────────────────────────

def send_email(cfg: dict, session_id: int, start_time: str):
    ec = cfg.get("email", {})
    if not ec.get("enabled"):
        return
    msg = MIMEMultipart()
    msg["From"] = ec["username"]
    msg["To"] = ec["to"]
    msg["Subject"] = f"[LaptopMonitor] Suspicious activity on {socket.gethostname()}"
    body = (
        f"Suspicious activity detected!\n\n"
        f"Host:       {socket.gethostname()}\n"
        f"Session ID: {session_id}\n"
        f"Started at: {start_time}\n\n"
        f"Run 'python report.py --session {session_id}' to see details.\n"
    )
    msg.attach(MIMEText(body, "plain"))
    try:
        with smtplib.SMTP(ec["smtp_server"], ec["smtp_port"]) as srv:
            srv.starttls()
            srv.login(ec["username"], ec["password"])
            srv.send_message(msg)
        logging.info("Email alert sent.")
    except Exception as e:
        logging.warning(f"Email failed: {e}")

# ── Telegram notifier ────────────────────────────────────────────────────────

def notify_telegram(token: str, chat_id: str, text: str, photo_path: str | None = None):
    if not _REQUESTS:
        logging.warning("requests not installed — Telegram skipped (pip install requests)")
        return
    base = f"https://api.telegram.org/bot{token}"
    try:
        if photo_path and Path(photo_path).exists():
            with open(photo_path, "rb") as f:
                _requests.post(
                    f"{base}/sendPhoto",
                    data={"chat_id": chat_id, "caption": text},
                    files={"photo": f},
                    timeout=20,
                )
        else:
            _requests.post(
                f"{base}/sendMessage",
                json={"chat_id": chat_id, "text": text},
                timeout=10,
            )
        logging.info("Telegram notification sent.")
    except Exception as e:
        logging.warning(f"Telegram notification failed: {e}")


def setup_telegram_wizard():
    """Interactive helper: finds your chat_id so you can paste it into config."""
    if not _REQUESTS:
        sys.exit("Install requests first: pip install requests")
    print("\n=== Telegram bot setup ===\n")
    token = input("Paste your bot token (from @BotFather): ").strip()
    if not token:
        sys.exit("Token cannot be empty.")
    print("\n1. Open Telegram and find your bot (search by its username).")
    print("2. Send it any message, e.g.  hello")
    input("Press Enter when done... ")
    try:
        r = _requests.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=10)
        r.raise_for_status()
        updates = r.json().get("result", [])
    except Exception as e:
        sys.exit(f"Could not reach Telegram API: {e}")
    if not updates:
        print("\nNo messages found. Make sure you sent a message to the bot and try again.")
        return
    chat_id = str(updates[-1]["message"]["chat"]["id"])
    print(f"\nFound chat_id: {chat_id}")
    print("\nAdd to ~/.laptop-monitor/config.json:")
    snippet = {
        "telegram": {
            "enabled": True,
            "bot_token": token,
            "chat_id": chat_id,
            "send_screenshots": True,
            "screenshot_every_n": 3,
        }
    }
    print(json.dumps(snippet, indent=2))
    # Test message
    answer = input("\nSend a test message to verify? [Y/n] ").strip().lower()
    if answer != "n":
        notify_telegram(token, chat_id, "Laptop Monitor: configuration successful!")
        print("Done. Check your Telegram.")


# ── ntfy notifier ─────────────────────────────────────────────────────────────

def notify_ntfy(server: str, topic: str, message: str, title: str = "Laptop Monitor"):
    if not _REQUESTS:
        logging.warning("requests not installed — ntfy skipped (pip install requests)")
        return
    try:
        _requests.post(
            f"{server}/{topic}",
            data=message.encode(),
            headers={
                "Title": title,
                "Priority": "urgent",
                "Tags": "warning,computer",
            },
            timeout=10,
        )
        logging.info("ntfy notification sent.")
    except Exception as e:
        logging.warning(f"ntfy notification failed: {e}")


# ── audio recorder ────────────────────────────────────────────────────────────

class AudioRecorder:
    RATE     = 44100
    CHANNELS = 1
    CHUNK    = 1024

    def __init__(self, out_dir: Path, chunk_minutes: int = 2):
        self.out_dir = out_dir
        self.chunk_seconds = chunk_minutes * 60
        self._stop = threading.Event()

    def start(self, session_id: int, db: Database):
        self._stop.clear()
        threading.Thread(target=self._record_loop, args=(session_id, db),
                         daemon=True).start()

    def stop(self):
        self._stop.set()

    def _record_loop(self, session_id: int, db: Database):
        try:
            import sounddevice as sd
            import wave
            import numpy as np
        except ImportError:
            logging.warning("sounddevice not installed — audio disabled "
                            "(pip install sounddevice)")
            return

        while not self._stop.is_set():
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = self.out_dir / f"audio_{ts}.wav"
            try:
                frames = []
                with sd.InputStream(samplerate=self.RATE, channels=self.CHANNELS,
                                    dtype="int16", blocksize=self.CHUNK) as stream:
                    deadline = time.time() + self.chunk_seconds
                    while not self._stop.is_set() and time.time() < deadline:
                        data, _ = stream.read(self.CHUNK)
                        frames.append(data.copy())

                if frames:
                    import numpy as np
                    audio = np.concatenate(frames, axis=0)
                    with wave.open(str(path), "wb") as wf:
                        wf.setnchannels(self.CHANNELS)
                        wf.setsampwidth(2)   # int16 = 2 bytes
                        wf.setframerate(self.RATE)
                        wf.writeframes(audio.tobytes())
                    db.log_event(session_id, "audio", str(path))
                    logging.info(f"Audio chunk: {path}")
            except Exception as e:
                logging.warning(f"Audio chunk error: {e}")
                self._stop.wait(5)


# ── keystroke formatting ──────────────────────────────────────────────────────

_SPECIAL_KEYS = {
    kb.Key.enter:     "\n",
    kb.Key.space:     " ",
    kb.Key.tab:       "\t",
    kb.Key.backspace: "[⌫]",
    kb.Key.delete:    "[DEL]",
    kb.Key.esc:       "[ESC]",
    kb.Key.up:        "[↑]",
    kb.Key.down:      "[↓]",
    kb.Key.left:      "[←]",
    kb.Key.right:     "[→]",
    kb.Key.home:      "[HOME]",
    kb.Key.end:       "[END]",
    kb.Key.page_up:   "[PGUP]",
    kb.Key.page_down: "[PGDN]",
    kb.Key.caps_lock: "[CAPS]",
    kb.Key.f1: "[F1]",   kb.Key.f2:  "[F2]",  kb.Key.f3:  "[F3]",
    kb.Key.f4: "[F4]",   kb.Key.f5:  "[F5]",  kb.Key.f6:  "[F6]",
    kb.Key.f7: "[F7]",   kb.Key.f8:  "[F8]",  kb.Key.f9:  "[F9]",
    kb.Key.f10: "[F10]", kb.Key.f11: "[F11]", kb.Key.f12: "[F12]",
    # modifier keys — skip silently
    kb.Key.shift:   "", kb.Key.shift_r:  "", kb.Key.shift_l:  "",
    kb.Key.ctrl:    "", kb.Key.ctrl_r:   "", kb.Key.ctrl_l:   "",
    kb.Key.alt:     "", kb.Key.alt_r:    "", kb.Key.alt_l:    "",
    kb.Key.alt_gr:  "",
    kb.Key.cmd:     "", kb.Key.cmd_r:    "", kb.Key.cmd_l:    "",
}


def _format_key(key) -> str:
    """Return a human-readable string for a pynput key, or '' to skip."""
    if isinstance(key, kb.KeyCode):
        return key.char if key.char else ""
    return _SPECIAL_KEYS.get(key, f"[{key.name}]")


class KeystrokeBuffer:
    """Thread-safe buffer that batches keystrokes and flushes on demand."""

    def __init__(self):
        self._chunks: list[str] = []
        self._lock = threading.Lock()

    def push(self, char: str):
        with self._lock:
            self._chunks.append(char)

    def flush(self) -> str:
        with self._lock:
            text = "".join(self._chunks)
            self._chunks.clear()
        return text

    def clear(self):
        with self._lock:
            self._chunks.clear()


# ── main monitor class ────────────────────────────────────────────────────────

class LaptopMonitor:
    def __init__(self, config_path: str | None = None):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

        self.cfg = _load_config(config_path or str(CONFIG_FILE))
        self.db = Database(DB_FILE)
        self.ss = Screenshotter(SCREENSHOTS_DIR)

        self._session: int | None = None
        self._last_activity: float = 0.0
        self._known_procs: set[str] = set()
        self._lock = threading.Lock()
        self._running = False
        self._key_buf = KeystrokeBuffer()
        self._audio = AudioRecorder(SCREENSHOTS_DIR,
                                    chunk_minutes=self.cfg.get("audio_chunk_minutes", 2))

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s  %(levelname)-8s  %(message)s",
            handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
        )

    # ── public control ──────────────────────────────────────────────────────

    def arm(self):
        ARMED_FLAG.touch()
        logging.info("Monitor ARMED — watching for activity.")
        print("Monitor armed. Any laptop activity will now be recorded.")

    def disarm(self):
        if ARMED_FLAG.exists():
            ARMED_FLAG.unlink()
        with self._lock:
            if self._session is not None:
                self._close_session()
        logging.info("Monitor DISARMED.")
        print("Monitor disarmed. Welcome back!")

    def status(self):
        armed = ARMED_FLAG.exists()
        print(f"\nStatus : {'ARMED  (monitoring active)' if armed else 'DISARMED'}")
        with self.db.connect() as c:
            n_s = c.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
            n_p = c.execute("SELECT COUNT(*) FROM screenshots").fetchone()[0]
        print(f"Sessions logged   : {n_s}")
        print(f"Screenshots taken : {n_p}")
        if self._session:
            print(f"Active session    : #{self._session}")
        print(f"Data directory    : {DATA_DIR}")
        print()

    def run(self):
        self._running = True
        logging.info("Laptop monitor daemon started.")

        for target in (self._screenshot_loop, self._process_loop,
                       self._idle_loop, self._keylog_flush_loop):
            threading.Thread(target=target, daemon=True).start()

        kb_listener = kb.Listener(on_press=self._on_key_press)
        ms_listener = ms.Listener(
            on_move=self._on_mouse_event,
            on_click=self._on_mouse_event,
            on_scroll=self._on_mouse_event,
        )
        kb_listener.start()
        ms_listener.start()

        def _shutdown(sig, _frame):
            logging.info("Shutting down...")
            self._running = False
            kb_listener.stop()
            ms_listener.stop()
            with self._lock:
                if self._session:
                    self._close_session()
            sys.exit(0)

        signal.signal(signal.SIGINT, _shutdown)
        signal.signal(signal.SIGTERM, _shutdown)

        print("Daemon running.  Use Ctrl-C or SIGTERM to stop.")
        while self._running:
            time.sleep(1)

    # ── internal ────────────────────────────────────────────────────────────

    def _trigger_activity(self):
        if not ARMED_FLAG.exists():
            return
        with self._lock:
            self._last_activity = time.time()
            if self._session is None:
                self._open_session()

    def _on_key_press(self, key):
        self._trigger_activity()
        if self.cfg.get("log_keystrokes", True) and self._session is not None:
            char = _format_key(key)
            if char:
                self._key_buf.push(char)

    def _on_mouse_event(self, *_args):
        self._trigger_activity()

    def _open_session(self):
        self._session = self.db.start_session()
        start = _now()
        logging.warning(f"!!! SUSPICIOUS ACTIVITY — session #{self._session} started at {start}")

        # Take an immediate screenshot for the alert
        alert_photo = self.ss.capture() if self.cfg.get("telegram", {}).get("send_screenshots") else None

        self._known_procs = process_snapshot()
        self.db.log_event(self._session, "session_start", f"host={socket.gethostname()}")
        if self.cfg.get("record_audio", True):
            self._audio.start(self._session, self.db)

        # Compose alert text
        host = socket.gethostname()
        alert_text = (
            f"⚠️ Ktoś używa Twojego laptopa!\n"
            f"Host: {host}\n"
            f"Sesja: #{self._session}\n"
            f"Czas: {start}"
        )

        send_email(self.cfg, self._session, start)
        self._send_push(alert_text, alert_photo)

    def _send_push(self, text: str, photo: str | None = None):
        tg = self.cfg.get("telegram", {})
        if tg.get("enabled") and tg.get("bot_token") and tg.get("chat_id"):
            notify_telegram(tg["bot_token"], tg["chat_id"], text, photo)

        ntfy_cfg = self.cfg.get("ntfy", {})
        if ntfy_cfg.get("enabled") and ntfy_cfg.get("topic"):
            notify_ntfy(ntfy_cfg["server"], ntfy_cfg["topic"], text)

    def _close_session(self):
        if self._session is not None:
            self._audio.stop()
            # Flush remaining keystrokes before closing
            text = self._key_buf.flush()
            if text:
                self.db.log_event(self._session, "keylog", text)
            self.db.log_event(self._session, "session_end")
            self.db.end_session(self._session)
            logging.info(f"Session #{self._session} closed.")
            self._session = None

    def _keylog_flush_loop(self):
        interval = self.cfg.get("keylog_flush_interval", 10)
        while self._running:
            time.sleep(interval)
            with self._lock:
                sid = self._session
            if sid is not None:
                text = self._key_buf.flush()
                if text:
                    self.db.log_event(sid, "keylog", text)

    def _screenshot_loop(self):
        interval = self.cfg.get("screenshot_interval", 30)
        while self._running:
            time.sleep(interval)
            with self._lock:
                sid = self._session
            if sid is not None and ARMED_FLAG.exists():
                path = self.ss.capture()
                if path:
                    self.db.log_screenshot(sid, path)
                    # Forward every Nth screenshot to Telegram
                    tg = self.cfg.get("telegram", {})
                    if tg.get("enabled") and tg.get("send_screenshots"):
                        every_n = tg.get("screenshot_every_n", 3)
                        with self.db.connect() as c:
                            count = c.execute(
                                "SELECT screenshot_count FROM sessions WHERE id=?", (sid,)
                            ).fetchone()[0]
                        if count % every_n == 0:
                            title = active_window_title()
                            caption = f"Screenshot #{count}"
                            if title:
                                caption += f"\nOkno: {title}"
                            self._send_push(caption, path)
                            continue  # title already captured above
                title = active_window_title()
                if title:
                    self.db.log_event(sid, "window_title", title)

    def _process_loop(self):
        interval = self.cfg.get("process_check_interval", 10)
        while self._running:
            time.sleep(interval)
            with self._lock:
                sid = self._session
            if sid is not None and ARMED_FLAG.exists():
                current = process_snapshot()
                for name in current - self._known_procs:
                    self.db.log_event(sid, "new_process", name)
                    logging.info(f"New process: {name}")
                self._known_procs = current

    def _idle_loop(self):
        threshold = self.cfg.get("idle_threshold", 120)
        while self._running:
            time.sleep(15)
            with self._lock:
                if self._session is not None and self._last_activity > 0:
                    idle = time.time() - self._last_activity
                    if idle > threshold:
                        logging.info(f"Idle for {idle:.0f}s — closing session.")
                        self._close_session()

# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _load_config(path: str) -> dict:
    cfg = dict(DEFAULT_CONFIG)
    p = Path(path)
    if p.exists():
        with open(p) as f:
            cfg.update(json.load(f))
    else:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        print(f"Default config written to {p}")
    return cfg

# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Laptop Activity Monitor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--run",            action="store_true", help="Start background daemon")
    parser.add_argument("--arm",            action="store_true", help="Arm: begin watching")
    parser.add_argument("--disarm",         action="store_true", help="Disarm: stop watching")
    parser.add_argument("--status",         action="store_true", help="Show status and stats")
    parser.add_argument("--setup-telegram", action="store_true", help="Interactive Telegram bot setup wizard")
    parser.add_argument("--config",         default=str(CONFIG_FILE), metavar="PATH")
    args = parser.parse_args()

    if args.setup_telegram:
        setup_telegram_wizard()
        return

    m = LaptopMonitor(args.config)

    if args.arm:
        m.arm()
    elif args.disarm:
        m.disarm()
    elif args.status:
        m.status()
    elif args.run:
        m.run()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
