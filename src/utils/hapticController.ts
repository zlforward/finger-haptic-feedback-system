// 触觉反馈控制器
import type {
  FingerDevice,
  HapticProfile,
  VibrationConfig,
  TemperatureConfig,
  DeviceCapabilities
} from '../types';

// 蓝牙类型声明
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
  
  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    value?: DataView;
    writeValue(value: ArrayBuffer): Promise<void>;
    readValue(): Promise<DataView>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
}

// 蓝牙服务和特征UUID
const HAPTIC_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const VIBRATION_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abd';
const TEMPERATURE_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abe';
const BATTERY_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abf';
const STATUS_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789ac0';

// 指令类型
enum CommandType {
  VIBRATION = 0x01,
  TEMPERATURE = 0x02,
  STOP_ALL = 0x03,
  GET_STATUS = 0x04,
  CALIBRATE = 0x05
}

// 触觉反馈控制器类
export class HapticController {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();
  private isConnected = false;
  private deviceInfo: FingerDevice | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  // 初始化事件监听器
  private initializeEventListeners() {
    this.eventListeners.set('connected', []);
    this.eventListeners.set('disconnected', []);
    this.eventListeners.set('batteryUpdate', []);
    this.eventListeners.set('error', []);
  }

  // 添加事件监听器
  addEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  // 移除事件监听器
  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // 触发事件
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // 连接设备
  async connect(deviceName: string = 'FingerSuit'): Promise<boolean> {
    try {
      console.log('正在搜索指套设备...');
      
      // 检查浏览器是否支持Web Bluetooth
      if (!navigator.bluetooth) {
        throw new Error('当前浏览器不支持Web Bluetooth API');
      }

      // 请求设备
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: deviceName }],
        optionalServices: [HAPTIC_SERVICE_UUID]
      });

      // 监听设备断开事件
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

      // 连接GATT服务器
      this.server = await this.device.gatt!.connect();
      console.log('已连接到GATT服务器');

      // 获取触觉反馈服务
      this.service = await this.server.getPrimaryService(HAPTIC_SERVICE_UUID);
      console.log('已获取触觉反馈服务');

      // 获取所有特征
      await this.initializeCharacteristics();

      // 获取设备信息
      await this.fetchDeviceInfo();

      // 启动电池监控
      this.startBatteryMonitoring();

      this.isConnected = true;
      this.emit('connected', this.deviceInfo);
      
      console.log('指套设备连接成功');
      return true;
    } catch (error) {
      console.error('设备连接失败:', error);
      this.emit('error', { type: 'CONNECTION_FAILED', message: error.message });
      return false;
    }
  }

  // 初始化特征
  private async initializeCharacteristics() {
    const characteristicUUIDs = [
      VIBRATION_CHARACTERISTIC_UUID,
      TEMPERATURE_CHARACTERISTIC_UUID,
      BATTERY_CHARACTERISTIC_UUID,
      STATUS_CHARACTERISTIC_UUID
    ];

    for (const uuid of characteristicUUIDs) {
      try {
        const characteristic = await this.service!.getCharacteristic(uuid);
        this.characteristics.set(uuid, characteristic);
        console.log(`已获取特征: ${uuid}`);
      } catch (error) {
        console.warn(`无法获取特征 ${uuid}:`, error);
      }
    }
  }

  // 获取设备信息
  private async fetchDeviceInfo() {
    try {
      const statusCharacteristic = this.characteristics.get(STATUS_CHARACTERISTIC_UUID);
      if (statusCharacteristic) {
        const statusData = await statusCharacteristic.readValue();
        const status = this.parseStatusData(statusData);
        
        this.deviceInfo = {
          id: this.device!.id,
          name: this.device!.name || 'FingerSuit',
          connected: true,
          batteryLevel: status.batteryLevel,
          firmwareVersion: status.firmwareVersion,
          capabilities: status.capabilities
        };
      }
    } catch (error) {
      console.warn('无法获取设备状态:', error);
      // 使用默认设备信息
      this.deviceInfo = {
        id: this.device!.id,
        name: this.device!.name || 'FingerSuit',
        connected: true,
        batteryLevel: 100,
        firmwareVersion: '1.0.0',
        capabilities: {
          vibration: true,
          temperature: true,
          pressure: false,
          flex: false
        }
      };
    }
  }

  // 解析状态数据
  private parseStatusData(data: DataView) {
    return {
      batteryLevel: data.getUint8(0),
      firmwareVersion: `${data.getUint8(1)}.${data.getUint8(2)}.${data.getUint8(3)}`,
      capabilities: {
        vibration: !!(data.getUint8(4) & 0x01),
        temperature: !!(data.getUint8(4) & 0x02),
        pressure: !!(data.getUint8(4) & 0x04),
        flex: !!(data.getUint8(4) & 0x08)
      }
    };
  }

  // 启动电池监控
  private startBatteryMonitoring() {
    const batteryCharacteristic = this.characteristics.get(BATTERY_CHARACTERISTIC_UUID);
    if (batteryCharacteristic) {
      // 启用通知
      batteryCharacteristic.startNotifications().then(() => {
        batteryCharacteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = (event.target as unknown) as BluetoothRemoteGATTCharacteristic;
          if (target && target.value) {
            const batteryLevel = target.value.getUint8(0);
            
            if (this.deviceInfo) {
              this.deviceInfo.batteryLevel = batteryLevel;
              this.emit('batteryUpdate', batteryLevel);
            }
          }
        });
      }).catch(error => {
        console.warn('无法启用电池通知:', error);
      });
    }
  }

  // 断开连接处理
  private handleDisconnection() {
    console.log('设备已断开连接');
    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristics.clear();
    
    if (this.deviceInfo) {
      this.deviceInfo.connected = false;
    }
    
    this.emit('disconnected');
  }

  // 断开连接
  async disconnect() {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
  }

  // 发送振动反馈
  async sendVibration(config: VibrationConfig): Promise<boolean> {
    if (!this.isConnected || !this.deviceInfo?.capabilities.vibration) {
      console.warn('设备未连接或不支持振动反馈');
      return false;
    }

    try {
      const characteristic = this.characteristics.get(VIBRATION_CHARACTERISTIC_UUID);
      if (!characteristic) {
        throw new Error('振动特征不可用');
      }

      // 构建振动指令数据包
      const command = new ArrayBuffer(8);
      const view = new DataView(command);
      
      view.setUint8(0, CommandType.VIBRATION);
      view.setUint8(1, Math.floor(config.intensity * 255));
      view.setUint16(2, config.frequency, true);
      view.setUint16(4, config.duration, true);
      view.setUint8(6, this.getPatternCode(config.pattern));
      view.setUint8(7, this.calculateChecksum(new Uint8Array(command, 0, 7)));

      await characteristic.writeValue(command);
      console.log('振动指令发送成功');
      return true;
    } catch (error) {
      console.error('发送振动指令失败:', error);
      this.emit('error', { type: 'VIBRATION_FAILED', message: error.message });
      return false;
    }
  }

  // 发送温度反馈
  async sendTemperature(config: TemperatureConfig): Promise<boolean> {
    if (!this.isConnected || !this.deviceInfo?.capabilities.temperature) {
      console.warn('设备未连接或不支持温度反馈');
      return false;
    }

    try {
      const characteristic = this.characteristics.get(TEMPERATURE_CHARACTERISTIC_UUID);
      if (!characteristic) {
        throw new Error('温度特征不可用');
      }

      // 构建温度指令数据包
      const command = new ArrayBuffer(8);
      const view = new DataView(command);
      
      view.setUint8(0, CommandType.TEMPERATURE);
      view.setInt8(1, config.target); // 温度值（摄氏度）
      view.setUint16(2, config.rampTime, true);
      view.setUint16(4, config.holdTime, true);
      view.setUint8(6, 0); // 保留字节
      view.setUint8(7, this.calculateChecksum(new Uint8Array(command, 0, 7)));

      await characteristic.writeValue(command);
      console.log('温度指令发送成功');
      return true;
    } catch (error) {
      console.error('发送温度指令失败:', error);
      this.emit('error', { type: 'TEMPERATURE_FAILED', message: error.message });
      return false;
    }
  }

  // 发送触觉反馈
  async sendHapticFeedback(profile: HapticProfile): Promise<boolean> {
    const results: boolean[] = [];

    // 发送振动反馈
    if (profile.vibration) {
      results.push(await this.sendVibration(profile.vibration));
    }

    // 发送温度反馈
    if (profile.temperature) {
      results.push(await this.sendTemperature(profile.temperature));
    }

    return results.every(result => result);
  }

  // 停止所有反馈
  async stopAllFeedback(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const vibrationCharacteristic = this.characteristics.get(VIBRATION_CHARACTERISTIC_UUID);
      if (vibrationCharacteristic) {
        const command = new ArrayBuffer(2);
        const view = new DataView(command);
        view.setUint8(0, CommandType.STOP_ALL);
        view.setUint8(1, this.calculateChecksum(new Uint8Array(command, 0, 1)));
        
        await vibrationCharacteristic.writeValue(command);
      }
      
      console.log('已停止所有触觉反馈');
      return true;
    } catch (error) {
      console.error('停止反馈失败:', error);
      return false;
    }
  }

  // 获取波形模式代码
  private getPatternCode(pattern: string): number {
    const patterns: Record<string, number> = {
      'sharp': 1,
      'soft': 2,
      'medium': 3,
      'pulse': 4
    };
    return patterns[pattern] || 1;
  }

  // 计算校验和
  private calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum & 0xFF;
  }

  // 检查连接状态
  get connected(): boolean {
    return this.isConnected;
  }

  // 获取设备信息
  getDeviceInfo(): FingerDevice | null {
    return this.deviceInfo;
  }

  // 检查设备能力
  hasCapability(capability: keyof DeviceCapabilities): boolean {
    return this.deviceInfo?.capabilities[capability] || false;
  }
}

// 创建全局控制器实例
let globalController: HapticController | null = null;

export const createHapticController = (): HapticController => {
  if (!globalController) {
    globalController = new HapticController();
  }
  return globalController;
};

export const getHapticController = (): HapticController | null => {
  return globalController;
};

// 预定义的触觉配置文件
export const HapticProfiles = {
  // 石头 - 硬质材料
  stone: {
    vibration: {
      intensity: 0.9,
      frequency: 200,
      pattern: 'sharp' as const,
      duration: 100
    },
    temperature: {
      target: 18,
      rampTime: 200,
      holdTime: 300
    },
    duration: 400,
    intensity: 0.9
  },
  
  // 海绵 - 软质材料
  sponge: {
    vibration: {
      intensity: 0.3,
      frequency: 50,
      pattern: 'soft' as const,
      duration: 300
    },
    temperature: {
      target: 28,
      rampTime: 800,
      holdTime: 500
    },
    duration: 800,
    intensity: 0.3
  },
  
  // 木块 - 中等硬度
  wood: {
    vibration: {
      intensity: 0.6,
      frequency: 120,
      pattern: 'medium' as const,
      duration: 200
    },
    temperature: {
      target: 22,
      rampTime: 400,
      holdTime: 400
    },
    duration: 600,
    intensity: 0.6
  },
  
  // 金属 - 冷硬材料
  metal: {
    vibration: {
      intensity: 0.8,
      frequency: 180,
      pattern: 'sharp' as const,
      duration: 150
    },
    temperature: {
      target: 15,
      rampTime: 300,
      holdTime: 400
    },
    duration: 550,
    intensity: 0.8
  }
} as const;