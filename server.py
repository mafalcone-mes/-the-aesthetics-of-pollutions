from flask import Flask, render_template, request, jsonify, send_file
import data_manager


app = Flask(__name__)
data_manager.init_csv()

@app.route('/')
def home(): return render_template('home.html')

@app.route('/map')
def map_page(): return render_template('map.html')

@app.route('/symptoms')
def symptoms_page(): return render_template('symptoms.html')

@app.route('/archive')
def archive_page(): return render_template('archive.html')

@app.route('/report')
def report_page():
    return render_template('report.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.route('/demo')
def demo_page():
    return render_template('demo_map.html')

@app.route('/data', methods=['POST'])
def receive_data():
    data_manager.process_incoming_data(request.json)
    return jsonify({"status": "ok"}), 200

@app.route('/api/sensor/<sid>')
def api_sensor(sid):
    start = request.args.get('start', '')
    end = request.args.get('end', '')
    return jsonify(data_manager.get_sensor_data_advanced(sid, start, end))

@app.route('/api/mean')
def api_mean():
    return jsonify(data_manager.get_global_mean())

@app.route('/api/fetch-archive')
def api_archive():
    start = request.args.get('start', '')
    end = request.args.get('end', '')
    sid = request.args.get('sid', 'All')
    return jsonify(data_manager.get_archive(start, end, sid))

@app.route('/download-archive')
def download():
    return send_file(data_manager.FULL_CSV, as_attachment=True)

@app.route('/api/map-timeline')
def api_map_timeline():
    start = request.args.get('start', '')
    end = request.args.get('end', '')
    if not start or not end: return jsonify([])
    return jsonify(data_manager.get_map_timeline(start, end))

@app.route('/submit-report', methods=['POST'])
def submit_report():
    # If you see this in the terminal, the connection is working!
    print("--> Received a POST request to /submit-report") 
    
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No JSON data received"}), 400
    
    report_text = data.get('report_text', '')
    neighborhood = data.get('neighborhood', 'Unknown') # Defaults to 'Unknown' if not provided
    symptoms = data.get('symptoms', 'None reported') # Get the symptoms string
    
    # Call the data_manager function
    success = data_manager.save_user_report(report_text, neighborhood, symptoms)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save to CSV"}), 500

@app.route('/api/last-reports')
def api_last_reports():
    try:
        # Call the data_manager function
        reports = data_manager.get_recent_reports(10)
        return jsonify(reports)
    except Exception as e:
        print(f"CRITICAL ROUTE ERROR: {e}")
        return jsonify([]) # Return empty list so the website doesn't crash
    
@app.route('/api/daily-summary')
def api_daily_summary():
    try:
        # Calls the function from your data_manager.py
        summary = data_manager.get_daily_summary()
        return jsonify(summary)
    except Exception as e:
        print(f"ERROR in daily-summary route: {e}")
        return jsonify([]), 500

if __name__ == '__main__':
    # DO NOT PUT ROUTES BELOW THIS LINE
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
if __name__ == '__main__':
    # use_reloader=False prevents the "WinError 10038" on Windows
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)

@app.route('/api/toxicity-data')
def api_toxicity_data():
    data = data_manager.get_last_complete_hour()
    if data:
        return jsonify({
            "time": data['Timestamp'],
            "nh3": float(data['nh3']),
            "no2": float(data['no2']),
            "co": float(data['co'])
        })
    return jsonify({"error": "No data available"}), 404

# --- ADD THIS TO server.py ---



# faccio dei cambiamenti a caso nel file

# sto sviluppando e sono molto bravo