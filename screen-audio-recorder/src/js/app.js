const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const recorder = new Recorder();
let isRecording = false;

startButton.addEventListener('click', async () => {
    if (!isRecording) {
        await recorder.startRecording();
        isRecording = true;
        updateUI(true);
    }
});

stopButton.addEventListener('click', async () => {
    if (isRecording) {
        await recorder.stopRecording();
        isRecording = false;
        updateUI(false);
        const recordedChunks = recorder.getRecordedChunks();
        // Here you can handle the recorded chunks (e.g., save or display them)
    }
});

// Update UI based on recording status
function updateUI(isRecording) {
    if (isRecording) {
        showRecordingStatus('Recording...');
    } else {
        showRecordingStatus('Stopped');
    }
}