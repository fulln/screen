class ScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.recordedBlob = null;
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    async startRecording() {
        try {
            // 检查浏览器是否支持MediaRecorder API
            if (!window.MediaRecorder) {
                throw new Error('您的浏览器不支持屏幕录制功能。请尝试使用最新版本的Chrome、Firefox或Safari 14.1+');
            }

            // 请求屏幕和音频录制权限
            const displayMediaOptions = {
                video: { 
                    mediaSource: 'screen',
                    // Safari更适合使用较低的帧率以确保稳定性
                    frameRate: this.isSafari ? 30 : 60
                },
                audio: this.isSafari ? false : true // Safari可能在getDisplayMedia中不支持音频
            };
            
            this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

            // 对于Safari，单独请求音频流
            if (this.isSafari) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTracks = audioStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        this.stream.addTrack(audioTracks[0]);
                    }
                } catch (audioError) {
                    console.warn('无法获取麦克风权限:', audioError);
                }
            } else {
                // 非Safari浏览器，尝试获取麦克风音频
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTracks = audioStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        this.stream.addTrack(audioTracks[0]);
                    }
                } catch (audioError) {
                    console.warn('无法获取麦克风权限:', audioError);
                }
            }

            // 显示预览
            const videoPlayback = document.getElementById('videoPlayback');
            videoPlayback.srcObject = this.stream;
            videoPlayback.muted = true; // 避免反馈
            videoPlayback.play();

            // 设置媒体录制器 - 根据浏览器选择合适的编码选项
            let options = {};
            
            // Safari优先使用H.264编码器
            if (this.isSafari) {
                // Safari 14.1+支持MediaRecorder，但编码器支持有限
                if (MediaRecorder.isTypeSupported('video/mp4')) {
                    options.mimeType = 'video/mp4';
                } else if (MediaRecorder.isTypeSupported('video/webm')) {
                    options.mimeType = 'video/webm';
                }
                // Safari的比特率通常需要较低以确保稳定性
                options.videoBitsPerSecond = 1500000; // 1.5 Mbps
            } else {
                // 非Safari浏览器优先使用VP9
                if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                    options.mimeType = 'video/webm;codecs=vp9,opus';
                    options.videoBitsPerSecond = 2500000; // 2.5 Mbps
                } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                    options.mimeType = 'video/webm;codecs=vp8,opus';
                    options.videoBitsPerSecond = 2500000;
                } else if (MediaRecorder.isTypeSupported('video/webm')) {
                    options.mimeType = 'video/webm';
                    options.videoBitsPerSecond = 2500000;
                }
            }
            
            console.log('使用录制选项:', options);

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = [];

            // 处理录制的数据
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            // 录制完成后的处理
            this.mediaRecorder.onstop = () => {
                const mimeType = options.mimeType || (this.isSafari ? 'video/mp4' : 'video/webm');
                this.recordedBlob = new Blob(this.recordedChunks, { type: mimeType });
                const url = URL.createObjectURL(this.recordedBlob);
                videoPlayback.srcObject = null;
                videoPlayback.src = url;
                videoPlayback.muted = false;

                // 监听流的结束
                const tracks = this.stream.getTracks();
                tracks.forEach(track => track.stop());
                this.stream = null;
                
                // 显示下载按钮
                this.showDownloadOptions();
            };

            // 开始录制 - Safari通常需要更长的间隔
            this.mediaRecorder.start(this.isSafari ? 200 : 100);
            this.isRecording = true;
            
            return true;
        } catch (error) {
            console.error('录制失败:', error);
            alert('无法启动录制: ' + error.message);
            return false;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            return true;
        }
        return false;
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }
    
    showDownloadOptions() {
        // 检查是否存在下载区域，如果不存在就创建
        let downloadArea = document.getElementById('downloadArea');
        if (!downloadArea) {
            downloadArea = document.createElement('div');
            downloadArea.id = 'downloadArea';
            downloadArea.className = 'download-area';
            document.getElementById('app').appendChild(downloadArea);
        } else {
            downloadArea.innerHTML = ''; // 清空之前的内容
        }
        
        // 创建下载按钮
        if (this.isSafari) {
            // Safari用户只显示一个下载按钮
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载录制文件';
            downloadBtn.className = 'download-btn';
            downloadBtn.onclick = () => this.downloadRecording(this.isSafari ? 'mp4' : 'webm');
            downloadArea.appendChild(downloadBtn);
        } else {
            // 非Safari用户显示两种格式选项
            const downloadWebM = document.createElement('button');
            downloadWebM.innerHTML = '<i class="fas fa-download"></i> 下载 WebM 格式';
            downloadWebM.className = 'download-btn';
            downloadWebM.onclick = () => this.downloadRecording('webm');
            
            const downloadMP4 = document.createElement('button');
            downloadMP4.innerHTML = '<i class="fas fa-download"></i> 下载 MP4 格式';
            downloadMP4.className = 'download-btn';
            downloadMP4.onclick = () => this.downloadRecording('mp4');
            
            // 添加按钮到下载区域
            downloadArea.appendChild(downloadWebM);
            downloadArea.appendChild(downloadMP4);
        }
        
        // 显示文件大小信息
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-info';
        const fileSizeMB = (this.recordedBlob.size / (1024 * 1024)).toFixed(2);
        sizeInfo.textContent = `录制文件大小: ${fileSizeMB} MB`;
        downloadArea.appendChild(sizeInfo);
    }
    
    async downloadRecording(format) {
        if (!this.recordedBlob) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `screen-recording-${timestamp}`;
        
        if (format === 'webm') {
            // 直接下载WebM格式
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(this.recordedBlob);
            downloadLink.download = `${fileName}.webm`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } else if (format === 'mp4') {
            // 显示状态
            const statusElement = document.getElementById('status');
            const originalStatus = statusElement.textContent;
            
            // 对于Safari，直接下载；对于其他浏览器，解释可能的兼容性问题
            if (this.isSafari) {
                statusElement.textContent = '正在下载...';
            } else {
                statusElement.textContent = '正在准备MP4格式...';
            }
            
            try {
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(this.recordedBlob);
                downloadLink.download = `${fileName}.mp4`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                if (!this.isSafari) {
                    statusElement.textContent = '文件已下载 (注意：某些浏览器可能仍以WebM格式保存，只是扩展名为MP4)';
                    setTimeout(() => {
                        statusElement.textContent = originalStatus;
                    }, 5000);
                } else {
                    setTimeout(() => {
                        statusElement.textContent = originalStatus;
                    }, 2000);
                }
            } catch (error) {
                console.error('下载失败:', error);
                statusElement.textContent = '下载失败，请重试';
            }
        }
    }
}

// 创建全局实例
window.screenRecorder = new ScreenRecorder();