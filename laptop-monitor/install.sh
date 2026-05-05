#!/usr/bin/env bash
# Laptop Activity Monitor — installer
# Supports macOS and Linux.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/.laptop-monitor"
PLATFORM="$(uname -s)"   # Darwin or Linux

echo "=== Laptop Activity Monitor installer ==="
echo "Platform: $PLATFORM"
echo

# ── 1. Create data directory ──────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR/screenshots"
echo "[1/5] Data directory: $INSTALL_DIR"

# ── 2. Copy scripts ───────────────────────────────────────────────────────────
cp "$SCRIPT_DIR/monitor.py" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/report.py"  "$INSTALL_DIR/"
if [ ! -f "$INSTALL_DIR/config.json" ]; then
    cp "$SCRIPT_DIR/config.json" "$INSTALL_DIR/"
    echo "[2/5] Config written — edit $INSTALL_DIR/config.json to customise"
else
    echo "[2/5] Existing config preserved"
fi

# ── 3. Python virtualenv + deps ───────────────────────────────────────────────
echo "[3/5] Installing Python dependencies..."
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --quiet --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"
echo "      Done."

# ── 4. Convenience wrappers ───────────────────────────────────────────────────
mkdir -p "$HOME/bin"

cat > "$HOME/bin/laptop-monitor" <<EOF
#!/usr/bin/env bash
"$INSTALL_DIR/venv/bin/python" "$INSTALL_DIR/monitor.py" "\$@"
EOF
chmod +x "$HOME/bin/laptop-monitor"

cat > "$HOME/bin/laptop-report" <<EOF
#!/usr/bin/env bash
"$INSTALL_DIR/venv/bin/python" "$INSTALL_DIR/report.py" "\$@"
EOF
chmod +x "$HOME/bin/laptop-report"

echo "[4/5] Commands created: laptop-monitor, laptop-report"
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo "      NOTE: add ~/bin to PATH — add this line to ~/.zprofile or ~/.bash_profile:"
    echo "      export PATH=\"\$HOME/bin:\$PATH\""
fi

# ── 5. Autostart ──────────────────────────────────────────────────────────────
read -rp "[5/5] Install autostart (daemon runs at login)? [y/N] " REPLY
if [[ "$(echo "$REPLY" | tr '[:upper:]' '[:lower:]')" == "y" ]]; then
    if [[ "$PLATFORM" == "Darwin" ]]; then
        # macOS — LaunchAgent
        PLIST_DIR="$HOME/Library/LaunchAgents"
        PLIST_FILE="$PLIST_DIR/com.user.laptop-monitor.plist"
        mkdir -p "$PLIST_DIR"
        sed "s|__INSTALL_DIR__|$INSTALL_DIR|g" \
            "$SCRIPT_DIR/laptop-monitor.plist" > "$PLIST_FILE"
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        launchctl load -w "$PLIST_FILE"
        echo "      LaunchAgent installed and started."
        echo "      Stop:    launchctl unload ~/Library/LaunchAgents/com.user.laptop-monitor.plist"
        echo "      Start:   launchctl load -w ~/Library/LaunchAgents/com.user.laptop-monitor.plist"
    else
        # Linux — systemd user service
        SERVICE_DIR="$HOME/.config/systemd/user"
        mkdir -p "$SERVICE_DIR"
        cp "$SCRIPT_DIR/laptop-monitor.service" "$SERVICE_DIR/"
        systemctl --user daemon-reload
        systemctl --user enable laptop-monitor
        systemctl --user start  laptop-monitor
        echo "      systemd service enabled and started."
        echo "      Status: systemctl --user status laptop-monitor"
    fi
else
    echo "      Skipped. Start manually: laptop-monitor --run &"
fi

# ── macOS: optional tools hint ────────────────────────────────────────────────
if [[ "$PLATFORM" == "Darwin" ]]; then
    echo
    echo "── macOS permissions required ──────────────────────────────────────────"
    echo "  Before first use, grant your Terminal (or iTerm2) these permissions:"
    echo "  System Settings → Privacy & Security:"
    echo "    • Accessibility       (required — keyboard/mouse monitoring)"
    echo "    • Screen Recording    (required — screenshots)"
    echo "    • Camera              (optional — webcam photos, --webcam flag)"
    echo
    echo "── Optional tools (via Homebrew) ───────────────────────────────────────"
    echo "  brew install imagesnap   # webcam photos"
fi

echo
echo "=== Installation complete ==="
echo
echo "Quick start:"
echo "  1. Start daemon:       laptop-monitor --run  (or autostart above)"
echo "  2. Arm before leaving: laptop-monitor --arm"
echo "  3. Disarm on return:   laptop-monitor --disarm"
echo "  4. View report:        laptop-report"
echo "  5. HTML report:        laptop-report --html"
echo "  6. Telegram setup:     laptop-monitor --setup-telegram"
echo
echo "Config: $INSTALL_DIR/config.json"
echo "Logs:   $INSTALL_DIR/monitor.log"
