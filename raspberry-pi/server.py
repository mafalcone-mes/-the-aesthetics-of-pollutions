#!/usr/bin/env python3
"""
Aria Bene Comune — Raspberry Pi Dashboard Server

Reads from:
  SDS011  on /dev/ttyUSB0  → pm25, pm10
  ESP32   on /dev/ttyACM0  → nh3, no2, co, temperature, humidity, pressure

Serves:
  GET /api/live     → latest merged reading (JSON)
  GET /api/history  → last 24 h of merged readings (JSON array)
  GET /api/status   → sensor connectivity info
  GET /*            → React dashboard (static files in dist/)

Also keeps the original endpoints for backwards-compatibility:
  GET  /api/pm      → last 50 SDS011 readings
  GET  /api/mean    → last 50 ESP32 readings (averaged across sensor ids)
  POST /data        → ESP32 HTTP POST fallback
"""

import csv
import json
import os
import threading
import serial
from collections import deque
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS

# ── Config ────────────────────────────────────────────────────────────────────
STATIC_DIR   = Path(__file__).parent / "dist"
ESP_CSV      = Path(__file__).parent / 'esp_data.csv'
SDS_CSV      = Path(__file__).parent / 'sds011_data.csv'
HISTORY_FILE = Path(__file__).parent / 'history.json'

SDS011_PORT  = '/dev/ttyUSB0'
ESP_PORT     = '/dev/ttyACM0'
ESP_BAUD     = 115200
HISTORY_LEN  = 50          # rows kept for /api/pm and /api/mean
HISTORY_SECS = 24 * 3600   # 24 h rolling window for /api/history
MERGE_EVERY  = 30           # seconds between merged snapshots

ESP_FIELDS   = ['nh3', 'no2', 'co', 'temperature', 'humidity', 'pressure', 'gas_kohm']

# ── Shared state ─────────────────────────────────────────────────────────────
_lock         = threading.Lock()
_latest_sds   = {}    # {pm25, pm10, ts}
_latest_esp   = {}    # {nh3, no2, co, temperature, humidity, pressure, gas_kohm, ts}
_latest_merge = None  # combined snapshot sent to /api/live
_history      = deque(maxlen=(HISTORY_SECS // MERGE_EVERY))  # merged snapshots
_sds_ok       = False
_esp_ok       = False

# ── CSV helpers ───────────────────────────────────────────────────────────────
def _init_csv(path, headers):
    if not os.path.exists(path):
        with open(path, 'w', newline='') as f:
            csv.writer(f).writerow(headers)

def _append_csv(path, row):
    with open(path, 'a', newline='') as f:
        csv.writer(f).writerow(row)

def _tail_csv(path, n):
    try:
        with open(path, newline='') as f:
            return list(csv.DictReader(f))[-n:]
    except FileNotFoundError:
        return []

_init_csv(ESP_CSV, ['timestamp', 'sensor_id'] + ESP_FIELDS)
_init_csv(SDS_CSV, ['timestamp', 'pm25', 'pm10'])

# ── Persistence (merged history) ──────────────────────────────────────────────
def _load_history():
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE) as f:
                for row in json.load(f):
                    _history.append(row)
            print(f"[server] loaded {len(_history)} historic snapshots")
        except Exception as e:
            print(f"[server] could not load history: {e}")

def _save_history():
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(list(_history), f)
    except Exception as e:
        print(f"[server] could not save history: {e}")

# ── Merge loop: takes a snapshot every MERGE_EVERY seconds ───────────────────
def _build_snapshot():
    now = datetime.now()
    with _lock:
        sds = dict(_latest_sds)
        esp = dict(_latest_esp)
    return {
        "ts":      now.isoformat(),
        "dateStr": now.strftime("%d/%m/%Y"),
        "hourStr": now.strftime("%H:%M"),
        "hour":    now.hour,
        "pm25":    sds.get("pm25",  0),
        "pm10":    sds.get("pm10",  0),
        "no2":     esp.get("no2",   0),
        "o3":      0,                         # not measured
        "so2":     0,                         # not measured
        "co":      esp.get("co",    0),
        "nh3":     esp.get("nh3",   0),
        "c6h6":    0,                         # not measured
        "temp":    esp.get("temperature", 0),
        "hum":     esp.get("humidity",    0),
    }

def _merge_loop():
    global _latest_merge
    while True:
        threading.Event().wait(MERGE_EVERY)
        snap = _build_snapshot()
        with _lock:
            _latest_merge = snap
            _history.append(snap)
        _save_history()

# ── SDS011 background reader ──────────────────────────────────────────────────
def _sds011_reader():
    global _sds_ok
    try:
        ser = serial.Serial(SDS011_PORT, 9600, timeout=2)
        _sds_ok = True
        print(f"[SDS011] connected on {SDS011_PORT}")
    except serial.SerialException as e:
        print(f"[SDS011] unavailable: {e}")
        return
    while True:
        try:
            if ser.read(1) != b'\xaa':
                continue
            pkt = ser.read(9)
            if len(pkt) != 9 or pkt[0] != 0xc0 or pkt[8] != 0xab:
                continue
            if sum(pkt[1:7]) % 256 != pkt[7]:
                continue
            pm25 = round((pkt[2] * 256 + pkt[1]) / 10.0, 1)
            pm10 = round((pkt[4] * 256 + pkt[3]) / 10.0, 1)
            ts   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            with _lock:
                _latest_sds.update({"pm25": pm25, "pm10": pm10, "ts": ts})
            _append_csv(SDS_CSV, [ts, pm25, pm10])
            print(f"[SDS011] pm2.5={pm25}  pm10={pm10}")
        except Exception as e:
            print(f"[SDS011] error: {e}")

# ── ESP32 background reader ───────────────────────────────────────────────────
def _esp_reader():
    global _esp_ok
    try:
        ser = serial.Serial(ESP_PORT, ESP_BAUD, timeout=5)
        _esp_ok = True
        print(f"[ESP32] connected on {ESP_PORT}")
    except serial.SerialException as e:
        print(f"[ESP32] unavailable: {e}")
        return
    while True:
        try:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line.startswith('{'):
                continue
            data = json.loads(line)
            ts   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            sid  = data.get('sensor_id', 'S1')
            with _lock:
                for f in ESP_FIELDS:
                    if f in data:
                        _latest_esp[f] = data[f]
                _latest_esp['ts'] = ts
            _append_csv(ESP_CSV, [ts, sid] + [data.get(f, '') for f in ESP_FIELDS])
            print(f"[ESP32] nh3={data.get('nh3')}  no2={data.get('no2')}  co={data.get('co')}  temp={data.get('temperature')}")
        except json.JSONDecodeError:
            pass
        except Exception as e:
            print(f"[ESP32] error: {e}")

# ── Simulation fallback (used on laptop / when hardware is absent) ────────────
import math, random

_SIM_BASE  = {'pm25': 18.0, 'pm10': 38.0, 'no2': 32.0, 'co': 1.2,
              'nh3': 9.0, 'temperature': 21.0, 'humidity': 58.0, 'pressure': 1013.0}
_SIM_DRIFT = {'pm25': 1.5, 'pm10': 3.0, 'no2': 2.5, 'co': 0.05,
              'nh3': 0.8, 'temperature': 0.3, 'humidity': 1.0, 'pressure': 0.5}
_SIM_MIN   = {'pm25': 2,   'pm10': 5,   'no2': 2,   'co': 0.2,
              'nh3': 0,   'temperature': 5,   'humidity': 15,  'pressure': 990.0}
_SIM_MAX   = {'pm25': 80,  'pm10': 160, 'no2': 150, 'co': 8.0,
              'nh3': 120,  'temperature': 45,  'humidity': 98,  'pressure': 1030.0}
_sim_cur   = dict(_SIM_BASE)

def _simulate_loop():
    """Fills _latest_sds and/or _latest_esp with random-walk data for sensors
    that are not physically connected."""
    global _sim_cur
    while True:
        for key in _sim_cur:
            d = random.gauss(0, _SIM_DRIFT[key])
            pull = (_SIM_BASE[key] - _sim_cur[key]) * 0.05
            _sim_cur[key] = max(_SIM_MIN[key], min(_SIM_MAX[key], _sim_cur[key] + d + pull))

        ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with _lock:
            if not _sds_ok:
                _latest_sds.update({
                    'pm25': round(_sim_cur['pm25'], 1),
                    'pm10': round(_sim_cur['pm10'], 1),
                    'ts':   ts,
                })
            if not _esp_ok:
                _latest_esp.update({
                    'nh3':         round(_sim_cur['nh3'], 2),
                    'no2':         round(_sim_cur['no2'], 2),
                    'co':          round(_sim_cur['co'], 3),
                    'temperature': round(_sim_cur['temperature'], 1),
                    'humidity':    round(_sim_cur['humidity'], 1),
                    'pressure':    round(_sim_cur['pressure'], 1),
                    'gas_kohm':    0,
                    'ts':          ts,
                })
        threading.Event().wait(30)

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=None)
CORS(app)

# ── New endpoints (consumed by the React dashboard) ──────────────────────────

@app.route('/api/live')
def api_live():
    with _lock:
        data = _latest_merge or _build_snapshot()
    return jsonify(data)

@app.route('/api/history')
def api_history():
    with _lock:
        return jsonify(list(_history))

@app.route('/api/status')
def api_status():
    with _lock:
        n = len(_history)
    return jsonify({
        "sds011_connected": _sds_ok,
        "esp32_connected":  _esp_ok,
        "history_count":    n,
        "merge_interval_s": MERGE_EVERY,
    })

# ── Original endpoints (kept for backwards-compatibility) ────────────────────

@app.route('/data', methods=['POST'])
def receive_data():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"status": "error", "msg": "no json"}), 400
    ts  = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    sid = data.get('sensor_id', 'S1')
    with _lock:
        for f in ESP_FIELDS:
            if f in data:
                _latest_esp[f] = data[f]
        _latest_esp['ts'] = ts
    _append_csv(ESP_CSV, [ts, sid] + [data.get(f, '') for f in ESP_FIELDS])
    return jsonify({"status": "ok"}), 200

@app.route('/api/pm')
def api_pm():
    rows = _tail_csv(SDS_CSV, HISTORY_LEN)
    return jsonify([
        {'pm25': float(r['pm25']), 'pm10': float(r['pm10']), 'time': r['timestamp'][11:19]}
        for r in rows
    ])

@app.route('/api/mean')
def api_mean():
    rows = _tail_csv(ESP_CSV, HISTORY_LEN)
    if not rows:
        return jsonify([])
    sensors = {}
    for r in rows:
        sid = r.get('sensor_id', 'S1')
        if sid not in sensors:
            sensors[sid] = []
        entry = {f: float(r[f]) if r.get(f) != '' else 0 for f in ESP_FIELDS}
        entry['time'] = r['timestamp'][11:19]
        sensors[sid].append(entry)
    max_len = max(len(h) for h in sensors.values())
    means = []
    for i in range(max_len):
        step  = {f: 0.0 for f in ESP_FIELDS}
        step['time'] = ''
        count = 0
        for hist in sensors.values():
            idx = len(hist) - max_len + i
            if idx >= 0:
                e = hist[idx]
                for f in ESP_FIELDS:
                    step[f] += e.get(f, 0)
                step['time'] = e['time']
                count += 1
        if count > 0:
            for f in ESP_FIELDS:
                step[f] = round(step[f] / count, 2)
            means.append(step)
    return jsonify(means)

# ── Static file serving (React dashboard) ────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    target = STATIC_DIR / path if path else None
    if path and target and target.exists() and target.is_file():
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, 'index.html')

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    _load_history()

    # Take an immediate snapshot so /api/live returns something right away
    snap = _build_snapshot()
    with _lock:
        _latest_merge = snap
        _history.append(snap)

    threading.Thread(target=_sds011_reader, daemon=True).start()
    threading.Thread(target=_esp_reader,    daemon=True).start()

    # Give serial readers a moment to connect before deciding to simulate
    threading.Event().wait(2)
    if not _sds_ok or not _esp_ok:
        print("[server] hardware not fully connected — starting simulation for missing sensors")
        threading.Thread(target=_simulate_loop, daemon=True).start()

    threading.Thread(target=_merge_loop, daemon=True).start()

    print("\nAria Bene Comune Pi Server running at http://0.0.0.0:5050")
    print("Find the Pi IP with:  hostname -I\n")
    app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False, threaded=True)
