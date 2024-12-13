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
                video: '/VD-PWA/videos/car-no-obstacle.mp4'
            },
            warning: { 
                color: '#ffff00', 
                beepInterval: 500,
                video: '/VD-PWA/videos/car-medium-distance.mp4'
            },
            danger: { 
                color: '#ff0000', 
                beepInterval: 200,
                video: '/VD-PWA/videos/car-close-obstacle.mp4'
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
        if (distance === undefined || speed === undefined) {
            console.error('Invalid data:', { distance, speed });
            return;
        }
        
        this.speedElement.textContent = Number(distance).toFixed(1);
        this.distanceElement.textContent = Number(speed).toFixed(1);

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
            
            this.sceneVideo.onerror = (e) => {
                console.error('Video error:', e);
            };
            
            this.sceneVideo.onloadeddata = () => {
                console.log('Video loaded successfully');
            };
            
            this.sceneVideo.play()
                .then(() => console.log('Video playing'))
                .catch(e => console.log('Video autoplay failed:', e));
        }
        
        // Update overlay color
        const baseColor = this.warningLevels[level].color;
        const opacity = 0.6;  // Increased opacity
        
        // Apply color to both body and container
        document.body.style.backgroundColor = baseColor;
        document.body.style.transition = 'background-color 0.3s ease';
        
        // Apply overlay with gradient
        this.graphicsContainer.style.background = `linear-gradient(
            rgba(${this.hexToRgb(baseColor)}, ${opacity}),
            rgba(${this.hexToRgb(baseColor)}, ${opacity})
        )`;
        
        // Ensure the overlay covers everything
        this.graphicsContainer.style.position = 'fixed';
        this.graphicsContainer.style.top = '0';
        this.graphicsContainer.style.left = '0';
        this.graphicsContainer.style.width = '100vw';
        this.graphicsContainer.style.height = '100vh';
        this.graphicsContainer.style.zIndex = '2';
    }

    updateBeep(distance) {
        const level = this.calculateWarningLevel(distance);
        const intensity = 1 - (distance / this.maxDistance);
        this.gainNode.gain.value = intensity * 0.5;
        this.oscillator.frequency.value = 440 + (660 * intensity);
    }

    // Add this helper method to convert hex colors to RGB
    hexToRgb(hex) {
        // Remove the # if present
        hex = hex.replace('#', '');
        
        // Convert to RGB values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `${r}, ${g}, ${b}`;
    }
}

// Initialize the warning system
const warningSystem = new WarningSystem();

// Add console logs for debugging
document.getElementById('excel-input').addEventListener('change', (event) => {
    console.log('File selected:', event.target.files[0].name); // Log file name
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        console.log('File loaded, result type:', typeof e.target.result);
        try {
            const data = new Uint8Array(e.target.result);
            console.log('Data converted to Uint8Array, length:', data.length);
            
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Workbook sheets:', workbook.SheetNames);
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            console.log('First sheet:', firstSheet);
            
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            console.log('Parsed data:', jsonData);
            
            // Validate data
            jsonData.forEach((row, index) => {
                if (typeof row.distance !== 'number' || typeof row.speed !== 'number') {
                    throw new Error(`Invalid data at row ${index + 1}. Both distance and speed must be numbers.`);
                }
            });

            if (jsonData.length === 0) {
                throw new Error('No data found in Excel file');
            }

            // Initialize beep system on user interaction
            warningSystem.initializeBeep();

            // Simulate real-time updates
            let index = 0;
            const updateInterval = setInterval(() => {
                if (index >= jsonData.length) {
                    clearInterval(updateInterval);
                    console.log('Simulation complete');
                    return;
                }

                const row = jsonData[index];
                console.log('Processing row:', row);
                warningSystem.updateWarning(row.distance, row.speed);
                index++;
            }, 1000);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
        }
    };

    reader.onerror = function(e) {
        console.error('Error reading file:', e);
        alert('Error reading file');
    };

    try {
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error starting file read:', error);
        alert('Error starting file read');
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/VD-PWA/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
} 