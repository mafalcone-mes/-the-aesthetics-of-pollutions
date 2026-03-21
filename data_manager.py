import os
import csv
import statistics
from datetime import datetime



# --- CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FULL_CSV = os.path.join(BASE_DIR, 'full_history.csv')
HOURLY_CSV = os.path.join(BASE_DIR, 'hourly_archive.csv')
REPORTS_CSV = os.path.join(BASE_DIR, 'user_reports.csv')


# Buffers
sensor_histories = {} 
hourly_accumulator = {} 
last_hour = datetime.now().hour


def init_csv():
    # Initialize Sensor Data Files
    for f in [FULL_CSV, HOURLY_CSV]:
        if not os.path.exists(f):
            with open(f, 'w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['Timestamp', 'Sensor_ID', 'nh3', 'no2', 'co'])


# --- ADD THIS TO data_manager.py ---

def save_user_report(report_text, neighborhood, symptoms):
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file_path = REPORTS_CSV
        
        # Check if file exists to write header
        file_exists = os.path.isfile(REPORTS_CSV)
        
        with open(file_path, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            # Add the header if it's a new file
            if not file_exists:
                writer.writerow(['Timestamp', 'Neighborhood', 'Symptoms', 'Report'])
            
            # Save the 4 columns
            writer.writerow([timestamp, neighborhood, symptoms, report_text])
        return True

    except PermissionError:
        print("ERROR: 'user_reports.csv' is open in EXCEL. Close it and try again.")
        return False
    except Exception as e:
        print(f"ERROR saving report: {e}")
        return False
    
def get_recent_reports(limit=10):
    try:
        # Check if the file exists first
        if not os.path.exists(REPORTS_CSV):
            return []
        
        with open(REPORTS_CSV, mode='r', encoding='utf-8') as f:
            # DictReader uses the header row (Timestamp, Neighborhood, etc.) as keys
            reader = csv.DictReader(f)
            rows = list(reader)
            
            # Return the last 10 rows, reversed so the newest is at the top
            return rows[-limit:][::-1]
    except Exception as e:
        print(f"Error fetching logs: {e}")
        return []

    
import statistics

def get_daily_summary():
    daily_data = {}
    
    # 1. Process Sensor Data from HOURLY_CSV
    if os.path.exists(HOURLY_CSV):
        with open(HOURLY_CSV, 'r') as f:
            reader = csv.DictReader(f)
            for r in reader:
                day = r['Timestamp'].split(' ')[0] # Get YYYY-MM-DD
                if day not in daily_data:
                    daily_data[day] = {'nh3': [], 'no2': [], 'co': [], 'reports': 0}
                daily_data[day]['nh3'].append(float(r['nh3']))
                daily_data[day]['no2'].append(float(r['no2']))
                daily_data[day]['co'].append(float(r['co']))

    # 2. Process Report Counts from REPORTS_CSV
    if os.path.exists(REPORTS_CSV):
        with open(REPORTS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                day = r['Timestamp'].split(' ')[0]
                if day in daily_data:
                    daily_data[day]['reports'] += 1
                else:
                    daily_data[day] = {'nh3': [], 'no2': [], 'co': [], 'reports': 1}

    # 3. Format into a list for the Frontend
    summary = []
    for day in sorted(daily_data.keys()):
        summary.append({
            "date": day,
            "nh3": statistics.mean(daily_data[day]['nh3']) if daily_data[day]['nh3'] else 0,
            "no2": statistics.mean(daily_data[day]['no2']) if daily_data[day]['no2'] else 0,
            "co": statistics.mean(daily_data[day]['co']) if daily_data[day]['co'] else 0,
            "report_count": daily_data[day]['reports']
        })
    return summary

def process_incoming_data(data):
    global last_hour, hourly_accumulator
    sid = data.get('sensor_id', 'S1')
    now = datetime.now()
    ts = now.strftime("%Y-%m-%d %H:%M:%S")

    # 1. Save to Full History
    try:
        with open(FULL_CSV, 'a', newline='') as f:
            csv.writer(f).writerow([ts, sid, data['nh3'], data['no2'], data['co']])
    except PermissionError:
        print("CSV Locked. Close Excel.")

    # 2. Update Live Memory
    if sid not in sensor_histories: sensor_histories[sid] = []
    sensor_histories[sid].append({"nh3": data['nh3'], "no2": data['no2'], "co": data['co'], "time": ts, "sid": sid})
    if len(sensor_histories[sid]) > 100: sensor_histories[sid].pop(0)

    # 3. Hourly Average Logic
    if sid not in hourly_accumulator: hourly_accumulator[sid] = {"nh3":[], "no2":[], "co":[]}
    if now.hour != last_hour:
        for s_id, vals in hourly_accumulator.items():
            if vals["nh3"]:
                avg_ts = now.replace(minute=0, second=0).strftime("%Y-%m-%d %H:00:00")
                with open(HOURLY_CSV, 'a', newline='') as f:
                    csv.writer(f).writerow([avg_ts, s_id, statistics.mean(vals["nh3"]), statistics.mean(vals["no2"]), statistics.mean(vals["co"])])
        hourly_accumulator = {}
        last_hour = now.hour
    for k in ["nh3", "no2", "co"]: hourly_accumulator[sid][k].append(data[k])

def get_sensor_data_advanced(sid, start_str=None, end_str=None):
    """ The missing function for the Map Page """
    if not os.path.exists(FULL_CSV): return []
    
    with open(FULL_CSV, 'r') as f:
        all_rows = list(csv.DictReader(f))
    
    sensor_rows = [r for r in all_rows if r['Sensor_ID'] == sid]
    if not sensor_rows: return []

    # LIVE MODE
    if not start_str or start_str == "":
        return [{"time": r['Timestamp'], "nh3": float(r['nh3']), "no2": float(r['no2']), "co": float(r['co'])} for r in sensor_rows[-10:]]

    # HISTORY MODE
    try:
        s_dt = datetime.strptime(start_str.replace('T', ' ') + ":00", '%Y-%m-%d %H:%M:%S')
        e_dt = datetime.strptime(end_str.replace('T', ' ') + ":00", '%Y-%m-%d %H:%M:%S')
        diff = e_dt - s_dt
        
        in_range = []
        for r in sensor_rows:
            dt_obj = datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S')
            if s_dt <= dt_obj <= e_dt: in_range.append(r)
        
        if not in_range: return []

        group_format = "%Y-%m-%d %H:00" if diff.days <= 3 else "%Y-%m-%d"
        grouped = {}
        for r in in_range:
            key = datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S').strftime(group_format)
            if key not in grouped: grouped[key] = {'nh3':[], 'no2':[], 'co':[]}
            grouped[key]['nh3'].append(float(r['nh3']))
            grouped[key]['no2'].append(float(r['no2']))
            grouped[key]['co'].append(float(r['co']))
            
        return [{"time": k, "nh3": statistics.mean(grouped[k]['nh3']), "no2": statistics.mean(grouped[k]['no2']), "co": statistics.mean(grouped[k]['co'])} for k in sorted(grouped.keys())]
    except: return []

def get_global_mean():
    if not sensor_histories: return []
    active_ids = list(sensor_histories.keys())
    max_len = max(len(h) for h in sensor_histories.values())
    means = []
    for i in range(min(max_len, 10)):
        step = {"nh3": 0, "no2": 0, "co": 0, "time": ""}
        count = 0
        for sid in active_ids:
            h = sensor_histories[sid]
            idx = len(h) - 1 - i
            if idx >= 0:
                step["nh3"] += h[idx]["nh3"]; step["no2"] += h[idx]["no2"]; step["co"] += h[idx]["co"]
                step["time"] = h[idx]["time"]; count += 1
        if count > 0:
            step["nh3"] /= count; step["no2"] /= count; step["co"] /= count
            means.insert(0, step)
    return means

def get_archive(start_str, end_str, target_sid="All"):
    # This logic matches your current Archive Page requirements
    # (Simplified for brevity but compatible with your current archive.html)
    if not os.path.exists(FULL_CSV): return {"line": [], "bar": []}
    
    # Load Line Data
    line_data = get_sensor_data_advanced(target_sid, start_str, end_str) if target_sid != "All" else []
    if target_sid == "All":
        # Simplified All logic for Archive
        with open(FULL_CSV, 'r') as f:
            rows = list(csv.DictReader(f))
            if not start_str: rows = rows[-10:]
            line_data = [{"time": r['Timestamp'], "nh3": float(r['nh3']), "no2": float(r['no2']), "co": float(r['co']), "sid": r['Sensor_ID']} for r in rows]

    # Load Bar Data (Last 24h by default)
    bar_data = []
    with open(HOURLY_CSV, 'r') as f:
        history = list(csv.DictReader(f))
        latest_by_hour = {i: None for i in range(24)}
        for r in history:
            if target_sid != "All" and r['Sensor_ID'] != target_sid: continue
            latest_by_hour[datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S').hour] = r
        for h in range(24):
            if latest_by_hour[h]:
                m = latest_by_hour[h]
                bar_data.append({"time": m['Timestamp'], "nh3": float(m['nh3']), "no2": float(m['no2']), "co": float(m['co'])})
    
    return {"line": line_data, "bar": bar_data}


def get_sensor_live_window(sid):
    if not os.path.exists(FULL_CSV): return []
    with open(FULL_CSV, 'r') as f:
        rows = list(csv.DictReader(f))
        # Filter for sensor and take last 10
        sensor_rows = [r for r in rows if r['Sensor_ID'] == sid]
        results = []
        for r in sensor_rows[-10:]:
            results.append({
                "time": r['Timestamp'],
                "nh3": float(r['nh3']), "no2": float(r['no2']), "co": float(r['co'])
            })
        return results
    
def get_last_complete_hour():
    """Reads the very last entry from the hourly_archive.csv"""
    if not os.path.exists(HOURLY_CSV):
        return None
    try:
        with open(HOURLY_CSV, 'r') as f:
            reader = list(csv.DictReader(f))
            if not reader:
                return None
            # Return the last row as a dictionary
            return reader[-1] 
    except Exception as e:
        print(f"Error reading hourly archive: {e}")
        return None

def get_map_timeline(start_str, end_str):
    if not os.path.exists(FULL_CSV): return []
    
    try:
        s_dt = datetime.strptime(start_str.replace('T', ' ') + ":00", '%Y-%m-%d %H:%M:%S')
        e_dt = datetime.strptime(end_str.replace('T', ' ') + ":00", '%Y-%m-%d %H:%M:%S')
        diff = e_dt - s_dt
        
        # Determine grouping
        group_format = "%Y-%m-%d %H:00" if diff.days <= 3 else "%Y-%m-%d"
        
        with open(FULL_CSV, 'r') as f:
            reader = csv.DictReader(f)
            # Group data by Time -> Sensor_ID
            # Structure: { "2024-01-01 10:00": { "S1": {...}, "S2": {...} } }
            timeline_map = {}
            
            for r in reader:
                dt_obj = datetime.strptime(r['Timestamp'], '%Y-%m-%d %H:%M:%S')
                if s_dt <= dt_obj <= e_dt:
                    key = dt_obj.strftime(group_format)
                    sid = r['Sensor_ID']
                    
                    if key not in timeline_map:
                        timeline_map[key] = {}
                    if sid not in timeline_map[key]:
                        timeline_map[key][sid] = {'nh3':[], 'no2':[], 'co':[]}
                    
                    timeline_map[key][sid]['nh3'].append(float(r['nh3']))
                    timeline_map[key][sid]['no2'].append(float(r['no2']))
                    timeline_map[key][sid]['co'].append(float(r['co']))

        # Convert to a sorted list of steps
        final_timeline = []
        for ts in sorted(timeline_map.keys()):
            step_entry = {"time": ts, "sensors": {}}
            for sid, vals in timeline_map[ts].items():
                step_entry["sensors"][sid] = {
                    "nh3": statistics.mean(vals['nh3']),
                    "no2": statistics.mean(vals['no2']),
                    "co": statistics.mean(vals['co'])
                }
            final_timeline.append(step_entry)
            
        return final_timeline
    except:
        return []
    
    


    