// 触碰统计面板组件
import React from 'react';
import { Activity, Target, Layers } from 'lucide-react';
import { useTouchStats, useVirtual3DObjects } from '../../stores/useAppStore';

const TouchStatsPanel: React.FC = () => {
  const touchStats = useTouchStats();
  const virtual3DObjects = useVirtual3DObjects();
  
  // 添加调试日志
  console.log('TouchStatsPanel 渲染:', {
    totalTouches: touchStats.totalTouches,
    sessionDuration: touchStats.sessionDuration,
    averageTouchDuration: touchStats.averageTouchDuration,
    lastTouchTime: touchStats.lastTouchTime,
    touchesByObject: touchStats.touchesByObject,
    touchesByMaterial: touchStats.touchesByMaterial
  });

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">触碰统计</h3>
      </div>
      
      {/* 总体统计 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{touchStats.totalTouches}</div>
          <div className="text-sm text-gray-600">总触碰次数</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-lg font-semibold text-green-600">
            {formatDuration(touchStats.sessionDuration)}
          </div>
          <div className="text-sm text-gray-600">会话时长</div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-lg font-semibold text-purple-600">
            {formatDuration(touchStats.averageTouchDuration)}
          </div>
          <div className="text-sm text-gray-600">平均触碰时长</div>
        </div>
        
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-sm font-medium text-orange-600">
            {touchStats.lastTouchTime ? formatTime(touchStats.lastTouchTime) : '无'}
          </div>
          <div className="text-sm text-gray-600">最后触碰</div>
        </div>
      </div>
      
      {/* 按物体分类的触碰统计 */}
      {Object.keys(touchStats.touchesByObject).length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-1" />
            按物体统计
          </h4>
          <div className="space-y-2">
            {Object.entries(touchStats.touchesByObject).map(([objectId, count]) => {
              const object = virtual3DObjects.find(obj => obj.id === objectId);
              return (
                <div key={objectId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm font-medium">{object?.name || `物体 ${objectId}`}</span>
                  <span className="text-sm text-blue-600 font-semibold">{count} 次</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 按材质分类的触碰统计 */}
      {Object.keys(touchStats.touchesByMaterial).length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-2 flex items-center">
            <Layers className="w-4 h-4 mr-1" />
            按材质统计
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(touchStats.touchesByMaterial).map(([material, count]) => (
              <div key={material} className="bg-gray-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-600 capitalize">{material === 'hard' ? '硬质' : '软质'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TouchStatsPanel;