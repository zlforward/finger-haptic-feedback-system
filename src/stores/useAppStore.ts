// 指套触感反馈系统 - 全局状态管理
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  SystemState,
  FingerDevice,
  DetectionResult,
  HandLandmarks,
  Virtual3DObject,
  CollisionEvent,
  TouchStatistics,
  InteractionMode,
  AppConfig,
  PerformanceMetrics,
  ARSession,
  AppError,
  Point3D
} from '../types';

interface AppState {
  // 系统状态
  system: SystemState;
  
  // 设备状态
  device: FingerDevice | null;
  
  // 检测结果
  detections: DetectionResult[];
  handLandmarks: HandLandmarks | null;
  
  // 3D物体
  virtual3DObjects: Virtual3DObject[];
  
  // 碰撞事件
  collisions: CollisionEvent[];
  
  // 触碰统计
  touchStats: TouchStatistics;
  
  // 交互模式
  interactionMode: InteractionMode;
  
  // AR会话
  arSession: ARSession;
  
  // 应用配置
  config: AppConfig;
  
  // 错误状态
  errors: AppError[];
  
  // Actions
  actions: {
    // 系统控制
    initializeSystem: () => Promise<void>;
    shutdownSystem: () => void;
    updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
    
    // 设备管理
    connectDevice: (deviceId: string) => Promise<boolean>;
    disconnectDevice: () => void;
    updateDeviceStatus: (status: Partial<FingerDevice>) => void;
    
    // 检测结果更新
    updateDetections: (detections: DetectionResult[]) => void;
    updateHandLandmarks: (landmarks: HandLandmarks | null) => void;
    
    // 3D物体管理
    addVirtual3DObject: (object: Virtual3DObject) => void;
    removeVirtual3DObject: (objectId: string) => void;
    updateVirtual3DObject: (objectId: string, updates: Partial<Virtual3DObject>) => void;
    
    // 碰撞事件
    addCollisionEvent: (collision: CollisionEvent) => void;
    clearCollisions: () => void;
    
    // 触碰统计
    incrementTouchCount: (objectId: string, materialType: string) => void;
    resetTouchStats: () => void;
    updateTouchDuration: (duration: number) => void;
    addTouchHeatmapPoint: (objectId: string, position: Point3D, intensity: number) => void;
    
    // 交互模式
    setInteractionMode: (mode: InteractionMode) => void;
    
    // AR会话
    startARSession: () => Promise<boolean>;
    stopARSession: () => void;
    updateARSession: (session: Partial<ARSession>) => void;
    
    // 配置管理
    updateConfig: (config: Partial<AppConfig>) => void;
    resetConfig: () => void;
    
    // 错误处理
    addError: (error: AppError) => void;
    clearErrors: () => void;
    removeError: (timestamp: number) => void;
  };
}

// 默认配置
const defaultConfig: AppConfig = {
  yolo: {
    modelUrl: '/models/yolo11n.onnx',
    confidenceThreshold: 0.5,
    nmsThreshold: 0.4,
    targetClasses: ['person', 'cup', 'bottle', 'book', 'cell phone', 'laptop'],
    inputSize: 640
  },
  haptic: {
    defaultIntensity: 0.7,
    maxTemperature: 45,
    minTemperature: 15,
    vibrationRange: [50, 300],
    responseDelay: 20
  },
  ar: {
    planeDetection: true,
    lightEstimation: true,
    occlusionHandling: false,
    maxPlanes: 5
  },
  ui: {
    theme: 'auto',
    language: 'zh',
    showDebugInfo: false,
    showPerformanceMetrics: true
  }
};

// 默认系统状态
const defaultSystemState: SystemState = {
  initialized: false,
  deviceConnected: false,
  cameraActive: false,
  trackingActive: false,
  arActive: false,
  performanceMetrics: {
    frameRate: 0,
    detectionLatency: 0,
    hapticLatency: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    batteryLevel: 100,
    connectionQuality: 'excellent'
  }
};

// 默认交互模式
const defaultInteractionMode: InteractionMode = {
  type: '2d',
  enabled: true,
  settings: {
    sensitivity: 0.8,
    hapticIntensity: 0.7,
    visualFeedback: true,
    audioFeedback: false,
    debugMode: false
  }
};

// 默认AR会话
const defaultARSession: ARSession = {
  active: false,
  tracking: false,
  planes: [],
  cameraTransform: new Array(16).fill(0)
};

const defaultTouchStats: TouchStatistics = {
  totalTouches: 0,
  touchesByObject: {},
  touchesByMaterial: {},
  sessionStartTime: Date.now(),
  sessionDuration: 0,
  lastTouchTime: 0,
  averageTouchDuration: 0,
  touchHeatmap: []
};

export const useAppStore = create<AppState>()(devtools(
    persist(
      (set, get) => ({
        // 初始状态
        system: defaultSystemState,
        device: null,
        detections: [],
        handLandmarks: null,
        virtual3DObjects: [],
        collisions: [],
        touchStats: defaultTouchStats,
        interactionMode: defaultInteractionMode,
        arSession: defaultARSession,
        config: defaultConfig,
        errors: [],
        
        // Actions
        actions: {
          // 系统控制
          initializeSystem: async () => {
            try {
              set((state) => ({
                system: { ...state.system, initialized: true }
              }));
            } catch (error) {
              get().actions.addError({
                code: 'SYSTEM_INIT_FAILED',
                message: '系统初始化失败',
                timestamp: Date.now(),
                context: error
              });
            }
          },
          
          shutdownSystem: () => {
            set((state) => ({
              system: { ...defaultSystemState },
              device: null,
              detections: [],
              handLandmarks: null,
              collisions: [],
              arSession: defaultARSession
            }));
          },
          
          updatePerformanceMetrics: (metrics) => {
            set((state) => ({
              system: {
                ...state.system,
                performanceMetrics: { ...state.system.performanceMetrics, ...metrics }
              }
            }));
          },
          
          // 设备管理
          connectDevice: async (deviceId: string) => {
            try {
              // 这里应该实现实际的设备连接逻辑
              const mockDevice: FingerDevice = {
                id: deviceId,
                name: 'FingerSuit Pro',
                connected: true,
                batteryLevel: 85,
                firmwareVersion: '2.1.0',
                capabilities: {
                  vibration: true,
                  temperature: true,
                  pressure: true,
                  flex: true
                }
              };
              
              set((state) => ({
                device: mockDevice,
                system: { ...state.system, deviceConnected: true }
              }));
              
              return true;
            } catch (error) {
              get().actions.addError({
                code: 'DEVICE_CONNECTION_FAILED',
                message: '设备连接失败',
                timestamp: Date.now(),
                context: error
              });
              return false;
            }
          },
          
          disconnectDevice: () => {
            set((state) => ({
              device: null,
              system: { ...state.system, deviceConnected: false }
            }));
          },
          
          updateDeviceStatus: (status) => {
            set((state) => ({
              device: state.device ? { ...state.device, ...status } : null
            }));
          },
          
          // 检测结果更新
          updateDetections: (detections) => {
            set({ detections });
          },
          
          updateHandLandmarks: (landmarks) => {
            set({ handLandmarks: landmarks });
          },
          
          // 3D物体管理
          addVirtual3DObject: (object) => {
            set((state) => ({
              virtual3DObjects: [...state.virtual3DObjects, object]
            }));
          },
          
          removeVirtual3DObject: (objectId) => {
            set((state) => ({
              virtual3DObjects: state.virtual3DObjects.filter(obj => obj.id !== objectId)
            }));
          },
          
          updateVirtual3DObject: (objectId, updates) => {
            set((state) => ({
              virtual3DObjects: state.virtual3DObjects.map(obj => 
                obj.id === objectId ? { ...obj, ...updates } : obj
              )
            }));
          },
          
          // 碰撞事件
          addCollisionEvent: (collision) => {
            set((state) => ({
              collisions: [...state.collisions.slice(-9), collision] // 保持最近10个碰撞事件
            }));
          },
          
          clearCollisions: () => {
            set({ collisions: [] });
          },
          
          // 触碰统计
          incrementTouchCount: (objectId, materialType) => {
            set((state) => {
              const newTouchStats = { ...state.touchStats };
              newTouchStats.totalTouches += 1;
              newTouchStats.touchesByObject[objectId] = (newTouchStats.touchesByObject[objectId] || 0) + 1;
              newTouchStats.touchesByMaterial[materialType] = (newTouchStats.touchesByMaterial[materialType] || 0) + 1;
              newTouchStats.lastTouchTime = Date.now();
              return { touchStats: newTouchStats };
            });
          },
          
          resetTouchStats: () => {
            set({ touchStats: { ...defaultTouchStats, sessionStartTime: Date.now() } });
          },
          
          updateTouchDuration: (duration) => {
            set((state) => {
              const newTouchStats = { ...state.touchStats };
              const totalDuration = newTouchStats.averageTouchDuration * (newTouchStats.totalTouches - 1) + duration;
              newTouchStats.averageTouchDuration = totalDuration / newTouchStats.totalTouches;
              return { touchStats: newTouchStats };
            });
          },
          
          addTouchHeatmapPoint: (objectId, position, intensity) => {
            set((state) => {
              const newTouchStats = { ...state.touchStats };
              newTouchStats.touchHeatmap.push({
                objectId,
                position,
                intensity,
                timestamp: Date.now()
              });
              // 保持最近100个热力图点
              if (newTouchStats.touchHeatmap.length > 100) {
                newTouchStats.touchHeatmap = newTouchStats.touchHeatmap.slice(-100);
              }
              return { touchStats: newTouchStats };
            });
          },
          
          // 交互模式
          setInteractionMode: (mode) => {
            set({ interactionMode: mode });
          },
          
          // AR会话
          startARSession: async () => {
            try {
              // 这里应该实现实际的AR会话启动逻辑
              set((state) => ({
                arSession: { ...state.arSession, active: true, tracking: true },
                system: { ...state.system, arActive: true }
              }));
              return true;
            } catch (error) {
              get().actions.addError({
                code: 'AR_NOT_SUPPORTED',
                message: 'AR功能不支持',
                timestamp: Date.now(),
                context: error
              });
              return false;
            }
          },
          
          stopARSession: () => {
            set((state) => ({
              arSession: defaultARSession,
              system: { ...state.system, arActive: false }
            }));
          },
          
          updateARSession: (session) => {
            set((state) => ({
              arSession: { ...state.arSession, ...session }
            }));
          },
          
          // 配置管理
          updateConfig: (config) => {
            set((state) => ({
              config: { ...state.config, ...config }
            }));
          },
          
          resetConfig: () => {
            set({ config: defaultConfig });
          },
          
          // 错误处理
          addError: (error) => {
            set((state) => ({
              errors: [...state.errors.slice(-9), error] // 保持最近10个错误
            }));
          },
          
          clearErrors: () => {
            set({ errors: [] });
          },
          
          removeError: (timestamp) => {
            set((state) => ({
              errors: state.errors.filter(error => error.timestamp !== timestamp)
            }));
          }
        }
      }),
      {
        name: 'finger-haptic-app-store',
        partialize: (state) => ({
          config: state.config,
          interactionMode: state.interactionMode
        })
      }
    ),
    {
      name: 'finger-haptic-app-store'
    }
  ));

// 便捷的hooks
export const useSystem = () => useAppStore((state) => state.system);
export const useDevice = () => useAppStore((state) => state.device);
export const useDetections = () => useAppStore((state) => state.detections);
export const useHandLandmarks = () => useAppStore((state) => state.handLandmarks);
export const useVirtual3DObjects = () => useAppStore((state) => state.virtual3DObjects);
export const useCollisions = () => useAppStore((state) => state.collisions);
export const useTouchStats = () => useAppStore((state) => state.touchStats);
export const useInteractionMode = () => useAppStore((state) => state.interactionMode);
export const useARSession = () => useAppStore((state) => state.arSession);
export const useConfig = () => useAppStore((state) => state.config);
export const useErrors = () => useAppStore((state) => state.errors);
export const useActions = () => useAppStore((state) => state.actions);