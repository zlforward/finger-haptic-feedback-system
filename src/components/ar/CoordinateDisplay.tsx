import React from 'react';
import type { Point2D, Point3D } from '../../types';

interface CoordinateDisplayProps {
  fingerPosition2D?: Point2D | null;
  objectCoordinates?: {
    world3D: Point3D;
    screen2D: Point2D;
  } | null;
  pixelDistance?: number | null;
  objectName?: string;
}

const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  fingerPosition2D,
  objectCoordinates,
  pixelDistance,
  objectName
}) => {
  if (!fingerPosition2D && !objectCoordinates) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm font-mono z-50 min-w-[280px]">
      <div className="text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2">
        坐标信息面板
      </div>
      
      {/* 指尖坐标显示 */}
      {fingerPosition2D && (
        <div className="mb-3">
          <div className="text-yellow-300 font-semibold mb-1">🖐️ 指尖位置</div>
          <div className="text-yellow-200 ml-2">
            2D坐标: ({fingerPosition2D.x.toFixed(0)}, {fingerPosition2D.y.toFixed(0)}) px
          </div>
        </div>
      )}

      {/* 物体坐标显示 */}
      {objectCoordinates && (
        <div className="mb-3">
          <div className="text-blue-300 font-semibold mb-1">
            📦 {objectName || '3D物体'}
          </div>
          <div className="text-blue-200 ml-2 mb-1">
            3D坐标: ({objectCoordinates.world3D.x.toFixed(2)}, {objectCoordinates.world3D.y.toFixed(2)}, {objectCoordinates.world3D.z.toFixed(2)})
          </div>
          <div className="text-green-200 ml-2">
            2D坐标: ({objectCoordinates.screen2D.x.toFixed(0)}, {objectCoordinates.screen2D.y.toFixed(0)}) px
          </div>
        </div>
      )}

      {/* 距离显示 */}
      {pixelDistance !== null && pixelDistance !== undefined && fingerPosition2D && objectCoordinates && (
        <div className="mb-3">
          <div className="text-red-300 font-semibold mb-1">📏 像素距离</div>
          <div className="text-red-200 ml-2">
            距离: {pixelDistance.toFixed(1)} px
          </div>
          <div className="text-gray-400 ml-2 text-xs mt-1">
            {pixelDistance < 50 ? '✅ 碰撞范围内' : '❌ 超出碰撞范围'}
          </div>
        </div>
      )}

      {/* 实时状态指示器 */}
      <div className="flex items-center justify-center mt-3 pt-2 border-t border-gray-600">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
        <span className="text-gray-300 text-xs">实时更新中</span>
      </div>
    </div>
  );
};

export default CoordinateDisplay;