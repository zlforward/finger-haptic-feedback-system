// YOLO11物体检测器
import * as ort from 'onnxruntime-web';
import type { DetectionResult, YOLOConfig } from '../types';

// YOLO11检测器类
export class YOLO11Detector {
  private session: ort.InferenceSession | null = null;
  private config: YOLOConfig;
  private isInitialized = false;
  private classNames: string[] = [];

  constructor(config: YOLOConfig) {
    this.config = config;
    this.initializeClassNames();
  }

  // 初始化类别名称
  private initializeClassNames() {
    // COCO数据集的80个类别
    this.classNames = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
      'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
      'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
      'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
      'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
      'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
      'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
      'toothbrush'
    ];
  }

  // 初始化模型
  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 开始初始化YOLO11检测器...');
      console.log('📋 配置参数:', {
        modelUrl: this.config.modelUrl,
        confidenceThreshold: this.config.confidenceThreshold,
        nmsThreshold: this.config.nmsThreshold,
        targetClasses: this.config.targetClasses,
        inputSize: this.config.inputSize
      });
      
      // 首先检查模型文件是否存在
      console.log('🔍 检查模型文件是否存在...');
      try {
        const response = await fetch(this.config.modelUrl, { method: 'HEAD' });
        console.log('📡 模型文件检查响应:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          throw new Error(`模型文件不存在: ${this.config.modelUrl} (状态: ${response.status})`);
        }
        console.log('✅ 模型文件存在，继续加载...');
      } catch (fetchError) {
        console.error('❌ 模型文件检查失败:', fetchError);
        console.log('💡 提示: 请确保YOLO11模型文件存在于 public/models/ 目录下');
        console.log('💡 或者在配置中使用有效的模型URL');
        console.log('💡 当前模型路径:', this.config.modelUrl);
        return false;
      }
      
      // 配置ONNX Runtime
      console.log('⚙️ 配置ONNX Runtime...');
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
      ort.env.wasm.numThreads = 1;
      ort.env.logLevel = 'warning'; // 减少日志输出
      console.log('✅ ONNX Runtime配置完成');
      
      // 加载模型
      console.log('📥 开始加载ONNX模型...');
      const startTime = performance.now();
      
      this.session = await ort.InferenceSession.create(this.config.modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      
      const loadTime = performance.now() - startTime;
      console.log('✅ ONNX模型加载成功');
      console.log('⏱️ 模型加载耗时:', `${loadTime.toFixed(2)}ms`);
      console.log('📊 模型信息:', {
        inputNames: this.session.inputNames,
        outputNames: this.session.outputNames
      });
      
      this.isInitialized = true;
      console.log('🎉 YOLO11检测器初始化完成！');
      return true;
    } catch (error) {
      console.error('❌ YOLO11模型加载失败:', error);
      
      // 提供详细的错误信息和解决方案
      if (error instanceof Error) {
        console.error('🔍 错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        if (error.message.includes('protobuf')) {
          console.error('🚨 Protobuf解析错误 - 可能的原因:');
          console.error('  1. 模型文件损坏或格式不正确');
          console.error('  2. ONNX Runtime版本不兼容');
          console.error('  3. 模型文件不是有效的ONNX格式');
          console.error('💡 解决方案: 重新下载正确的YOLO11 ONNX模型文件');
        } else if (error.message.includes('fetch')) {
          console.error('🚨 网络错误 - 无法下载模型文件');
          console.error('💡 解决方案: 检查网络连接或使用本地模型文件');
        } else if (error.message.includes('wasm')) {
          console.error('🚨 WebAssembly错误 - ONNX Runtime初始化失败');
          console.error('💡 解决方案: 检查浏览器是否支持WebAssembly');
        }
      }
      
      console.log('⚠️ 系统将在没有物体检测功能的情况下继续运行');
      return false;
    }
  }

  // 检测物体
  async detect(imageData: ImageData): Promise<DetectionResult[]> {
    if (!this.isInitialized || !this.session) {
      throw new Error('YOLO11检测器未初始化');
    }

    try {
      // 预处理图像
      const preprocessed = this.preprocessImage(imageData);
      
      // 运行推理
      const results = await this.session.run({
        images: preprocessed.tensor
      });
      
      // 后处理结果
      const detections = this.postprocessResults(
        results.output0.data as Float32Array,
        preprocessed.scaleX,
        preprocessed.scaleY
      );
      
      return detections;
    } catch (error) {
      console.error('YOLO11检测失败:', error);
      return [];
    }
  }

  // 图像预处理
  private preprocessImage(imageData: ImageData) {
    const { width, height, data } = imageData;
    const inputSize = this.config.inputSize;
    
    // 计算缩放比例
    const scaleX = width / inputSize;
    const scaleY = height / inputSize;
    
    // 创建canvas进行缩放
    const canvas = document.createElement('canvas');
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d')!;
    
    // 绘制并缩放图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, inputSize, inputSize);
    
    // 获取缩放后的图像数据
    const scaledImageData = ctx.getImageData(0, 0, inputSize, inputSize);
    const scaledData = scaledImageData.data;
    
    // 转换为模型输入格式 [1, 3, 640, 640]
    const tensor = new Float32Array(1 * 3 * inputSize * inputSize);
    
    for (let i = 0; i < inputSize * inputSize; i++) {
      const pixelIndex = i * 4;
      const tensorIndex = i;
      
      // 归一化到 [0, 1] 并按 RGB 通道排列
      tensor[tensorIndex] = scaledData[pixelIndex] / 255.0; // R
      tensor[tensorIndex + inputSize * inputSize] = scaledData[pixelIndex + 1] / 255.0; // G
      tensor[tensorIndex + 2 * inputSize * inputSize] = scaledData[pixelIndex + 2] / 255.0; // B
    }
    
    return {
      tensor: new ort.Tensor('float32', tensor, [1, 3, inputSize, inputSize]),
      scaleX,
      scaleY
    };
  }

  // 结果后处理
  private postprocessResults(
    output: Float32Array,
    scaleX: number,
    scaleY: number
  ): DetectionResult[] {
    const detections: DetectionResult[] = [];
    const numDetections = output.length / 85; // YOLO11输出格式: [x, y, w, h, conf, ...classes]
    
    for (let i = 0; i < numDetections; i++) {
      const offset = i * 85;
      
      // 提取边界框信息
      const centerX = output[offset] * scaleX;
      const centerY = output[offset + 1] * scaleY;
      const width = output[offset + 2] * scaleX;
      const height = output[offset + 3] * scaleY;
      const confidence = output[offset + 4];
      
      // 过滤低置信度检测
      if (confidence < this.config.confidenceThreshold) {
        continue;
      }
      
      // 找到最高置信度的类别
      let maxClassConfidence = 0;
      let maxClassIndex = 0;
      
      for (let j = 0; j < 80; j++) {
        const classConfidence = output[offset + 5 + j];
        if (classConfidence > maxClassConfidence) {
          maxClassConfidence = classConfidence;
          maxClassIndex = j;
        }
      }
      
      const finalConfidence = confidence * maxClassConfidence;
      
      // 再次过滤
      if (finalConfidence < this.config.confidenceThreshold) {
        continue;
      }
      
      const className = this.classNames[maxClassIndex];
      
      // 只检测目标类别
      if (!this.config.targetClasses.includes(className)) {
        continue;
      }
      
      // 转换为边界框格式
      const x = centerX - width / 2;
      const y = centerY - height / 2;
      
      detections.push({
        id: `${className}_${Date.now()}_${i}`,
        class: className,
        confidence: finalConfidence,
        bbox: { x, y, width, height },
        center: { x: centerX, y: centerY },
        timestamp: Date.now()
      });
    }
    
    // 应用非极大值抑制
    return this.applyNMS(detections);
  }

  // 非极大值抑制
  private applyNMS(detections: DetectionResult[]): DetectionResult[] {
    if (detections.length === 0) return [];
    
    // 按置信度排序
    detections.sort((a, b) => b.confidence - a.confidence);
    
    const keep: DetectionResult[] = [];
    const suppressed = new Set<number>();
    
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      
      keep.push(detections[i]);
      
      // 抑制重叠的检测
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        
        const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
        if (iou > this.config.nmsThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return keep;
  }

  // 计算IoU (Intersection over Union)
  private calculateIoU(box1: any, box2: any): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
  }

  // 释放资源
  dispose() {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
    this.isInitialized = false;
  }

  // 获取支持的类别
  getSupportedClasses(): string[] {
    return [...this.classNames];
  }

  // 更新配置
  updateConfig(config: Partial<YOLOConfig>) {
    this.config = { ...this.config, ...config };
  }

  // 检查是否已初始化
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// 创建全局检测器实例
let globalDetector: YOLO11Detector | null = null;

export const createYOLO11Detector = (config: YOLOConfig): YOLO11Detector => {
  if (globalDetector) {
    globalDetector.dispose();
  }
  globalDetector = new YOLO11Detector(config);
  return globalDetector;
};

export const getYOLO11Detector = (): YOLO11Detector | null => {
  return globalDetector;
};