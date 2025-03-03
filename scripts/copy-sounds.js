const fs = require('fs');
const path = require('path');

// Create the raw directory if it doesn't exist
const rawDir = path.join(__dirname, '../android/app/src/main/res/raw');
if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
}

// Copy sound files
const soundFiles = ['notif1.wav', 'notif2.wav'];
soundFiles.forEach(file => {
    const source = path.join(__dirname, '../assets/sounds', file);
    const destination = path.join(rawDir, file);
    
    try {
        fs.copyFileSync(source, destination);
        console.log(`Successfully copied ${file} to Android resources`);
    } catch (error) {
        console.error(`Error copying ${file}:`, error);
    }
}); 