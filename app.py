from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active rooms and users
rooms = {}
gesture_data = {}

# Ensure data directory exists
data_dir = os.path.join(os.path.dirname(__file__), 'data')
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

# Load existing gesture data
gesture_file_path = os.path.join(data_dir, 'gestures.json')
if os.path.exists(gesture_file_path):
    try:
        with open(gesture_file_path, 'r') as f:
            gesture_data = json.load(f)
    except:
        gesture_data = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/gestures', methods=['POST'])
def save_gesture():
    data = request.get_json()
    gesture_name = data.get('gestureName')
    landmarks = data.get('landmarks')
    gesture_id = str(uuid.uuid4())
    
    if gesture_name not in gesture_data:
        gesture_data[gesture_name] = []
    
    gesture_data[gesture_name].append({
        'id': gesture_id,
        'landmarks': landmarks,
        'timestamp': datetime.now().isoformat()
    })
    
    # Save to file
    with open(gesture_file_path, 'w') as f:
        json.dump(gesture_data, f, indent=2)
    
    return jsonify({'success': True, 'gestureId': gesture_id})

@app.route('/api/gestures', methods=['GET'])
def get_gestures():
    return jsonify(gesture_data)

@app.route('/api/gestures/<gesture_name>', methods=['DELETE'])
def delete_gesture(gesture_name):
    if gesture_name in gesture_data:
        del gesture_data[gesture_name]
        
        # Save to file
        with open(gesture_file_path, 'w') as f:
            json.dump(gesture_data, f, indent=2)
    
    return jsonify({'success': True})

@socketio.on('connect')
def handle_connect():
    print(f'User connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'User disconnected: {request.sid}')
    
    # Remove from rooms
    for room_id, users in rooms.items():
        if request.sid in users:
            users.remove(request.sid)
            emit('user-left', request.sid, room=room_id)
            
            if not users:
                del rooms[room_id]
            break

@socketio.on('join-room')
def handle_join_room(room_id):
    join_room(room_id)
    
    if room_id not in rooms:
        rooms[room_id] = set()
    rooms[room_id].add(request.sid)
    
    # Notify others in room
    emit('user-joined', request.sid, room=room_id, include_self=False)
    
    print(f'User {request.sid} joined room {room_id}')

@socketio.on('offer')
def handle_offer(data):
    emit('offer', {
        'offer': data['offer'],
        'from': request.sid
    }, room=data['roomId'], include_self=False)

@socketio.on('answer')
def handle_answer(data):
    emit('answer', {
        'answer': data['answer'],
        'from': request.sid
    }, room=data['roomId'], include_self=False)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    emit('ice-candidate', {
        'candidate': data['candidate'],
        'from': request.sid
    }, room=data['roomId'], include_self=False)

@socketio.on('gesture-detected')
def handle_gesture_detected(data):
    emit('gesture-detected', {
        'gesture': data['gesture'],
        'from': request.sid,
        'timestamp': datetime.now().isoformat()
    }, room=data['roomId'], include_self=False)

if __name__ == '__main__':
    print("Starting Hand Gesture Recognition Server...")
    print("Visit http://localhost:5000 to use the application")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000) 