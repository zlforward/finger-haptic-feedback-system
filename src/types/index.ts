// 指套触感反馈系统 - 核心类型定义

// 基础几何类型
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
}

// YOLO11检测结果
export interface DetectionResult {
  id: string;
  class: string;
  confidence: number;
  bbox: BoundingBox;
  center: Point2D;
  timestamp: number;
}

// 手部追踪数据
export interface HandLandmarks {
  landmarks: Point3D[];
  handedness: 'Left' | 'Right';
  confidence: number;
  timestamp: number;
}

// 指套设备信息
export interface FingerDevice {
  id: string;
  name: string;
  connected: boolean;
  batteryLevel: number;
  firmwareVersion: string;
  capabilities: DeviceCapabilities;
}

export interface DeviceCapabilities {
  vibration: boolean;
  temperature: boolean;
  pressure: boolean;
  flex: boolean;
}

// 触觉反馈配置
export interface HapticProfile {
  vibration?: VibrationConfig;
  temperature?: TemperatureConfig;
  duration: number;
  intensity: number;
}

export interface VibrationConfig {
  intensity: number; // 0-1
  frequency: number; // Hz
  pattern: 'sharp' | 'soft' | 'medium' | 'pulse';
  duration: number; // ms
}

export interface TemperatureConfig {
  target: number; // 摄氏度
  rampTime: number; // ms
  holdTime: number; // ms
}

// 3D物体定义
export interface Virtual3DObject {
  id: string;
  name: string;
  modelUrl?: string; // 可选，如果没有则使用Three.js几何体
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
  material: MaterialProperties;
  boundingBox: BoundingBox3D;
  interactive: boolean;
}

export interface MaterialProperties {
  type: string; // 材质类型标识符
  hardness: number; // 0-1
  roughness: number; // 0-1
  temperature: number; // 摄氏度
  elasticity: number; // 0-1
  hapticProfile: HapticProfile;
}

// 触碰统计数据
export interface TouchStatistics {
  totalTouches: number;
  touchesByObject: Record<string, number>;
  touchesByMaterial: Record<string, number>;
  sessionStartTime: number;
  sessionDuration: number; // 会话持续时间（毫秒）
  lastTouchTime: number;
  averageTouchDuration: number;
  touchHeatmap: TouchHeatmapData[];
}

export interface TouchHeatmapData {
  objectId: string;
  position: Point3D;
  intensity: number;
  timestamp: number;
}

// 碰撞事件
export interface CollisionEvent {
  objectId: string;
  objectName: string;
  contactPoint: Point3D;
  force: number;
  material: MaterialProperties;
  timestamp: number;
  type: 'enter' | 'stay' | 'exit';
}

export interface CollisionState {
  startTime: number;
  lastUpdate: number;
  intensity: number;
  active: boolean;
}

// AR相关
export interface ARPlane {
  id: string;
  center: Point3D;
  normal: Point3D;
  extent: Point2D;
  confidence: number;
}

export interface ARSession {
  active: boolean;
  tracking: boolean;
  planes: ARPlane[];
  cameraTransform: Matrix4;
}

// 相机和传感器数据
export interface CameraFrame {
  data: ImageData;
  timestamp: number;
  width: number;
  height: number;
}

export interface IMUData {
  acceleration: Point3D;
  gyroscope: Point3D;
  magnetometer: Point3D;
  timestamp: number;
}

export interface FlexSensorData {
  joints: number[]; // 各关节弯曲角度
  timestamp: number;
}

// 系统状态
export interface SystemState {
  initialized: boolean;
  deviceConnected: boolean;
  cameraActive: boolean;
  trackingActive: boolean;
  arActive: boolean;
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  frameRate: number;
  detectionLatency: number;
  hapticLatency: number;
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// 用户交互
export interface InteractionMode {
  type: '2d' | '3d' | 'ar';
  enabled: boolean;
  settings: InteractionSettings;
}

export interface InteractionSettings {
  sensitivity: number;
  hapticIntensity: number;
  visualFeedback: boolean;
  audioFeedback: boolean;
  debugMode: boolean;
}

// 配置和设置
export interface AppConfig {
  yolo: YOLOConfig;
  haptic: HapticConfig;
  ar: ARConfig;
  ui: UIConfig;
}

export interface YOLOConfig {
  modelUrl: string;
  confidenceThreshold: number;
  nmsThreshold: number;
  targetClasses: string[];
  inputSize: number;
}

export interface HapticConfig {
  defaultIntensity: number;
  maxTemperature: number;
  minTemperature: number;
  vibrationRange: [number, number];
  responseDelay: number;
}

export interface ARConfig {
  planeDetection: boolean;
  lightEstimation: boolean;
  occlusionHandling: boolean;
  maxPlanes: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  showDebugInfo: boolean;
  showPerformanceMetrics: boolean;
}

// 工具类型
export type Matrix4 = number[]; // 4x4矩阵
export type Quaternion = [number, number, number, number];
export type EventCallback<T = any> = (data: T) => void;
export type AsyncEventCallback<T = any> = (data: T) => Promise<void>;

// 错误处理
export interface AppError {
  code: string;
  message: string;
  timestamp: number;
  context?: any;
}

export type ErrorType = 
  | 'DEVICE_CONNECTION_FAILED'
  | 'CAMERA_ACCESS_DENIED'
  | 'MODEL_LOAD_FAILED'
  | 'AR_NOT_SUPPORTED'
  | 'BLUETOOTH_NOT_AVAILABLE'
  | 'PERFORMANCE_DEGRADED';