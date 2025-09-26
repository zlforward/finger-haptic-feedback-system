// 相机视图组件 - 集成手部追踪和物体检测
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { useAppStore } from '../../stores/useAppStore';
import { YOLO11Detector } from '../../utils/yolo11Detector';
import type { HandLandmarks, DetectionResult, Point2D } from '../../types';

interface CameraViewProps {
  width?: number;
  height?: number;
  onFingerPosition?: (position: Point2D | null) => void;
  onDetections?: (detections: DetectionResult[]) => void;
  showDebugInfo?: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({
  width = 640,
  height = 480,
  onFingerPosition,
  onDetections,
  showDebugInfo = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [fingerPosition, setFingerPosition] = useState<Point2D | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const detectorRef = useRef<YOLO11Detector | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  const { config, actions } = useAppStore();

  // 初始化MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(handleHandResults);
      handsRef.current = hands;
      
      console.log('MediaPipe Hands 初始化成功');
    } catch (error) {
      console.error('MediaPipe Hands 初始化失败:', error);
      setError('手部追踪初始化失败');
    }
  }, []);

  // 初始化YOLO11检测器
  const initializeDetector = useCallback(async () => {
    try {
      const detector = new YOLO11Detector(config.yolo);
      const success = await detector.initialize();
      
      if (success) {
        detectorRef.current = detector;
        console.log('YOLO11检测器初始化成功');
        setError(null); // 清除之前的错误
      } else {
        console.warn('YOLO11检测器初始化失败，物体检测功能将被禁用');
        // 不设置错误状态，允许系统继续运行
        detectorRef.current = null;
      }
    } catch (error) {
      console.error('YOLO11检测器初始化失败:', error);
      console.log('系统将在没有物体检测功能的情况下继续运行');
      detectorRef.current = null;
      // 不设置错误状态，允许系统继续运行
    }
  }, [config.yolo]);

  // 初始化相机
  const initializeCamera = useCallback(async () => {
    console.log('🎥 开始初始化相机...');
    console.log('📋 当前参数:', { width, height, currentCameraId, facingMode });
    
    if (!videoRef.current || !handsRef.current) {
      console.error('❌ 相机初始化失败: 缺少必要的引用');
      console.log('📊 引用状态:', { 
        videoRef: !!videoRef.current, 
        handsRef: !!handsRef.current 
      });
      return;
    }

    try {
      console.log('🔍 检查浏览器支持...');
      // 首先检查浏览器是否支持getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持相机访问功能');
      }
      console.log('✅ 浏览器支持相机访问');

      // 检查相机权限
      console.log('🔐 检查相机权限...');
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('📋 权限状态:', permissionStatus.state);
        if (permissionStatus.state === 'denied') {
          throw new Error('相机权限被拒绝，请在浏览器设置中允许相机访问');
        }
        console.log('✅ 相机权限检查通过');
      } catch (permError) {
        console.warn('⚠️ 无法查询相机权限状态:', permError);
      }

      // 获取可用的相机设备
      console.log('📱 枚举相机设备...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📊 设备枚举结果:', {
        totalDevices: devices.length,
        videoDevices: videoDevices.length,
        allDevices: devices.map(d => ({ kind: d.kind, label: d.label, id: d.deviceId.substring(0, 8) + '...' }))
      });
      
      if (videoDevices.length === 0) {
        throw new Error('未检测到可用的相机设备');
      }

      console.log(`✅ 检测到 ${videoDevices.length} 个相机设备:`, videoDevices.map(d => ({ id: d.deviceId.substring(0, 8) + '...', label: d.label })));
      setAvailableCameras(videoDevices);
      
      // 如果没有指定相机ID，选择默认相机
      let selectedDeviceId = currentCameraId;
      console.log('🎯 选择相机设备...');
      console.log('📋 当前指定设备ID:', currentCameraId ? currentCameraId.substring(0, 8) + '...' : 'null');
      
      if (!selectedDeviceId && videoDevices.length > 0) {
        // 优先选择后置摄像头（移动设备）
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        selectedDeviceId = backCamera?.deviceId || videoDevices[0].deviceId;
        console.log('🔄 自动选择设备:', {
          backCameraFound: !!backCamera,
          selectedLabel: backCamera?.label || videoDevices[0].label,
          selectedId: selectedDeviceId.substring(0, 8) + '...'
        });
      }
      
      setCurrentCameraId(selectedDeviceId);

      // 尝试不同的相机配置
      console.log('⚙️ 准备相机配置...');
      const cameraConfigs = [];
      
      // 如果有指定的设备ID，优先使用
      if (selectedDeviceId) {
        cameraConfigs.push({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: 30 }
          }
        });
        console.log('📋 添加精确设备ID配置');
      }
      
      // 备选配置：使用facingMode
      cameraConfigs.push(
        // 首选后置摄像头（移动设备）
        {
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: { ideal: facingMode },
            frameRate: { ideal: 30 }
          }
        },
        // 基础配置（兼容性最好）
        {
          video: {
            width: width,
            height: height
          }
        }
      );
      
      console.log(`📋 准备了 ${cameraConfigs.length} 个配置方案`);

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // 尝试不同的配置直到成功
      console.log('🔄 开始尝试相机配置...');
      for (let i = 0; i < cameraConfigs.length; i++) {
        const config = cameraConfigs[i];
        try {
          console.log(`🎯 尝试相机配置 ${i + 1}/${cameraConfigs.length}:`);
          console.log('📋 配置详情:', JSON.stringify(config, null, 2));
          
          // 添加延迟以避免设备冲突
          if (i > 0) {
            console.log('⏳ 等待1秒避免设备冲突...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          console.log('📞 调用 getUserMedia...');
          const startTime = performance.now();
          stream = await navigator.mediaDevices.getUserMedia(config);
          const endTime = performance.now();
          
          console.log(`✅ 相机配置成功! 耗时: ${Math.round(endTime - startTime)}ms`);
          console.log('📊 获取到的流信息:', {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map(track => ({
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState,
              settings: track.getSettings()
            }))
          });
          break;
        } catch (err) {
          lastError = err as Error;
          console.error(`❌ 相机配置 ${i + 1} 失败:`, {
            name: lastError.name,
            message: lastError.message,
            stack: lastError.stack?.split('\n').slice(0, 3)
          });
          
          // 如果是设备占用错误，尝试释放可能的资源
          if (err instanceof Error && (
            err.name === 'NotReadableError' || 
            err.message.includes('Device in use') ||
            err.message.includes('device is already in use')
          )) {
            console.log('🔧 检测到设备占用，尝试释放资源...');
            
            // 尝试停止所有现有的媒体轨道
            try {
              console.log('🧹 尝试清理现有资源...');
              const existingStreams = await navigator.mediaDevices.getUserMedia({ video: true });
              existingStreams.getTracks().forEach(track => {
                track.stop();
                console.log('🗑️ 释放现有相机轨道:', track.label);
              });
              console.log('⏳ 等待2秒让资源完全释放...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // 等待资源释放
            } catch (cleanupError) {
              console.warn('⚠️ 清理现有资源失败:', cleanupError);
            }
          }
          
          continue;
        }
      }

      if (!stream) {
        console.error('❌ 所有相机配置都失败了');
        // 提供更详细的错误信息
        let errorMessage = '无法访问相机设备';
        let solution = '';
        
        if (lastError) {
          const errorMsg = lastError.message.toLowerCase();
          const errorName = lastError.name;
          
          console.log('📋 最后的错误详情:', { name: errorName, message: lastError.message });
          
          if (errorName === 'NotReadableError' || errorMsg.includes('device in use')) {
            errorMessage = '相机设备被其他应用占用';
            solution = '请关闭所有正在使用相机的应用程序（如视频会议软件、其他浏览器标签页等），然后点击重试';
          } else if (errorName === 'NotAllowedError' || errorMsg.includes('permission')) {
            errorMessage = '相机权限被拒绝';
            solution = '请点击地址栏的相机图标，选择"始终允许"，然后刷新页面';
          } else if (errorName === 'NotFoundError' || errorMsg.includes('not found')) {
            errorMessage = '未找到相机设备';
            solution = '请确保您的设备连接了摄像头，并检查设备管理器中的相机状态';
          } else if (errorMsg.includes('not supported')) {
            errorMessage = '浏览器不支持相机功能';
            solution = '请使用Chrome、Firefox、Safari或Edge等现代浏览器';
          } else {
            errorMessage = `相机访问失败: ${lastError.message}`;
            solution = '请检查相机权限设置，确保没有其他应用占用相机';
          }
        }
        
        throw new Error(`${errorMessage}。${solution}`);
      }

      // 检查流是否有效
      console.log('🔍 验证相机流...');
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.error('❌ 相机流无效，未找到视频轨道');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('相机流无效，未找到视频轨道');
      }

      const videoTrack = videoTracks[0];
      console.log('✅ 相机流验证成功');
      console.log('📊 相机设备详细信息:', {
        label: videoTrack.label,
        settings: videoTrack.getSettings(),
        capabilities: videoTrack.getCapabilities ? videoTrack.getCapabilities() : 'N/A'
      });

      // 设置视频元素
      console.log('📺 设置视频元素...');
      videoRef.current.srcObject = stream;
      
      // 等待视频元素准备就绪
      console.log('⏳ 等待视频加载...');
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        
        const handleLoadedData = () => {
          console.log('✅ 视频数据加载完成');
          console.log('📊 视频元素状态:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime
          });
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (event: Event) => {
          console.error('❌ 视频加载失败:', event);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
          reject(new Error('视频加载失败'));
        };
        
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('error', handleError);
        
        // 设置超时
        setTimeout(() => {
          console.error('⏰ 视频加载超时');
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
          reject(new Error('视频加载超时'));
        }, 15000); // 增加超时时间
      });

      // 创建MediaPipe相机实例
      console.log('🤖 创建MediaPipe相机实例...');
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width,
        height
      });

      console.log('🚀 启动MediaPipe相机...');
      await camera.start();
      cameraRef.current = camera;

      // 保存流引用以便后续清理
      (cameraRef.current as any).stream = stream;
      
      actions.updatePerformanceMetrics({ 
        frameRate: 30 // 初始帧率
      });
      
      console.log('🎉 相机初始化完全成功!');
      console.log('📊 最终状态:', {
        initialized: true,
        streamActive: stream.active,
        videoReady: videoRef.current.readyState >= 2,
        cameraStarted: !!cameraRef.current
      });
      
      setIsInitialized(true);
      setError(null); // 清除之前的错误
      
    } catch (error) {
      console.error('💥 相机初始化失败:', error);
      console.log('📊 失败时的状态:', {
        videoRef: !!videoRef.current,
        handsRef: !!handsRef.current,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5)
        } : error
      });
      setError(error instanceof Error ? error.message : '相机访问失败，请检查设备和权限设置');
    }
  }, [width, height, actions, currentCameraId, facingMode]);

  // 处理手部追踪结果
  const handleHandResults = useCallback(async (results: Results) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const overlayCtx = overlayCanvas.getContext('2d')!;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // 绘制视频帧
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    let currentFingerPosition: Point2D | null = null;

    // 处理手部关键点
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness?.[0]?.label || 'Right';

      // 绘制手部连接线
      drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });

      // 绘制关键点
      drawLandmarks(overlayCtx, landmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 3
      });

      // 获取食指指尖位置（索引8）
      const indexTip = landmarks[8];
      if (indexTip) {
        currentFingerPosition = {
          x: indexTip.x * canvas.width,
          y: indexTip.y * canvas.height
        };

        // 绘制指尖位置
        overlayCtx.beginPath();
        overlayCtx.arc(currentFingerPosition.x, currentFingerPosition.y, 8, 0, 2 * Math.PI);
        overlayCtx.fillStyle = '#FF0000';
        overlayCtx.fill();
        overlayCtx.strokeStyle = '#FFFFFF';
        overlayCtx.lineWidth = 2;
        overlayCtx.stroke();
      }

      // 更新手部追踪数据
      const handLandmarks: HandLandmarks = {
        landmarks: landmarks.map(landmark => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0
        })),
        handedness: handedness as 'Left' | 'Right',
        confidence: results.multiHandedness?.[0]?.score || 0,
        timestamp: Date.now()
      };

      actions.updateHandLandmarks(handLandmarks);
    } else {
      actions.updateHandLandmarks(null);
    }

    // 更新指尖位置
    setFingerPosition(currentFingerPosition);
    onFingerPosition?.(currentFingerPosition);

    // 运行物体检测（每隔几帧运行一次以提高性能）
    if (frameCountRef.current % 3 === 0 && detectorRef.current && detectorRef.current.initialized) {
      await runObjectDetection(ctx);
    }

    // 绘制检测结果
    drawDetections(overlayCtx);

    // 更新FPS
    updateFPS();

    frameCountRef.current++;
  }, [actions, onFingerPosition]);

  // 运行物体检测
  const runObjectDetection = useCallback(async (ctx: CanvasRenderingContext2D) => {
    if (!detectorRef.current) return;

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const newDetections = await detectorRef.current.detect(imageData);
      
      setDetections(newDetections);
      actions.updateDetections(newDetections);
      onDetections?.(newDetections);
    } catch (error) {
      console.error('物体检测失败:', error);
    }
  }, [width, height, actions, onDetections]);

  // 绘制检测结果
  const drawDetections = useCallback((ctx: CanvasRenderingContext2D) => {
    detections.forEach(detection => {
      const { bbox, class: className, confidence } = detection;
      
      // 绘制边界框
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      
      // 绘制标签背景
      const label = `${className} ${(confidence * 100).toFixed(1)}%`;
      ctx.font = '14px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.fillRect(bbox.x, bbox.y - textHeight, textWidth + 8, textHeight);
      
      // 绘制标签文字
      ctx.fillStyle = '#000000';
      ctx.fillText(label, bbox.x + 4, bbox.y - 6);
      
      // 绘制中心点
      ctx.beginPath();
      ctx.arc(detection.center.x, detection.center.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
    });
  }, [detections]);

  // 更新FPS
  const updateFPS = useCallback(() => {
    const now = performance.now();
    if (lastFrameTimeRef.current) {
      const delta = now - lastFrameTimeRef.current;
      const currentFps = Math.round(1000 / delta);
      setFps(currentFps);
      
      actions.updatePerformanceMetrics({ frameRate: currentFps });
    }
    lastFrameTimeRef.current = now;
  }, [actions]);

  // 强制释放所有相机资源
  const forceReleaseCamera = useCallback(async () => {
    try {
      // 停止当前相机实例
      if (cameraRef.current) {
        cameraRef.current.stop();
        
        // 释放媒体流
        const stream = (cameraRef.current as any).stream as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('释放相机轨道:', track.label);
          });
        }
        cameraRef.current = null;
      }
      
      // 清理视频元素
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // 强制重新加载视频元素
      }
      
      // 尝试获取并立即释放所有可用的相机设备
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        for (const device of videoDevices) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: device.deviceId }
            });
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('强制释放设备:', device.label || device.deviceId);
            });
          } catch (error) {
            // 忽略单个设备的错误
          }
        }
      } catch (error) {
        console.warn('枚举设备失败:', error);
      }
      
      // 等待资源完全释放
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('所有相机资源已强制释放');
    } catch (error) {
      console.error('强制释放相机资源失败:', error);
    }
  }, []);

  // 组件初始化
  useEffect(() => {
    const initialize = async () => {
      // 首先强制释放所有相机资源
      await forceReleaseCamera();
      
      await initializeHands();
      await initializeDetector();
      await initializeCamera();
    };

    initialize();

    // 清理函数
    return () => {
      // 停止相机
      if (cameraRef.current) {
        cameraRef.current.stop();
        
        // 释放媒体流
        const stream = (cameraRef.current as any).stream as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('释放相机轨道:', track.label);
          });
        }
      }
      
      // 清理视频元素
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // 释放检测器
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      
      console.log('相机资源已释放');
    };
  }, [initializeHands, initializeDetector, initializeCamera, forceReleaseCamera]);

  // 重试相机初始化
  const handleRetryCamera = useCallback(async () => {
    setError(null);
    setIsInitialized(false);
    
    // 强制释放所有相机资源
    await forceReleaseCamera();
    
    // 重新初始化
    await initializeCamera();
  }, [initializeCamera, forceReleaseCamera]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-600 text-xl font-semibold mb-3">📷 相机访问失败</div>
          <div className="text-red-700 text-sm mb-4 leading-relaxed">{error}</div>
          
          <div className="space-y-3">
            <button 
              onClick={handleRetryCamera}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 重试相机访问
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              🔃 重新加载页面
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <div className="text-blue-800 font-medium mb-2">💡 常见解决方案：</div>
            <ul className="text-blue-700 text-xs space-y-1 list-disc list-inside">
              <li>检查浏览器地址栏是否有相机权限提示</li>
              <li>确保没有其他应用正在使用相机</li>
              <li>尝试刷新页面或重启浏览器</li>
              <li>检查系统相机权限设置</li>
              <li>使用Chrome、Firefox等现代浏览器</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* 视频元素（隐藏） */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        autoPlay
        muted
        playsInline
      />
      
      {/* 主画布 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* 覆盖层画布 */}
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      
      {/* 状态显示 */}
      {showDebugInfo && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm font-mono">
          <div>FPS: {fps}</div>
          <div>检测物体: {detections.length}</div>
          <div>指尖位置: {fingerPosition ? `(${Math.round(fingerPosition.x)}, ${Math.round(fingerPosition.y)})` : '未检测到'}</div>
          <div>状态: {isInitialized ? '运行中' : '初始化中...'}</div>
        </div>
      )}
      
      {/* 加载指示器 */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-lg font-semibold">正在初始化相机和AI模型...</div>
            <div className="text-sm text-gray-300 mt-2">首次加载可能需要较长时间</div>
          </div>
        </div>
      )}
      
      {/* 性能指标 */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          fps > 25 ? 'bg-green-500' : fps > 15 ? 'bg-yellow-500' : 'bg-red-500'
        }`} title={`帧率: ${fps} FPS`}></div>
        <div className={`w-3 h-3 rounded-full ${
          detections.length > 0 ? 'bg-blue-500' : 'bg-gray-500'
        }`} title={`检测到 ${detections.length} 个物体`}></div>
        <div className={`w-3 h-3 rounded-full ${
          fingerPosition ? 'bg-purple-500' : 'bg-gray-500'
        }`} title={fingerPosition ? '手部追踪正常' : '未检测到手部'}></div>
      </div>
    </div>
  );
};

export default CameraView;