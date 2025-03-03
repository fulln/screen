document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const statusElement = document.getElementById('status');
    
    recordButton.addEventListener('click', async () => {
        if (!window.screenRecorder.isCurrentlyRecording()) {
            // 开始录制
            recordButton.disabled = true;
            statusElement.textContent = '正在请求权限...';
            
            const started = await window.screenRecorder.startRecording();
            
            if (started) {
                recordButton.innerHTML = '<i class="fas fa-stop-circle"></i> 停止录制';
                recordButton.classList.add('recording');
                statusElement.textContent = '正在录制...';
            }
            
            recordButton.disabled = false;
        } else {
            // 停止录制
            window.screenRecorder.stopRecording();
            recordButton.innerHTML = '<i class="fas fa-record-vinyl"></i> 开始录制';
            recordButton.classList.remove('recording');
            statusElement.textContent = '录制已完成';
        }
    });
});
