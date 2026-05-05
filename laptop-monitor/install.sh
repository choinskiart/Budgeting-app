#!/usr/bin/env bash
# Laptop Activity Monitor — installer
# Installs dependencies, copies files to ~/.laptop-monitor, and registers
# an optional systemd user service that starts automatically at login.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/.laptop-monitor"
SERVICE_NAME="laptop-monitor"

echo "=== Laptop Activity Monitor installer ==="
echo

# ── 1. Create data/install directory ─────────────────────────────────────────
mkdir -p "$INSTALL_DIR/screenshots"
echo "[1/5] Data directory: $INSTALL_DIR"

# ── 2. Copy scripts ───────────────────────────────────────────────────────────
cp "$SCRIPT_DIR/monitor.py" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/report.py"  "$INSTALL_DIR/"
if [ ! -f "$INSTALL_DIR/config.json" ]; then
    cp "$SCRIPT_DIR/config.json" "$INSTALL_DIR/"
    echo "[2/5] Config written — edit $INSTALL_DIR/config.json to enable email alerts"
else
    echo "[2/5] Existing config preserved"
fi

# ── 3. Python virtualenv + deps ───────────────────────────────────────────────
echo "[3/5] Installing Python dependencies..."
python3 -m venv "$INSTALL_DIR/venv" --system-site-packages
"$INSTALL_DIR/venv/bin/pip" install --quiet --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"
echo "      Done."

# ── 4. Convenience wrappers in ~/bin ─────────────────────────────────────────
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

echo "[4/5] Wrapper commands created: laptop-monitor, laptop-report"
echo "      Make sure ~/bin is in your PATH."

# ── 5. Optional systemd user service ─────────────────────────────────────────
read -rp "[5/5] Install systemd user service (auto-start at login)? [y/N] " REPLY
if [[ "${REPLY,,}" == "y" ]]; then
    SERVICE_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SERVICE_DIR"
    cp "$SCRIPT_DIR/$SERVICE_NAME.service" "$SERVICE_DIR/"
    systemctl --user daemon-reload
    systemctl --user enable "$SERVICE_NAME"
    systemctl --user start  "$SERVICE_NAME"
    echo "      Service enabled and started."
    echo "      Status: systemctl --user status $SERVICE_NAME"
else
    echo "      Skipped. Start manually: laptop-monitor --run &"
fi

echo
echo "=== Installation complete ==="
echo
echo "Quick start:"
echo "  1. Start daemon:       laptop-monitor --run  (or the systemd service above)"
echo "  2. Arm before leaving: laptop-monitor --arm"
echo "  3. Disarm on return:   laptop-monitor --disarm"
echo "  4. View reports:       laptop-report"
echo "  5. HTML report:        laptop-report --html"
echo
echo "Config: $INSTALL_DIR/config.json"
echo "Logs:   $INSTALL_DIR/monitor.log"
echo "Data:   $INSTALL_DIR/"
