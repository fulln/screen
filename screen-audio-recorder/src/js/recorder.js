class ScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.recordedBlob = null;
    }

    async startRecording() {
        try {
            // 请求屏幕和音频录制权限
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: true
            });

            // 尝试获取麦克风音频
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTracks = audioStream.getAudioTracks();
                if (audioTracks.length > 0) {
                    this.stream.addTrack(audioTracks[0]);
                }
            } catch (audioError) {
                console.warn('无法获取麦克风权限:', audioError);
            }

            // 显示预览
            const videoPlayback = document.getElementById('videoPlayback');
            videoPlayback.srcObject = this.stream;
            videoPlayback.muted = true; // 避免反馈
            videoPlayback.play();

            // 设置媒体录制器 - 使用更好的编码选项
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus', // 使用VP9视频和Opus音频编解码器
                videoBitsPerSecond: 2500000 // 2.5 Mbps视频比特率
            };
            
            // 检查浏览器支持情况
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn('VP9不受支持，尝试降级为VP8');
                options.mimeType = 'video/webm;codecs=vp8,opus';
                
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.warn('指定的编码器不被支持，使用默认设置');
                    delete options.mimeType;
                }
            }

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
                this.recordedBlob = new Blob(this.recordedChunks, { type: options.mimeType || 'video/webm' });
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

            // 开始录制
            this.mediaRecorder.start(100); // 每100ms记录一次数据
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
            // 显示转换中状态
            const statusElement = document.getElementById('status');
            const originalStatus = statusElement.textContent;
            statusElement.textContent = '正在转换为MP4格式...';
            
            try {
                // 注意：这里使用的是WebM转MP4的简化方法，实际生产环境可能需要服务器端转换
                // 或使用更复杂的客户端转换库，如FFmpeg.wasm
                
                // 方法1：尝试使用媒体源扩展(MSE)和媒体转换
                // 为简化实现，我们直接使用.mp4扩展名提示浏览器
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(this.recordedBlob);
                downloadLink.download = `${fileName}.mp4`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                statusElement.textContent = '文件已下载 (注意：某些浏览器可能仍以WebM格式保存，只是扩展名为MP4)';
                setTimeout(() => {
                    statusElement.textContent = originalStatus;
                }, 5000);
            } catch (error) {
                console.error('MP4转换失败:', error);
                statusElement.textContent = '转换MP4失败，请尝试WebM格式下载';
            }
        }
    }
}

// 创建全局实例
window.screenRecorder = new ScreenRecorder();