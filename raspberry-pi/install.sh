#!/usr/bin/env bash
# Aria Bene Comune — Raspberry Pi installer
# Run once on the Pi:  bash install.sh
set -e

echo "=== Aria Bene Comune Pi Setup ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/3] Installing Python dependencies..."
sudo apt-get install -y python3-venv --quiet
python3 -m venv "$SCRIPT_DIR/venv"
"$SCRIPT_DIR/venv/bin/pip" install --upgrade pip --quiet
"$SCRIPT_DIR/venv/bin/pip" install -r "$SCRIPT_DIR/requirements.txt" --quiet

echo "[2/3] Installing systemd service..."
sed "s|__INSTALL_DIR__|$SCRIPT_DIR|g" "$SCRIPT_DIR/aria-bene-pi.service" \
  > /tmp/aria-bene-pi.service
sudo cp /tmp/aria-bene-pi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable aria-bene-pi.service

echo "[3/3] Starting service..."
sudo systemctl restart aria-bene-pi.service
sleep 2
sudo systemctl status aria-bene-pi.service --no-pager

echo ""
echo "Dashboard available at:  http://$(hostname -I | awk '{print $1}'):5050"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status  aria-bene-pi"
echo "  sudo systemctl restart aria-bene-pi"
echo "  journalctl -u aria-bene-pi -f"
