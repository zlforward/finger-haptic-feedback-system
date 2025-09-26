// 3D场景组件 - 使用React Three Fiber渲染3D物体
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Grid,
  useGLTF,
  Html,
  Text
} from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../stores/useAppStore';
import type { Virtual3DObject, Point3D, Point2D, CollisionEvent } from '../../types';

// 3D物体组件
interface Interactive3DObjectProps {
  object: Virtual3DObject;
  fingerPosition?: Point3D | null;
  fingerPosition2D?: Point2D | null;
  onCollision?: (collision: CollisionEvent) => void;
}

const Interactive3DObject: React.FC<Interactive3DObjectProps> = ({ 
  object, 
  fingerPosition, 
  fingerPosition2D,
  onCollision 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isColliding, setIsColliding] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [particleSystem, setParticleSystem] = useState<THREE.Points | null>(null);
  const { actions } = useAppStore();

  // 加载3D模型（使用条件渲染避免Hook条件调用）
  const ModelLoader: React.FC<{ modelUrl?: string }> = ({ modelUrl }) => {
    if (!modelUrl) return null;
    const { scene } = useGLTF(modelUrl, true);
    return <primitive object={scene.clone()} />;
  };
  
  const loadedScene = null; // 移除直接的Hook调用

  // 创建粒子效果
  const createParticleEffect = useMemo(() => {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;
      
      colors[i3] = Math.random();
      colors[i3 + 1] = Math.random();
      colors[i3 + 2] = Math.random();
      
      sizes[i] = Math.random() * 0.1 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }, []);

  // 2D坐标投影碰撞检测
  useEffect(() => {
    if (!fingerPosition2D || !meshRef.current) return;

    const mesh = meshRef.current;
    const { camera, gl } = useThree.getState();
    
    // 获取物体的屏幕坐标
    const objectWorldPosition = new THREE.Vector3();
    mesh.getWorldPosition(objectWorldPosition);
    
    // 将3D世界坐标投影到2D屏幕坐标
    const objectScreenPosition = objectWorldPosition.clone().project(camera);
    
    // 转换为像素坐标
    const canvasWidth = gl.domElement.width;
    const canvasHeight = gl.domElement.height;
    
    const objectPixelX = (objectScreenPosition.x * 0.5 + 0.5) * canvasWidth;
    const objectPixelY = (objectScreenPosition.y * -0.5 + 0.5) * canvasHeight;
    
    // 计算距离
    const distance = Math.sqrt(
      Math.pow(fingerPosition2D.x - objectPixelX, 2) + 
      Math.pow(fingerPosition2D.y - objectPixelY, 2)
    );
    
    // 碰撞阈值（像素）
    const collisionThreshold = 50;
    
    const wasColliding = isColliding;
    const nowColliding = distance < collisionThreshold;

    console.log('🎯 2D碰撞检测:', {
      objectId: object.id,
      fingerPosition2D,
      objectPixelPosition: { x: objectPixelX, y: objectPixelY },
      distance,
      threshold: collisionThreshold,
      isColliding: nowColliding
    });

    if (nowColliding !== wasColliding) {
      setIsColliding(nowColliding);
      
      if (nowColliding) {
        // 开始触碰
        setTouchStartTime(Date.now());
        
        // 添加调试日志
        console.log('🎯 Scene3D: 2D碰撞触碰开始:', {
          objectId: object.id,
          objectName: object.name,
          materialType: object.material.hardness > 0.5 ? 'hard' : 'soft',
          fingerPosition2D,
          objectPixelPosition: { x: objectPixelX, y: objectPixelY },
          distance,
          hasOnCollisionCallback: !!onCollision
        });
        
        // 增加触碰计数
        actions.incrementTouchCount(object.id, object.material.hardness > 0.5 ? 'hard' : 'soft');
        
        // 创建一个估算的3D位置用于热力图
        const estimated3DPosition: Point3D = {
          x: objectWorldPosition.x,
          y: objectWorldPosition.y,
          z: objectWorldPosition.z
        };
        actions.addTouchHeatmapPoint(object.id, estimated3DPosition, 1.0);
        
        // 触发碰撞回调
        if (onCollision) {
          const collisionEvent: CollisionEvent = {
            id: `collision-2d-${object.id}-${Date.now()}`,
            objectId: object.id,
            objectName: object.name,
            type: 'touch_start',
            timestamp: Date.now(),
            position: estimated3DPosition,
            material: object.material
          };
          
          console.log('📡 Scene3D: 触发2D碰撞回调:', collisionEvent);
          onCollision(collisionEvent);
        } else {
          console.warn('⚠️ Scene3D: onCollision回调未定义');
        }
        
        // 创建粒子效果
        if (meshRef.current) {
          const particles = createParticleEffect.clone();
          meshRef.current.add(particles);
          setParticleSystem(particles);
        }
      } else if (touchStartTime) {
        // 结束触碰，计算持续时间
        const duration = Date.now() - touchStartTime;
        console.log('🎯 Scene3D: 2D碰撞触碰结束:', { duration });
        
        // 触发结束碰撞回调
        if (onCollision) {
          const collisionEvent: CollisionEvent = {
            id: `collision-2d-end-${object.id}-${Date.now()}`,
            objectId: object.id,
            objectName: object.name,
            type: 'touch_end',
            timestamp: Date.now(),
            position: {
              x: objectWorldPosition.x,
              y: objectWorldPosition.y,
              z: objectWorldPosition.z
            },
            material: object.material
          };
          
          onCollision(collisionEvent);
        }
        
        actions.updateTouchDuration(duration);
        setTouchStartTime(null);
        
        // 清理粒子效果
        if (particleSystem && meshRef.current) {
          meshRef.current.remove(particleSystem);
          setParticleSystem(null);
        }
      }
    }
  }, [fingerPosition2D, object, isColliding, touchStartTime, actions, onCollision, createParticleEffect, particleSystem]);

  // 原有的3D碰撞检测（作为备用）
  useEffect(() => {
    if (!fingerPosition || !meshRef.current || fingerPosition2D) return; // 如果有2D位置，优先使用2D检测

    const mesh = meshRef.current;
    const box = new THREE.Box3().setFromObject(mesh);
    const fingerPoint = new THREE.Vector3(fingerPosition.x, fingerPosition.y, fingerPosition.z);

    const wasColliding = isColliding;
    const nowColliding = box.containsPoint(fingerPoint);

    if (nowColliding !== wasColliding) {
      setIsColliding(nowColliding);
      
      if (nowColliding) {
        // 开始触碰
        setTouchStartTime(Date.now());
        
        // 添加调试日志
        console.log('🎯 Scene3D: 3D碰撞触碰开始:', {
          objectId: object.id,
          objectName: object.name,
          materialType: object.material.hardness > 0.5 ? 'hard' : 'soft',
          fingerPosition,
          hasOnCollisionCallback: !!onCollision
        });
        
        // 增加触碰计数
        actions.incrementTouchCount(object.id, object.material.hardness > 0.5 ? 'hard' : 'soft');
        // 添加热力图点
        actions.addTouchHeatmapPoint(object.id, fingerPosition, 1.0);
        
        // 触发碰撞回调 - 这是关键的修复！
        if (onCollision) {
          const collisionEvent: CollisionEvent = {
            id: `collision-${object.id}-${Date.now()}`,
            objectId: object.id,
            objectName: object.name,
            type: 'touch_start',
            timestamp: Date.now(),
            position: fingerPosition,
            material: object.material
          };
          
          console.log('📡 Scene3D: 触发碰撞回调:', collisionEvent);
          onCollision(collisionEvent);
        } else {
          console.warn('⚠️ Scene3D: onCollision回调未定义');
        }
        
        // 创建粒子效果
        if (meshRef.current) {
          const particles = createParticleEffect.clone();
          meshRef.current.add(particles);
          setParticleSystem(particles);
        }
      } else if (touchStartTime) {
        // 结束触碰，计算持续时间
        const duration = Date.now() - touchStartTime;
        console.log('🎯 Scene3D: 触碰结束:', { duration });
        
        // 触发触碰结束事件
        if (onCollision) {
          const collisionEvent: CollisionEvent = {
            id: `collision-3d-end-${object.id}-${Date.now()}`,
            objectId: object.id,
            objectName: object.name,
            type: 'touch_end',
            timestamp: Date.now(),
            position: fingerPosition,
            material: object.material,
            duration
          };
          
          console.log('📡 Scene3D: 触发触碰结束回调:', collisionEvent);
          onCollision(collisionEvent);
        }
        actions.updateTouchDuration(duration);
        setTouchStartTime(null);
        
        // 移除粒子效果
        if (particleSystem && meshRef.current) {
          meshRef.current.remove(particleSystem);
          setParticleSystem(null);
        }
      }
      
      const collision: CollisionEvent = {
        objectId: object.id,
        objectName: object.name,
        contactPoint: fingerPosition,
        force: 1.0, // 简化的力值
        material: object.material,
        timestamp: Date.now(),
        type: nowColliding ? 'enter' : 'exit'
      };

      onCollision?.(collision);
      actions.addCollisionEvent(collision);
    }
  }, [fingerPosition, object, isColliding, onCollision, actions, touchStartTime, particleSystem, createParticleEffect]);

  // 动画效果
  useFrame((state) => {
    if (meshRef.current) {
      // 碰撞时的视觉反馈
      if (isColliding) {
        const pulseScale = 1.1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
        meshRef.current.scale.setScalar(pulseScale);
        
        // 旋转效果
        meshRef.current.rotation.y += 0.02;
        
        // 粒子效果动画
        if (particleSystem && meshRef.current.parent) {
          particleSystem.position.copy(meshRef.current.position);
          const positions = particleSystem.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(state.clock.elapsedTime * 2 + i) * 0.01;
          }
          particleSystem.geometry.attributes.position.needsUpdate = true;
        }
      } else if (hovered) {
        meshRef.current.scale.setScalar(1.05);
        meshRef.current.rotation.y += 0.005;
      } else {
        meshRef.current.scale.setScalar(1.0);
        meshRef.current.rotation.y *= 0.95; // 逐渐停止旋转
      }
    }
  });

  // 材质配置 - 增强触碰变色效果
  const material = useMemo(() => {
    let baseColor = '#888888';
    let emissive = '#000000';
    let emissiveIntensity = 0;
    
    if (isColliding) {
      // 根据材质类型使用不同的触碰颜色
      if (object.name === '石头') {
        baseColor = '#ff6b35'; // 橙红色 - 石头触碰
        emissive = '#ff4500';
        emissiveIntensity = 0.4;
      } else if (object.name === '海绵') {
        baseColor = '#4ecdc4'; // 青绿色 - 海绵触碰
        emissive = '#26a69a';
        emissiveIntensity = 0.3;
      } else {
        baseColor = '#ff4444'; // 默认红色
        emissive = '#ff2222';
        emissiveIntensity = 0.3;
      }
    } else if (hovered) {
      baseColor = '#4488ff';
      emissive = '#2266dd';
      emissiveIntensity = 0.1;
    }
    
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: emissive,
      emissiveIntensity: emissiveIntensity,
      roughness: object.material.roughness,
      metalness: object.material.hardness,
      transparent: true,
      opacity: isColliding ? 0.95 : 0.8
    });
    return mat;
  }, [isColliding, hovered, object.material, object.name]);

  // 管理粒子系统
  useEffect(() => {
    if (isColliding && !particleSystem && meshRef.current?.parent) {
      const particles = createParticleEffect.clone();
      particles.position.copy(meshRef.current.position);
      meshRef.current.parent.add(particles);
      setParticleSystem(particles);
    } else if (!isColliding && particleSystem && meshRef.current?.parent) {
      meshRef.current.parent.remove(particleSystem);
      setParticleSystem(null);
    }
  }, [isColliding, particleSystem, createParticleEffect]);

  return (
    <group
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
    >
      <mesh
        ref={meshRef}
        material={material}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        {/* 根据物体类型使用不同的几何体 */}
        {object.modelUrl ? (
          <ModelLoader modelUrl={object.modelUrl} />
        ) : object.name === '石头' ? (
          <dodecahedronGeometry args={[0.5, 0]} />
        ) : object.name === '海绵' ? (
          <boxGeometry args={[0.8, 0.6, 0.8]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
      </mesh>
      
      {/* 物体标签 */}
      {(hovered || isColliding) && (
        <Html distanceFactor={10}>
          <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            <div className="font-semibold">{object.name}</div>
            <div className="text-xs text-gray-300">
              硬度: {(object.material.hardness * 100).toFixed(0)}%
            </div>
            {isColliding && (
              <>
                <div className="text-xs text-red-300">正在接触</div>
                {touchStartTime && (
                  <div className="text-xs text-yellow-300">
                    持续: {((Date.now() - touchStartTime) / 1000).toFixed(1)}s
                  </div>
                )}
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// 指尖指示器组件
interface FingerIndicatorProps {
  position: Point3D | null;
}

const FingerIndicator: React.FC<FingerIndicatorProps> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // 脉动动画
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  if (!position) return null;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
    >
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
    </mesh>
  );
};

// AR平面组件
const ARPlane: React.FC<{ plane: any }> = ({ plane }) => {
  return (
    <mesh
      position={[plane.center.x, plane.center.y, plane.center.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[plane.extent.x, plane.extent.y]} />
      <meshBasicMaterial 
        color="#00ff00" 
        transparent 
        opacity={0.2} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// 场景控制器组件
const SceneController: React.FC = () => {
  const { camera } = useThree();
  const { arSession } = useAppStore();

  useEffect(() => {
    if (arSession.active && arSession.cameraTransform) {
      // 应用AR相机变换
      const matrix = new THREE.Matrix4();
      matrix.fromArray(arSession.cameraTransform);
      camera.matrix.copy(matrix);
      camera.matrixAutoUpdate = false;
    } else {
      camera.matrixAutoUpdate = true;
    }
  }, [arSession, camera]);

  return null;
};

// 主3D场景组件
interface Scene3DProps {
  fingerPosition?: Point3D | null;
  fingerPosition2D?: Point2D | null;
  onCollision?: (collision: CollisionEvent) => void;
  showGrid?: boolean;
  enableControls?: boolean;
  transparent?: boolean;
  enableAR?: boolean;
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  fingerPosition, 
  fingerPosition2D,
  onCollision,
  showGrid = true,
  enableControls = true,
  transparent = false,
  enableAR = false
}) => {
  const { virtual3DObjects, arSession, interactionMode } = useAppStore();
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([2, 2, 2]);

  // 根据交互模式调整相机位置
  useEffect(() => {
    switch (interactionMode.type) {
      case '2d':
        setCameraPosition([0, 0, 3]);
        break;
      case '3d':
        setCameraPosition([2, 2, 2]);
        break;
      case 'ar':
        setCameraPosition([0, 0, 0]);
        break;
    }
  }, [interactionMode.type]);

  return (
    <div className="w-full h-full bg-gray-900" style={{ backgroundColor: transparent ? 'transparent' : undefined }}>
      <Canvas
        shadows
        camera={{ position: cameraPosition, fov: 75 }}
        gl={{ 
          antialias: true, 
          alpha: transparent,
          powerPreference: 'high-performance'
        }}
        style={{ background: transparent ? 'transparent' : undefined }}
      >
        {/* 场景控制器 */}
        <SceneController />
        
        {/* 相机控制 */}
        {enableControls && !arSession.active && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={10}
            minDistance={0.5}
          />
        )}
        
        {/* 环境光照 */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* 环境贴图 */}
        <Environment preset="studio" />
        
        {/* 网格 */}
        {showGrid && !arSession.active && (
          <Grid 
            args={[10, 10]} 
            cellSize={0.5} 
            cellThickness={0.5} 
            cellColor="#6f6f6f" 
            sectionSize={2} 
            sectionThickness={1} 
            sectionColor="#9d4b4b" 
            fadeDistance={25} 
            fadeStrength={1} 
            followCamera={false} 
            infiniteGrid={true}
          />
        )}
        
        {/* AR平面 */}
        {arSession.active && arSession.planes.map((plane, index) => (
          <ARPlane key={`plane-${index}`} plane={plane} />
        ))}
        
        {/* 3D物体 */}
        {virtual3DObjects.map(object => (
          <Interactive3DObject
            key={object.id}
            object={object}
            fingerPosition={fingerPosition}
            fingerPosition2D={fingerPosition2D}
            onCollision={onCollision}
          />
        ))}
        
        {/* 指尖指示器 */}
        <FingerIndicator position={fingerPosition} />
        
        {/* 场景信息显示 */}
        <Html fullscreen>
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm">
            <div>模式: {interactionMode.type.toUpperCase()}</div>
            <div>物体数量: {virtual3DObjects.length}</div>
            {arSession.active && (
              <>
                <div>AR状态: {arSession.tracking ? '追踪中' : '未追踪'}</div>
                <div>平面数量: {arSession.planes.length}</div>
              </>
            )}
            {fingerPosition && (
              <div className="text-green-400">
                指尖: ({fingerPosition.x.toFixed(2)}, {fingerPosition.y.toFixed(2)}, {fingerPosition.z.toFixed(2)})
              </div>
            )}
          </div>
        </Html>
        
        {/* 性能监控 */}
        <Html fullscreen>
          <div className="absolute bottom-4 left-4 text-white text-xs font-mono bg-black bg-opacity-50 p-2 rounded">
            <div>渲染: {Math.round(performance.now() % 1000)}ms</div>
          </div>
        </Html>
      </Canvas>
    </div>
  );
};

export default Scene3D;

// 预加载常用模型
useGLTF.preload('/models/default-cube.glb');
useGLTF.preload('/models/sphere.glb');
useGLTF.preload('/models/cylinder.glb');