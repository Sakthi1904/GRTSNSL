# Hand Gesture Recognizer 
A real-time web application that allows users to train custom hand gesture recognizers and use them in video calls with live translation to text and audio. This is the Python Flask version of the original Node.js application.

## Features

### 🎯 Core Functionality

- **Custom Gesture Training**: Train your own hand gestures by showing them to the webcam
- **Real-time Recognition**: Instantly recognize trained gestures during video calls
- **Text-to-Speech**: Automatic audio feedback for recognized gestures
- **Video Call Integration**: Seamless integration with WebRTC video calls
- **Live Overlay**: Visual feedback with hand landmark tracking

### 🚀 Key Features

#### Training Mode
- Point your webcam at a hand gesture
- Input a name/label for the gesture
- Capture multiple samples automatically
- Real-time hand landmark visualization
- Client-side and server-side storage

#### Recognition Mode
- Real-time gesture classification
- Confidence scoring
- Audio feedback (optional)
- FPS monitoring
- Continuous recognition

#### Video Call Mode
- WebRTC peer-to-peer video calls
- Gesture recognition overlay
- Real-time gesture sharing between participants
- Room-based connections

## Technology Stack

- **Backend**: Python Flask, Flask-SocketIO
- **Frontend**: JavaScript, HTML5, CSS3
- **Real-time Communication**: Socket.IO (Python)
- **Machine Learning**: TensorFlow.js, HandPose model (client-side)
- **WebRTC**: Peer-to-peer video calls
- **Speech Synthesis**: Web Speech API

## Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)
- Modern web browser with camera access

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hand-gesture-recognizer-python
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the server**
   ```bash
   python app.py
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
hand-gesture-recognizer-python/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── styles.css    # Application styles
│   └── js/
│       └── app.js        # Main JavaScript application
└── data/
    └── gestures.json     # Persistent gesture storage
```

## Usage Guide

### Getting Started

1. **Allow Camera Access**: When prompted, allow the application to access your webcam
2. **Choose Mode**: Select between Training, Recognition, or Video Call modes
3. **Train Gestures**: Start with Training Mode to create your custom gestures

### Training Custom Gestures

1. **Switch to Training Mode**: Click the "Training Mode" button
2. **Enter Gesture Name**: Type a descriptive name for your gesture (e.g., "Hello", "Thumbs Up")
3. **Start Training**: Click "Start Training" and show the gesture to your camera
4. **Capture Samples**: The system will automatically capture multiple samples
5. **Stop Training**: Click "Stop Training" when you have enough samples (recommended: 20-30 samples)

**Tips for Better Training:**
- Ensure good lighting
- Keep your hand clearly visible
- Vary the position slightly between samples
- Use consistent hand orientation
- Train multiple variations of the same gesture

### Using Recognition Mode

1. **Switch to Recognition Mode**: Click the "Recognition Mode" button
2. **Start Recognition**: Click "Start Recognition"
3. **Show Gestures**: Display your trained gestures to the camera
4. **View Results**: See the recognized gesture name and confidence score
5. **Audio Feedback**: Toggle audio feedback on/off as needed

### Video Call Integration

1. **Switch to Video Call Mode**: Click the "Video Call Mode" button
2. **Join a Room**: Enter a room ID and click "Join Room"
3. **Share Room ID**: Share the room ID with another user
4. **Start Call**: The other user joins the same room ID
5. **Gesture Recognition**: Both users can see each other's recognized gestures

## API Endpoints

### Gesture Management

- `POST /api/gestures` - Save a new gesture sample
- `GET /api/gestures` - Retrieve all saved gestures
- `DELETE /api/gestures/:gestureName` - Delete a specific gesture

### WebSocket Events

- `join-room` - Join a video call room
- `leave-room` - Leave a video call room
- `offer` - WebRTC offer for peer connection
- `answer` - WebRTC answer for peer connection
- `ice-candidate` - ICE candidate exchange
- `gesture-detected` - Share detected gestures

## Technical Architecture

### Backend Architecture (Python Flask)

```python
app.py              # Main Flask application with Socket.IO
├── Routes          # API endpoints for gesture management
├── Socket.IO       # Real-time communication handling
└── Data Storage    # JSON-based gesture persistence
```

### Frontend Architecture

```
static/
├── js/app.js       # Main application logic
└── css/styles.css  # Application styles
```

### Key Components

1. **HandPose Integration**: Uses TensorFlow.js HandPose model for hand landmark detection
2. **Gesture Classifier**: Custom KNN-based classifier for gesture recognition
3. **WebRTC Manager**: Handles peer-to-peer video connections
4. **Socket.IO Handler**: Manages real-time communication
5. **Speech Synthesis**: Provides audio feedback for recognized gestures

## Performance Optimization

- **Model Loading**: HandPose model is loaded once and reused
- **Frame Processing**: Efficient frame capture and processing
- **Memory Management**: Proper cleanup of video streams and connections
- **Caching**: Gesture data is cached locally and on server

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Note**: WebRTC and Web Speech API support may vary by browser.

## Troubleshooting

### Common Issues

1. **Camera Not Working**
   - Check browser permissions
   - Ensure no other applications are using the camera
   - Try refreshing the page

2. **Models Not Loading**
   - Check internet connection
   - Clear browser cache
   - Try a different browser

3. **Python Dependencies**
   - Ensure you're using the correct Python version
   - Try reinstalling dependencies: `pip install -r requirements.txt --force-reinstall`

4. **Port Already in Use**
   - Change the port in `app.py` or kill the process using the port
   - Default port is 5000

## Development

### Running in Development Mode

The application runs in debug mode by default. For production deployment:

1. Set `debug=False` in `app.py`
2. Use a production WSGI server like Gunicorn
3. Configure proper environment variables

### Adding New Features

1. **Backend**: Add new routes in `app.py`
2. **Frontend**: Modify `static/js/app.js` for new functionality
3. **Styling**: Update `static/css/styles.css` for UI changes


