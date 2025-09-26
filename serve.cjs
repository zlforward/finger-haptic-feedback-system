const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'dist')));

// 设置正确的MIME类型
app.use((req, res, next) => {
  if (req.path.endsWith('.wasm')) {
    res.type('application/wasm');
  } else if (req.path.endsWith('.onnx')) {
    res.type('application/octet-stream');
  } else if (req.path.endsWith('.glb')) {
    res.type('model/gltf-binary');
  }
  next();
});

// 处理所有路由，返回index.html（用于SPA路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 指套触感反馈系统已启动`);
  console.log(`📱 本地访问地址: http://localhost:${PORT}`);
  console.log(`🌐 网络访问地址: http://0.0.0.0:${PORT}`);
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'dist')}`);
});