// 指套触感反馈系统 - 主应用组件
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { createHapticController, HapticProfiles } from './utils/hapticController';
import CameraView from './components/camera/CameraView';
import Scene3D from './components/ar/Scene3D';
import TouchStatsPanel from './components/ui/TouchStatsPanel';
import type { Point2D, Point3D, DetectionResult, CollisionEvent, Virtual3DObject } from './types';

// AR叠加视图组件
const AROverlayView: React.FC<{
  fingerPosition2D: Point2D | null;
  fingerPosition3D: Point3D | null;
  detections: DetectionResult[];
  onFingerPosition2D: (position: Point2D | null) => void;
  onDetections: (detections: DetectionResult[]) => void;
  onCollision: (event: CollisionEvent) => void;
}> = ({ 
  fingerPosition2D, 
  fingerPosition3D, 
  detections, 
  onFingerPosition2D, 
  onDetections, 
  onCollision 
}) => {
  const { interactionMode, system } = useAppStore();
  
  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
      {/* 相机背景层 */}
      <div className="absolute inset-0 z-10">
        <CameraView
          width={640}
          height={480}
          onFingerPosition={onFingerPosition2D}
          onDetections={onDetections}
          showDebugInfo={false}
        />
      </div>
      
      {/* 3D物体叠加层 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <Scene3D
          fingerPosition={fingerPosition3D}
          fingerPosition2D={fingerPosition2D}
          onCollision={onCollision}
          showGrid={false}
          enableControls={false}
          transparent={true}
          enableAR={true}
        />
      </div>
      
      {/* AR控制面板 - 现代化设计 */}
      <div className="absolute top-4 right-4 z-30 bg-gradient-to-br from-black/80 to-gray-900/80 backdrop-blur-md text-white p-4 rounded-xl border border-gray-600/50 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold">AR 实时模式</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-gray-300">检测物体</div>
              <div className="text-lg font-bold text-blue-400">{detections.length}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-gray-300">帧率</div>
              <div className="text-lg font-bold text-green-400">{system.performanceMetrics.frameRate}</div>
            </div>
          </div>
          
          {fingerPosition3D && (
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-2 border border-purple-400/30">
              <div className="text-xs text-gray-300 mb-1">指尖位置</div>
              <div className="text-xs font-mono text-purple-300">
                X: {fingerPosition3D.x.toFixed(2)}<br/>
                Y: {fingerPosition3D.y.toFixed(2)}<br/>
                Z: {fingerPosition3D.z.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 底部状态栏 */}
      <div className="absolute bottom-4 left-4 right-4 z-30 bg-gradient-to-r from-black/70 to-gray-900/70 backdrop-blur-md rounded-xl p-3 border border-gray-600/50">
        <div className="flex items-center justify-between text-sm text-white">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${fingerPosition2D ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span>手部追踪</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${detections.length > 0 ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span>物体检测</span>
            </div>
          </div>
          <div className="text-gray-300">
            模式: <span className="text-purple-400 font-semibold">{interactionMode.type.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      {/* 指尖位置指示器 - 增强版 */}
      {fingerPosition2D && (
        <div 
          className="absolute z-40 w-6 h-6 pointer-events-none"
          style={{
            left: `${(fingerPosition2D.x / 640) * 100}%`,
            top: `${(fingerPosition2D.y / 480) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="absolute inset-0 border-2 border-red-400 rounded-full animate-ping opacity-75"></div>
          <div className="absolute inset-1 bg-red-500 rounded-full shadow-lg"></div>
          <div className="absolute inset-2 bg-white rounded-full opacity-80"></div>
        </div>
      )}
    </div>
  );
};

// 主页面组件
const HomePage: React.FC = () => {
  const [fingerPosition2D, setFingerPosition2D] = useState<Point2D | null>(null);
  const [fingerPosition3D, setFingerPosition3D] = useState<Point3D | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [hapticController] = useState(() => createHapticController());
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [viewMode, setViewMode] = useState<'ar' | 'split'>('ar');
  
  const { 
    system, 
    device, 
    interactionMode, 
    virtual3DObjects,
    actions 
  } = useAppStore();

  // 初始化系统
  useEffect(() => {
    const initializeSystem = async () => {
      await actions.initializeSystem();
      
      // 检查是否已经有默认物体，避免重复添加
      if (virtual3DObjects.length === 0) {
        // 添加默认3D物体（使用Three.js几何体，不依赖外部模型文件）
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        
        const defaultObjects: Virtual3DObject[] = [
          {
            id: `stone-${timestamp}-${randomSuffix}-1`,
            name: '石头',
            // 移除modelUrl，使用Three.js几何体
            position: { x: -1, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            material: {
              type: 'stone',
              hardness: 0.9,
              roughness: 0.7,
              temperature: 20,
              elasticity: 0.1,
              hapticProfile: HapticProfiles.stone
            },
            boundingBox: {
              min: { x: -0.5, y: -0.5, z: -0.5 },
              max: { x: 0.5, y: 0.5, z: 0.5 }
            },
            interactive: true
          },
          {
            id: `sponge-${timestamp}-${randomSuffix}-2`,
            name: '海绵',
            // 移除modelUrl，使用Three.js几何体
            position: { x: 1, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            material: {
              type: 'sponge',
              hardness: 0.2,
              roughness: 0.3,
              temperature: 25,
              elasticity: 0.8,
              hapticProfile: HapticProfiles.sponge
            },
            boundingBox: {
              min: { x: -0.5, y: -0.5, z: -0.5 },
              max: { x: 0.5, y: 0.5, z: 0.5 }
            },
            interactive: true
          }
        ];
        
        defaultObjects.forEach(obj => actions.addVirtual3DObject(obj));
      }
    };

    initializeSystem();
  }, [actions]);

  // 设备连接处理
  const handleConnectDevice = useCallback(async () => {
    try {
      const success = await hapticController.connect();
      if (success) {
        setIsDeviceConnected(true);
        const deviceInfo = hapticController.getDeviceInfo();
        if (deviceInfo) {
          await actions.connectDevice(deviceInfo.id);
        }
      }
    } catch (error) {
      console.error('设备连接失败:', error);
      actions.addError({
        code: 'DEVICE_CONNECTION_FAILED',
        message: '设备连接失败',
        timestamp: Date.now(),
        context: error instanceof Error ? error.message : '未知错误'
      });
    }
  }, [hapticController, actions]);

  // 处理2D指尖位置更新
  const handleFingerPosition2D = useCallback((position: Point2D | null) => {
    setFingerPosition2D(position);
    
    // 将2D位置转换为3D位置（简单的深度映射）
    if (position) {
      const normalizedX = (position.x / 640) * 2 - 1; // -1 到 1
      const normalizedY = -((position.y / 480) * 2 - 1); // -1 到 1，Y轴翻转
      const estimatedZ = -2; // 假设深度
      
      const position3D: Point3D = {
        x: normalizedX * 3, // 扩展到3D空间
        y: normalizedY * 2,
        z: estimatedZ
      };
      
      setFingerPosition3D(position3D);
    } else {
      setFingerPosition3D(null);
    }
  }, []);

  // 处理物体检测结果
  const handleDetections = useCallback((newDetections: DetectionResult[]) => {
    setDetections(newDetections);
    actions.updateDetections(newDetections);
  }, [actions]);

  // 处理碰撞事件
  const handleCollision = useCallback(async (event: CollisionEvent) => {
    console.log('🎯 碰撞事件触发:', {
      objectId: event.objectId,
      objectName: event.objectName,
      type: event.type,
      material: event.material,
      timestamp: new Date(event.timestamp).toLocaleTimeString()
    });
    
    // 增加触碰计数
    actions.incrementTouchCount(event.objectId, event.material.type);
    
    // 触发触觉反馈
    console.log('🔌 设备连接状态:', isDeviceConnected);
    console.log('🎮 触觉配置文件:', event.material.hapticProfile);
    
    if (isDeviceConnected && event.material.hapticProfile) {
      console.log('📡 开始发送触觉反馈...');
      try {
        const success = await hapticController.sendHapticFeedback(
          event.material.hapticProfile
        );
        console.log('✅ 触觉反馈发送结果:', success);
      } catch (error) {
        console.error('❌ 触觉反馈播放失败:', error);
      }
    } else {
      if (!isDeviceConnected) {
        console.warn('⚠️ 设备未连接，无法发送触觉反馈');
      }
      if (!event.material.hapticProfile) {
        console.warn('⚠️ 材质缺少触觉配置文件');
      }
      
      // 模拟触觉反馈（视觉和音频提示）
      console.log('🔊 播放模拟触觉反馈');
      
      // 播放音频提示
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 根据材质硬度调整音频频率
        const frequency = 200 + (event.material.hardness * 300);
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
        console.log('🎵 音频反馈播放成功');
      } catch (audioError) {
        console.warn('🔇 音频反馈播放失败:', audioError);
      }
    }
    
    // 更新碰撞状态
    actions.addCollisionEvent(event);
  }, [isDeviceConnected, hapticController, actions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">指套触感反馈系统</h1>
                  <p className="text-sm text-gray-500">Fingertip Haptic Feedback System</p>
                </div>
              </div>
            </div>
            
            {/* 视图模式切换 */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('ar')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'ar' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AR视图
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'split' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  分屏视图
                </button>
              </div>
            </div>

            {/* 设备状态和控制 */}
            <div className="flex items-center space-x-4">
              {/* 设备状态 */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isDeviceConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {isDeviceConnected ? '设备已连接' : '设备未连接'}
                </span>
              </div>
              
              {/* 连接按钮 */}
              {!isDeviceConnected && (
                <button
                  onClick={handleConnectDevice}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  连接设备
                </button>
              )}
              
              {/* 电池电量显示 */}
              {device && device.batteryLevel !== undefined && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className={`w-6 h-3 border border-gray-400 rounded-sm relative ${
                      device.batteryLevel > 20 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <div 
                        className={`h-full rounded-sm transition-all duration-300 ${
                          device.batteryLevel > 50 ? 'bg-green-500' : 
                          device.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(device.batteryLevel, 5)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{device.batteryLevel}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              AR 手部追踪与3D交互系统
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              基于计算机视觉的实时手部追踪，支持AR增强现实和3D虚拟交互体验
            </p>
          </div>
        {viewMode === 'ar' ? (
          /* AR统一视图 */
          <div className="h-[calc(100vh-8rem)]">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden h-full">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AR增强现实视图</h2>
                    <p className="text-sm text-gray-600">实时相机画面与3D物体叠加显示</p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>手部追踪</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>物体检测</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>3D渲染</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-5rem)]">
                <AROverlayView
                  fingerPosition2D={fingerPosition2D}
                  fingerPosition3D={fingerPosition3D}
                  detections={detections}
                  onFingerPosition2D={handleFingerPosition2D}
                  onDetections={handleDetections}
                  onCollision={handleCollision}
                />
              </div>
            </div>
          </div>
        ) : (
          /* 分屏视图 */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
            {/* 相机视图 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">相机视图</h2>
                <p className="text-sm text-gray-600">实时手部追踪和物体检测</p>
              </div>
              <div className="p-4 h-full">
                <CameraView
                  width={640}
                  height={480}
                  onFingerPosition={handleFingerPosition2D}
                  onDetections={handleDetections}
                  showDebugInfo={true}
                />
              </div>
            </div>

            {/* 3D场景视图 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">3D交互场景</h2>
                <p className="text-sm text-gray-600">虚拟物体和触觉反馈</p>
              </div>
              <div className="h-full">
                <Scene3D
                  fingerPosition={fingerPosition3D}
                  fingerPosition2D={fingerPosition2D}
                  onCollision={handleCollision}
                  showGrid={interactionMode.type !== 'ar'}
                  enableControls={interactionMode.type === '3d'}
                />
              </div>
            </div>
          </div>
        )}

          {/* 触觉反馈统计面板 */}
          <TouchStatsPanel />

        {/* 状态信息面板 - 增强版 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* 检测统计卡片 */}
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">检测统计</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">检测物体</span>
                <span className="text-2xl font-bold text-blue-600">{detections.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">3D物体</span>
                <span className="text-2xl font-bold text-green-600">{virtual3DObjects.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">帧率</span>
                <span className="text-2xl font-bold text-purple-600">{system.performanceMetrics.frameRate} FPS</span>
              </div>
            </div>
          </div>

          {/* 指尖位置卡片 */}
          <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">指尖位置</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${fingerPosition2D ? 'bg-white animate-pulse' : 'bg-gray-300'}`}></div>
              </div>
            </div>
            <div className="space-y-3">
              {fingerPosition2D ? (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-gray-600 mb-2 font-medium">2D坐标</div>
                    <div className="font-mono text-lg font-bold text-blue-700">
                      ({Math.round(fingerPosition2D.x)}, {Math.round(fingerPosition2D.y)})
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-gray-600 mb-2 font-medium">3D坐标</div>
                    <div className="font-mono text-lg font-bold text-purple-700">
                      ({fingerPosition3D?.x.toFixed(2)}, {fingerPosition3D?.y.toFixed(2)}, {fingerPosition3D?.z.toFixed(2)})
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-gray-400 text-lg font-medium">未检测到手部</div>
                  <div className="text-sm text-gray-500 mt-2">请将手放在摄像头前</div>
                </div>
              )}
            </div>
          </div>

          {/* 系统状态卡片 */}
          <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-xl shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">系统状态</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">模式</span>
                <span className="text-sm font-bold px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                  {viewMode.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">相机</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${system.cameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${system.cameraActive ? 'text-green-600' : 'text-red-600'}`}>
                    {system.cameraActive ? '活跃' : '未激活'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <span className="text-gray-600 font-medium">追踪</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${system.trackingActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${system.trackingActive ? 'text-green-600' : 'text-red-600'}`}>
                    {system.trackingActive ? '运行中' : '停止'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 交互控制卡片 */}
          <div className="bg-gradient-to-br from-white to-orange-50 p-6 rounded-xl shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">交互控制</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => actions.setInteractionMode({ 
                  type: 'ar', 
                  enabled: true,
                  settings: {
                    sensitivity: 0.8,
                    hapticIntensity: 0.7,
                    visualFeedback: true,
                    audioFeedback: false,
                    debugMode: false
                  }
                })}
                className={`w-full px-4 py-4 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  interactionMode.type === 'ar' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                🥽 AR模式
              </button>
              <button
                onClick={() => actions.setInteractionMode({ 
                  type: '3d', 
                  enabled: true,
                  settings: {
                    sensitivity: 0.8,
                    hapticIntensity: 0.7,
                    visualFeedback: true,
                    audioFeedback: false,
                    debugMode: false
                  }
                })}
                className={`w-full px-4 py-4 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  interactionMode.type === '3d' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                🎮 3D模式
              </button>
              
              {/* 设备连接状态 */}
              <div className="mt-4 p-3 bg-white/70 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium">设备</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isDeviceConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-xs font-medium ${isDeviceConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {isDeviceConnected ? '已连接' : '未连接'}
                    </span>
                  </div>
                </div>
                {!isDeviceConnected && (
                  <button
                    onClick={handleConnectDevice}
                    className="w-full px-3 py-2 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    连接指套设备
                  </button>
                )}
                {isDeviceConnected && (
                  <div className="text-xs text-gray-500">
                    触觉反馈已启用
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

// 主应用组件
const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
