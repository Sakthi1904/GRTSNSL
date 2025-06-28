// Hand Gesture Recognition Application
class HandGestureRecognizer {
    constructor() {
        this.handpose = null;
        this.net = null;
        this.isTraining = false;
        this.isRecognizing = false;
        this.gestureData = {};
        this.currentGesture = '';
        this.sampleCount = 0;
        this.fps = 0;
        this.lastTime = 0;
        this.socket = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.roomId = null;
        this.speechSynthesis = window.speechSynthesis;
        this.lastSpokenGesture = null; // Track last spoken gesture
        
        this.initializeElements();
        this.initializeSocket();
        this.loadModels();
    }

    async initializeElements() {
        // Mode buttons
        this.trainingModeBtn = document.getElementById('trainingMode');
        this.recognitionModeBtn = document.getElementById('recognitionMode');
        this.videoCallModeBtn = document.getElementById('videoCallMode');

        // Training elements
        this.trainingSection = document.getElementById('trainingSection');
        this.recognitionSection = document.getElementById('recognitionSection');
        this.videoCallSection = document.getElementById('videoCallSection');
        this.gestureNameInput = document.getElementById('gestureName');
        this.startTrainingBtn = document.getElementById('startTraining');
        this.stopTrainingBtn = document.getElementById('stopTraining');
        this.sampleCountSpan = document.getElementById('sampleCount');
        this.trainingStatusSpan = document.getElementById('trainingStatus');
        this.trainingVideo = document.getElementById('trainingVideo');
        this.trainingCanvas = document.getElementById('trainingCanvas');
        this.trainingInstructions = document.getElementById('trainingInstructions');
        this.gestureList = document.getElementById('gestureList');

        // Recognition elements
        this.startRecognitionBtn = document.getElementById('startRecognition');
        this.stopRecognitionBtn = document.getElementById('stopRecognition');
        this.enableAudioCheckbox = document.getElementById('enableAudio');
        this.testAudioBtn = document.getElementById('testAudio');
        this.recognitionVideo = document.getElementById('recognitionVideo');
        this.recognitionCanvas = document.getElementById('recognitionCanvas');
        this.recognitionResult = document.getElementById('recognitionResult');
        this.confidenceScore = document.getElementById('confidenceScore');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.audioIndicator = document.getElementById('audioIndicator');

        // Video call elements
        this.roomIdInput = document.getElementById('roomId');
        this.joinRoomBtn = document.getElementById('joinRoom');
        this.leaveRoomBtn = document.getElementById('leaveRoom');
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.localCanvas = document.getElementById('localCanvas');
        this.localGesture = document.getElementById('localGesture');
        this.remoteGesture = document.getElementById('remoteGesture');
        this.roomStatus = document.getElementById('roomStatus');
        this.participantCount = document.getElementById('participantCount');

        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');

        this.setupEventListeners();
        this.loadGestureData();
    }

    setupEventListeners() {
        // Mode switching
        this.trainingModeBtn.addEventListener('click', () => this.switchMode('training'));
        this.recognitionModeBtn.addEventListener('click', () => this.switchMode('recognition'));
        this.videoCallModeBtn.addEventListener('click', () => this.switchMode('videoCall'));

        // Training controls
        this.startTrainingBtn.addEventListener('click', () => this.startTraining());
        this.stopTrainingBtn.addEventListener('click', () => this.stopTraining());

        // Recognition controls
        this.startRecognitionBtn.addEventListener('click', () => this.startRecognition());
        this.stopRecognitionBtn.addEventListener('click', () => this.stopRecognition());
        this.testAudioBtn.addEventListener('click', () => this.speakGesture('Test audio working'));

        // Video call controls
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('user-joined', (userId) => {
            console.log('User joined:', userId);
            this.createPeerConnection();
        });

        this.socket.on('user-left', (userId) => {
            console.log('User left:', userId);
            this.cleanupPeerConnection();
        });

        this.socket.on('offer', (data) => {
            this.handleOffer(data.offer, data.from);
        });

        this.socket.on('answer', (data) => {
            this.handleAnswer(data.answer, data.from);
        });

        this.socket.on('ice-candidate', (data) => {
            this.handleIceCandidate(data.candidate, data.from);
        });

        this.socket.on('gesture-detected', (data) => {
            this.displayRemoteGesture(data.gesture);
        });
    }

    async loadModels() {
        try {
            this.loadingOverlay.style.display = 'flex';
            
            // Load TensorFlow.js backend
            await tf.setBackend('webgl');
            await tf.ready();
            
            // Load HandPose model
            this.handpose = await handpose.load();
            
            console.log('Models loaded successfully');
            this.loadingOverlay.style.display = 'none';
        } catch (error) {
            console.error('Error loading models:', error);
            alert('Failed to load models. Please refresh the page.');
        }
    }

    switchMode(mode) {
        // Update button states
        [this.trainingModeBtn, this.recognitionModeBtn, this.videoCallModeBtn].forEach(btn => {
            btn.classList.remove('active');
        });

        // Hide all sections
        [this.trainingSection, this.recognitionSection, this.videoCallSection].forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section and activate button
        switch (mode) {
            case 'training':
                this.trainingSection.classList.add('active');
                this.trainingModeBtn.classList.add('active');
                this.initializeCamera(this.trainingVideo);
                break;
            case 'recognition':
                this.recognitionSection.classList.add('active');
                this.recognitionModeBtn.classList.add('active');
                this.initializeCamera(this.recognitionVideo);
                break;
            case 'videoCall':
                this.videoCallSection.classList.add('active');
                this.videoCallModeBtn.classList.add('active');
                this.initializeCamera(this.localVideo);
                break;
        }
    }

    async initializeCamera(videoElement) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            
            videoElement.srcObject = stream;
            this.localStream = stream;
            
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play();
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Failed to access camera. Please check permissions.');
        }
    }

    async startTraining() {
        const gestureName = this.gestureNameInput.value.trim();
        if (!gestureName) {
            alert('Please enter a gesture name');
            return;
        }

        this.currentGesture = gestureName;
        this.isTraining = true;
        this.sampleCount = 0;
        
        this.startTrainingBtn.disabled = true;
        this.stopTrainingBtn.disabled = false;
        this.trainingStatusSpan.textContent = 'Training in progress...';
        
        this.trainingLoop();
    }

    stopTraining() {
        this.isTraining = false;
        this.startTrainingBtn.disabled = false;
        this.stopTrainingBtn.disabled = true;
        this.trainingStatusSpan.textContent = `Training completed. ${this.sampleCount} samples collected.`;
    }

    async trainingLoop() {
        if (!this.isTraining) return;

        try {
            const predictions = await this.handpose.estimateHands(this.trainingVideo);
            
            if (predictions.length > 0) {
                const landmarks = predictions[0].landmarks;
                this.drawLandmarks(this.trainingCanvas, landmarks);
                
                // Save sample every 10 frames
                if (this.sampleCount % 10 === 0) {
                    await this.saveGestureSample(this.currentGesture, landmarks);
                }
                
                this.sampleCount++;
                this.sampleCountSpan.textContent = `Samples: ${this.sampleCount}`;
                this.trainingInstructions.textContent = `Training "${this.currentGesture}" - Sample ${this.sampleCount}`;
            } else {
                this.trainingInstructions.textContent = 'No hand detected. Please show your hand to the camera.';
            }
        } catch (error) {
            console.error('Error in training loop:', error);
        }

        requestAnimationFrame(() => this.trainingLoop());
    }

    async startRecognition() {
        this.isRecognizing = true;
        this.startRecognitionBtn.disabled = true;
        this.stopRecognitionBtn.disabled = false;
        this.recognitionResult.textContent = 'Starting recognition...';
        
        this.recognitionLoop();
    }

    stopRecognition() {
        this.isRecognizing = false;
        this.startRecognitionBtn.disabled = false;
        this.stopRecognitionBtn.disabled = true;
        this.recognitionResult.textContent = 'Recognition stopped';
    }

    async recognitionLoop() {
        if (!this.isRecognizing) return;

        const startTime = performance.now();

        try {
            const predictions = await this.handpose.estimateHands(this.recognitionVideo);
            
            if (predictions.length > 0) {
                const landmarks = predictions[0].landmarks;
                this.drawLandmarks(this.recognitionCanvas, landmarks);
                
                const result = this.classifyGesture(landmarks);
                
                if (result.gesture && result.confidence > 0.7) {
                    this.recognitionResult.textContent = `Detected: ${result.gesture}`;
                    this.confidenceScore.textContent = `${Math.round(result.confidence * 100)}%`;
                    
                    // Audio feedback
                    if (this.enableAudioCheckbox.checked && 
                        this.lastSpokenGesture !== result.gesture) {
                        this.speakGesture(result.gesture);
                        this.lastSpokenGesture = result.gesture;
                    }
                    
                    // Share gesture in video call
                    if (this.roomId && this.socket) {
                        this.socket.emit('gesture-detected', {
                            roomId: this.roomId,
                            gesture: result.gesture
                        });
                    }
                } else {
                    this.recognitionResult.textContent = 'No gesture detected';
                    this.confidenceScore.textContent = '0%';
                }
            } else {
                this.recognitionResult.textContent = 'No hand detected';
                this.confidenceScore.textContent = '0%';
            }
        } catch (error) {
            console.error('Error in recognition loop:', error);
        }

        // Calculate FPS
        const endTime = performance.now();
        const frameTime = endTime - startTime;
        this.fps = Math.round(1000 / frameTime);
        this.fpsCounter.textContent = this.fps;

        requestAnimationFrame(() => this.recognitionLoop());
    }

    normalizeLandmarks(landmarks) {
        // Normalize landmarks to be scale and position invariant
        const points = landmarks.map(point => ({ x: point[0], y: point[1], z: point[2] }));
        
        // Find bounding box
        let minX = Math.min(...points.map(p => p.x));
        let maxX = Math.max(...points.map(p => p.x));
        let minY = Math.min(...points.map(p => p.y));
        let maxY = Math.max(...points.map(p => p.y));
        
        const scale = Math.max(maxX - minX, maxY - minY);
        
        // Normalize to 0-1 range
        return points.map(point => ({
            x: (point.x - minX) / scale,
            y: (point.y - minY) / scale,
            z: point.z / scale
        }));
    }

    classifyGesture(landmarks) {
        const normalizedLandmarks = this.normalizeLandmarks(landmarks);
        let bestMatch = { gesture: null, confidence: 0 };
        
        for (const [gestureName, samples] of Object.entries(this.gestureData)) {
            for (const sample of samples) {
                const sampleLandmarks = this.normalizeLandmarks(sample.landmarks);
                const distance = this.calculateDistance(normalizedLandmarks, sampleLandmarks);
                const confidence = 1 / (1 + distance);
                
                if (confidence > bestMatch.confidence) {
                    bestMatch = { gesture: gestureName, confidence };
                }
            }
        }
        
        return bestMatch;
    }

    calculateDistance(landmarks1, landmarks2) {
        let totalDistance = 0;
        
        for (let i = 0; i < landmarks1.length; i++) {
            const dx = landmarks1[i].x - landmarks2[i].x;
            const dy = landmarks1[i].y - landmarks2[i].y;
            const dz = landmarks1[i].z - landmarks2[i].z;
            totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        
        return totalDistance / landmarks1.length;
    }

    drawLandmarks(canvas, landmarks) {
        const ctx = canvas.getContext('2d');
        const video = canvas.parentElement.querySelector('video');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw landmarks
        ctx.fillStyle = '#00ff00';
        landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark[0], landmark[1], 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw connections
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        // Hand connections (simplified)
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // index
            [0, 9], [9, 10], [10, 11], [11, 12], // middle
            [0, 13], [13, 14], [14, 15], [15, 16], // ring
            [0, 17], [17, 18], [18, 19], [19, 20] // pinky
        ];
        
        connections.forEach(([start, end]) => {
            ctx.beginPath();
            ctx.moveTo(landmarks[start][0], landmarks[start][1]);
            ctx.lineTo(landmarks[end][0], landmarks[end][1]);
            ctx.stroke();
        });
    }

    async saveGestureSample(gestureName, landmarks) {
        try {
            const response = await fetch('/api/gestures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gestureName: gestureName,
                    landmarks: landmarks
                })
            });
            
            if (response.ok) {
                await this.loadGestureData();
            }
        } catch (error) {
            console.error('Error saving gesture sample:', error);
        }
    }

    async loadGestureData() {
        try {
            const response = await fetch('/api/gestures');
            this.gestureData = await response.json();
            this.updateGestureList();
        } catch (error) {
            console.error('Error loading gesture data:', error);
        }
    }

    updateGestureList() {
        this.gestureList.innerHTML = '';
        
        Object.keys(this.gestureData).forEach(gestureName => {
            const gestureItem = document.createElement('div');
            gestureItem.className = 'gesture-item';
            gestureItem.innerHTML = `
                <span>${gestureName} (${this.gestureData[gestureName].length} samples)</span>
                <button class="delete-btn" onclick="app.deleteGesture('${gestureName}')">Delete</button>
            `;
            this.gestureList.appendChild(gestureItem);
        });
    }

    async deleteGesture(gestureName) {
        if (confirm(`Are you sure you want to delete "${gestureName}"?`)) {
            try {
                const response = await fetch(`/api/gestures/${gestureName}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await this.loadGestureData();
                }
            } catch (error) {
                console.error('Error deleting gesture:', error);
            }
        }
    }

    speakGesture(gesture) {
        if (this.speechSynthesis && this.enableAudioCheckbox.checked) {
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(gesture);
            utterance.rate = 0.8;
            utterance.pitch = 1.2;
            
            // Show audio indicator
            this.audioIndicator.style.display = 'block';
            
            utterance.onend = () => {
                this.audioIndicator.style.display = 'none';
            };
            
            this.speechSynthesis.speak(utterance);
        }
    }

    async joinRoom() {
        const roomId = this.roomIdInput.value.trim();
        if (!roomId) {
            alert('Please enter a room ID');
            return;
        }

        this.roomId = roomId;
        this.socket.emit('join-room', roomId);
        
        this.joinRoomBtn.disabled = true;
        this.leaveRoomBtn.disabled = false;
        this.roomStatus.textContent = `Connected to room: ${roomId}`;
    }

    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leave-room', this.roomId);
            this.roomId = null;
        }
        
        this.cleanupPeerConnection();
        
        this.joinRoomBtn.disabled = false;
        this.leaveRoomBtn.disabled = true;
        this.roomStatus.textContent = 'Not connected';
        this.participantCount.textContent = 'Participants: 0';
    }

    async createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local stream
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
            this.remoteStream = event.streams[0];
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    roomId: this.roomId,
                    candidate: event.candidate
                });
            }
        };

        // Create and send offer
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                roomId: this.roomId,
                offer: offer
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async handleOffer(offer, from) {
        if (!this.peerConnection) {
            await this.createPeerConnection();
        }

        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('answer', {
                roomId: this.roomId,
                answer: answer
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    async handleAnswer(answer, from) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate, from) {
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    cleanupPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.remoteVideo.srcObject) {
            this.remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            this.remoteVideo.srcObject = null;
        }
        
        this.remoteStream = null;
    }

    displayRemoteGesture(gesture) {
        this.remoteGesture.textContent = gesture;
    }
}

// Initialize the application when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HandGestureRecognizer();
}); 