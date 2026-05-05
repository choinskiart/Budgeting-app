#!/usr/bin/env python3
from __future__ import annotations
"""
Laptop Activity Monitor — Report Viewer

Usage:
    python report.py                     List all recorded sessions
    python report.py --session 3         Show full details for session #3
    python report.py --html              Export all sessions to report.html
    python report.py --html --session 3  Export session #3 to report.html
    python report.py --open 3            Open screenshots from session #3
    python report.py --delete 3          Delete session #3 and its screenshots
"""

import sys
import os
import json
import sqlite3
import subprocess
import base64
import argparse
from datetime import datetime
from pathlib import Path

DATA_DIR = Path.home() / ".laptop-monitor"
DB_FILE = DATA_DIR / "monitor.db"
SCREENSHOTS_DIR = DATA_DIR / "screenshots"

# ── database helpers ──────────────────────────────────────────────────────────

def connect():
    if not DB_FILE.exists():
        sys.exit(f"Database not found: {DB_FILE}\nHas the monitor ever run?")
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def all_sessions(conn):
    return conn.execute(
        "SELECT * FROM sessions ORDER BY start_time DESC"
    ).fetchall()

def get_session(conn, sid: int):
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (sid,)).fetchone()
    if not row:
        sys.exit(f"Session #{sid} not found.")
    return row

def session_events(conn, sid: int):
    return conn.execute(
        "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp",
        (sid,),
    ).fetchall()

def session_screenshots(conn, sid: int):
    return conn.execute(
        "SELECT * FROM screenshots WHERE session_id = ? ORDER BY timestamp",
        (sid,),
    ).fetchall()

# ── duration helper ───────────────────────────────────────────────────────────

def duration_str(start: str, end: str | None) -> str:
    if not end:
        return "ongoing"
    try:
        s = datetime.fromisoformat(start)
        e = datetime.fromisoformat(end)
        secs = int((e - s).total_seconds())
        if secs < 60:
            return f"{secs}s"
        return f"{secs // 60}m {secs % 60}s"
    except ValueError:
        return "?"

# ── list sessions ─────────────────────────────────────────────────────────────

def cmd_list(conn):
    sessions = all_sessions(conn)
    if not sessions:
        print("No sessions recorded yet.")
        return

    print(f"\n{'#':>4}  {'Start':>20}  {'End':>20}  {'Duration':>10}  {'Screenshots':>11}")
    print("-" * 75)
    for s in sessions:
        dur = duration_str(s["start_time"], s["end_time"])
        end = s["end_time"] or "—"
        print(
            f"{s['id']:>4}  {s['start_time']:>20}  {end:>20}  {dur:>10}  {s['screenshot_count']:>11}"
        )
    print()

# ── session detail ────────────────────────────────────────────────────────────

def cmd_session(conn, sid: int):
    s = get_session(conn, sid)
    events = session_events(conn, sid)
    shots = session_screenshots(conn, sid)

    dur = duration_str(s["start_time"], s["end_time"])
    print(f"\n{'─'*60}")
    print(f"  Session #{s['id']}  —  {s['hostname']}")
    print(f"  Start    : {s['start_time']}")
    print(f"  End      : {s['end_time'] or 'ongoing'}")
    print(f"  Duration : {dur}")
    print(f"  Screenshots: {s['screenshot_count']}")
    print(f"{'─'*60}\n")

    if events:
        print("Events:")
        _type_labels = {
            "session_start":  "▶ Session started",
            "session_end":    "■ Session ended",
            "window_title":   "  Window",
            "new_process":    "  New process",
            "webcam_photo":   "  Webcam photo",
            "keylog":         "  Keystrokes",
        }
        for ev in events:
            label = _type_labels.get(ev["type"], f"  [{ev['type']}]")
            if ev["type"] == "keylog" and ev["data"]:
                # Show keystrokes indented on separate line for readability
                preview = repr(ev["data"])
                print(f"  {ev['timestamp']}   {label}")
                print(f"      {preview}")
            else:
                data = f"  →  {ev['data']}" if ev["data"] else ""
                print(f"  {ev['timestamp']}   {label}{data}")
        print()

    if shots:
        print(f"Screenshots ({len(shots)}):")
        for sh in shots:
            exists = "✓" if Path(sh["path"]).exists() else "✗ (missing)"
            print(f"  [{exists}]  {sh['timestamp']}  {sh['path']}")
        print()

# ── open screenshots ──────────────────────────────────────────────────────────

def cmd_open(conn, sid: int):
    shots = session_screenshots(conn, sid)
    if not shots:
        print(f"No screenshots in session #{sid}.")
        return
    found = [sh["path"] for sh in shots if Path(sh["path"]).exists()]
    if not found:
        print("Screenshot files are missing from disk.")
        return
    for path in found:
        for viewer in ("eog", "feh", "display", "xdg-open"):
            try:
                subprocess.Popen([viewer, path])
                break
            except FileNotFoundError:
                pass

# ── delete session ────────────────────────────────────────────────────────────

def cmd_delete(conn, sid: int):
    shots = session_screenshots(conn, sid)
    answer = input(
        f"Delete session #{sid} and {len(shots)} screenshot(s)? [y/N] "
    ).strip().lower()
    if answer != "y":
        print("Aborted.")
        return
    for sh in shots:
        p = Path(sh["path"])
        if p.exists():
            p.unlink()
    conn.execute("DELETE FROM screenshots WHERE session_id = ?", (sid,))
    conn.execute("DELETE FROM events WHERE session_id = ?", (sid,))
    conn.execute("DELETE FROM sessions WHERE id = ?", (sid,))
    conn.commit()
    print(f"Session #{sid} deleted.")

# ── HTML export ───────────────────────────────────────────────────────────────

def _img_tag(path: str) -> str:
    p = Path(path)
    if not p.exists():
        return "<em>(file missing)</em>"
    try:
        data = base64.b64encode(p.read_bytes()).decode()
        ext = p.suffix.lstrip(".") or "png"
        return f'<img src="data:image/{ext};base64,{data}" style="max-width:100%;border:1px solid #ccc;border-radius:4px">'
    except Exception:
        return f"<em>{path}</em>"


def cmd_html(conn, sid: int | None = None, out_file: str = "report.html"):
    sessions = [get_session(conn, sid)] if sid else all_sessions(conn)

    rows = []
    for s in sessions:
        events = session_events(conn, s["id"])
        shots = session_screenshots(conn, s["id"])
        dur = duration_str(s["start_time"], s["end_time"])

        def _ev_data_html(ev) -> str:
            if ev["type"] == "keylog" and ev["data"]:
                escaped = ev["data"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                return f'<pre style="margin:0;white-space:pre-wrap;font-family:monospace">{escaped}</pre>'
            return ev["data"] or ""

        ev_rows = "".join(
            f"<tr data-type='{ev['type']}'>"
            f"<td style='white-space:nowrap'>{ev['timestamp']}</td>"
            f"<td><span class='badge badge-{ev['type']}'>{ev['type']}</span></td>"
            f"<td>{_ev_data_html(ev)}</td></tr>"
            for ev in events
        )
        shot_imgs = "".join(
            f'<div style="margin:8px 0"><p style="margin:0 0 4px;font-size:0.85em;color:#666">'
            f'{sh["timestamp"]}</p>{_img_tag(sh["path"])}</div>'
            for sh in shots
        )

        rows.append(f"""
        <section style="margin-bottom:3rem;border:1px solid #ddd;border-radius:8px;padding:1.5rem">
          <h2 style="margin-top:0">Sesja #{s['id']} — {s['hostname']}</h2>
          <table style="border-collapse:collapse;margin-bottom:1rem">
            <tr><th style="text-align:left;padding-right:2rem">Start</th><td>{s['start_time']}</td></tr>
            <tr><th style="text-align:left;padding-right:2rem">Koniec</th><td>{s['end_time'] or 'trwa'}</td></tr>
            <tr><th style="text-align:left;padding-right:2rem">Czas trwania</th><td>{dur}</td></tr>
            <tr><th style="text-align:left;padding-right:2rem">Screenshoty</th><td>{s['screenshot_count']}</td></tr>
          </table>

          <h3>Zdarzenia</h3>
          <div class="filters">
            <button onclick="filterRows(this,'all')"      class="active">Wszystkie</button>
            <button onclick="filterRows(this,'keylog')">  Klawisze</button>
            <button onclick="filterRows(this,'window_title')">Okna</button>
            <button onclick="filterRows(this,'new_process')">Procesy</button>
          </div>
          <table class="ev-table" style="width:100%;border-collapse:collapse;font-size:0.9em">
            <thead><tr style="background:#f5f5f5">
              <th style="text-align:left;padding:6px">Czas</th>
              <th style="text-align:left;padding:6px">Typ</th>
              <th style="text-align:left;padding:6px">Dane</th>
            </tr></thead>
            <tbody>{ev_rows or '<tr><td colspan=3><em>brak zdarzeń</em></td></tr>'}</tbody>
          </table>

          {'<h3>Screenshoty</h3>' + shot_imgs if shots else ''}
        </section>
        """)

    generated = datetime.now().isoformat(timespec="seconds")
    html = f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Laptop Monitor — Raport</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }}
    h1   {{ color: #c0392b; }}
    th   {{ font-weight: 600; }}
    td,th{{ border-bottom: 1px solid #eee; padding: 6px 8px; vertical-align: top; }}
    .filters {{ margin-bottom: 0.75rem; display: flex; gap: 6px; flex-wrap: wrap; }}
    .filters button {{
      padding: 4px 12px; border: 1px solid #ccc; border-radius: 20px;
      background: #f5f5f5; cursor: pointer; font-size: 0.85em;
    }}
    .filters button.active {{ background: #c0392b; color: #fff; border-color: #c0392b; }}
    .badge {{ display:inline-block; padding:1px 7px; border-radius:10px;
              font-size:0.8em; font-weight:600; }}
    .badge-keylog        {{ background:#ffeaa7; color:#636e72; }}
    .badge-window_title  {{ background:#dfe6e9; color:#2d3436; }}
    .badge-new_process   {{ background:#d5f5e3; color:#1e8449; }}
    .badge-session_start {{ background:#d6eaf8; color:#1a5276; }}
    .badge-session_end   {{ background:#f9ebea; color:#922b21; }}
    .badge-webcam_photo  {{ background:#f5cba7; color:#784212; }}
    tr.hidden {{ display: none; }}
  </style>
</head>
<body>
  <h1>Laptop Activity Monitor — Raport</h1>
  <p style="color:#666">Wygenerowano: {generated} &nbsp;|&nbsp; {len(sessions)} sesja(-e/-i)</p>
  {''.join(rows) if rows else '<p>Brak sesji.</p>'}
  <script>
    function filterRows(btn, type) {{
      const section = btn.closest('section');
      section.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      section.querySelectorAll('tr[data-type]').forEach(row => {{
        row.classList.toggle('hidden', type !== 'all' && row.dataset.type !== type);
      }});
    }}
  </script>
</body>
</html>"""

    with open(out_file, "w") as f:
        f.write(html)
    print(f"Report written to: {os.path.abspath(out_file)}")
    try:
        subprocess.Popen(["open", out_file])
    except FileNotFoundError:
        try:
            subprocess.Popen(["xdg-open", out_file])
        except FileNotFoundError:
            pass

# ── keylog view ───────────────────────────────────────────────────────────────

def cmd_keylog(conn, sid: int | None = None):
    sessions = [get_session(conn, sid)] if sid else all_sessions(conn)

    found = False
    for s in sessions:
        logs = conn.execute(
            "SELECT timestamp, data FROM events WHERE session_id=? AND type='keylog' ORDER BY timestamp",
            (s["id"],),
        ).fetchall()
        if not logs:
            continue
        found = True
        print(f"\n{'─'*60}")
        print(f"  Sesja #{s['id']}  —  {s['start_time']}")
        print(f"{'─'*60}")
        full_text = "".join(row["data"] for row in logs if row["data"])
        print(full_text)

    if not found:
        print("Brak keylogów." + (f" w sesji #{sid}" if sid else ""))

# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Laptop Activity Monitor — Report Viewer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--session", type=int, metavar="N", help="Focus on session #N")
    parser.add_argument("--html",    action="store_true",    help="Export HTML report")
    parser.add_argument("--keylog",  action="store_true",    help="Show only keystrokes")
    parser.add_argument("--open",    type=int, metavar="N",  help="Open screenshots from session #N")
    parser.add_argument("--delete",  type=int, metavar="N",  help="Delete session #N")
    parser.add_argument("--out",     default="report.html",  help="HTML output filename")
    args = parser.parse_args()

    conn = connect()

    if args.open:
        cmd_open(conn, args.open)
    elif args.delete:
        cmd_delete(conn, args.delete)
    elif args.keylog:
        cmd_keylog(conn, args.session)
    elif args.html:
        cmd_html(conn, args.session, args.out)
    elif args.session:
        cmd_session(conn, args.session)
    else:
        cmd_list(conn)


if __name__ == "__main__":
    main()
