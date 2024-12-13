class WarningSystem {
    constructor() {
        this.graphicsContainer = document.querySelector('.graphics-container');
        this.speedElement = document.getElementById('speed-value');
        this.distanceElement = document.getElementById('distance-value');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.oscillator = null;
        this.maxDistance = 100; // meters
        this.warningLevels = {
            safe: { 
                color: '#00ff00', 
                beepInterval: 1000,
                video: '/videos/car-no-obstacle.mp4'
            },
            warning: { 
                color: '#ffff00', 
                beepInterval: 500,
                video: '/videos/car-medium-distance.mp4'
            },
            danger: { 
                color: '#ff0000', 
                beepInterval: 200,
                video: '/videos/car-close-obstacle.mp4'
            }
        };
        this.initializeGraphics();
        this.currentLevel = null;
    }

    initializeBeep() {
        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = 440;
        this.gainNode.gain.value = 0;
        this.oscillator.start();
    }

    initializeGraphics() {
        // Create video element
        this.sceneVideo = document.createElement('video');
        this.sceneVideo.style.width = '100%';
        this.sceneVideo.style.height = 'auto';
        this.sceneVideo.loop = true;
        this.sceneVideo.muted = true; // Mute to allow autoplay
        this.sceneVideo.playsInline = true;
        this.graphicsContainer.appendChild(this.sceneVideo);
        
        // Preload videos
        this.videoElements = {};
        Object.entries(this.warningLevels).forEach(([level, config]) => {
            const video = document.createElement('video');
            video.src = config.video;
            video.load(); // Preload the video
            this.videoElements[level] = video;
        });
    }

    updateWarning(distance, speed) {
        this.speedElement.textContent = speed.toFixed(1);
        this.distanceElement.textContent = distance.toFixed(1);

        const warningLevel = this.calculateWarningLevel(distance);
        this.updateGraphics(warningLevel, distance);
        this.updateBeep(distance);
    }

    calculateWarningLevel(distance) {
        if (distance > this.maxDistance * 0.7) return 'safe';
        if (distance > this.maxDistance * 0.3) return 'warning';
        return 'danger';
    }

    updateGraphics(level, distance) {
        // Only change video if the warning level has changed
        if (this.currentLevel !== level) {
            this.currentLevel = level;
            this.sceneVideo.src = this.warningLevels[level].video;
            this.sceneVideo.load();
            this.sceneVideo.play()
                .catch(e => console.log('Video autoplay failed:', e));
        }
        
        // Update overlay color
        const baseColor = this.warningLevels[level].color;
        const opacity = 0.3; // Reduced opacity for overlay
        this.graphicsContainer.style.backgroundColor = baseColor;
        this.graphicsContainer.style.opacity = opacity;
    }

    updateBeep(distance) {
        const level = this.calculateWarningLevel(distance);
        const intensity = 1 - (distance / this.maxDistance);
        this.gainNode.gain.value = intensity * 0.5;
        this.oscillator.frequency.value = 440 + (660 * intensity);
    }
}

// Initialize the warning system
const warningSystem = new WarningSystem();

// Handle Excel file input
document.getElementById('excel-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Initialize beep system on user interaction
        warningSystem.initializeBeep();

        // Simulate real-time updates
        let index = 0;
        const updateInterval = setInterval(() => {
            if (index >= jsonData.length) {
                clearInterval(updateInterval);
                return;
            }

            const row = jsonData[index];
            warningSystem.updateWarning(row.distance, row.speed);
            index++;
        }, 1000); // Update every second
    };

    reader.readAsArrayBuffer(file);
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/VD-PWA/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
} 