# 指套触感反馈系统 - 部署指南

## 🚀 快速部署

### 本地部署

1. **构建生产版本**
   ```bash
   npm run build
   # 或使用优化版本
   npm run build:prod
   ```

2. **启动生产服务器**
   ```bash
   npm run serve
   # 或
   npm start
   ```

3. **访问应用**
   - 本地访问：http://localhost:3000
   - 网络访问：http://0.0.0.0:3000

### 生产环境部署

#### 使用 Docker

1. **创建 Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist ./dist
   COPY serve.cjs ./
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **构建和运行**
   ```bash
   docker build -t finger-haptic-system .
   docker run -p 3000:3000 finger-haptic-system
   ```

#### 使用 Nginx

1. **构建静态文件**
   ```bash
   npm run build:prod
   ```

2. **Nginx 配置示例**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/dist;
       index index.html;

       # 处理 SPA 路由
       location / {
           try_files $uri $uri/ /index.html;
       }

       # 设置正确的 MIME 类型
       location ~* \\.wasm$ {
           add_header Content-Type application/wasm;
       }

       location ~* \\.onnx$ {
           add_header Content-Type application/octet-stream;
       }

       location ~* \\.glb$ {
           add_header Content-Type model/gltf-binary;
       }

       # 启用 gzip 压缩
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm;
   }
   ```

## 📊 构建优化

### 包大小分析

当前构建输出：
- `index.html`: ~26KB (gzip: ~6.5KB)
- `index.css`: ~25KB (gzip: ~4.7KB)
- `index.js`: ~1.7MB (gzip: ~489KB)
- `ort-wasm-simd-threaded.wasm`: ~23MB (gzip: ~5.6MB)

### 优化建议

1. **代码分割**
   - 使用 `build:prod` 脚本进行优化构建
   - 大型依赖已分离到独立 chunks

2. **资源优化**
   - WASM 文件已启用 gzip 压缩
   - 生产环境移除了 console 和 debugger

3. **缓存策略**
   - 静态资源使用文件名哈希
   - 建议设置长期缓存头

## 🔧 环境变量

支持的环境变量：

```bash
# 服务器端口
PORT=3000

# 生产环境标识
NODE_ENV=production
```

## 📱 移动端部署

### PWA 支持

应用已配置为 PWA，支持：
- 离线访问
- 添加到主屏幕
- 推送通知（如需要）

### HTTPS 要求

以下功能需要 HTTPS 环境：
- 摄像头访问
- 蓝牙连接
- AR 功能
- PWA 安装

## 🛠️ 故障排除

### 常见问题

1. **WASM 加载失败**
   - 确保服务器正确设置 MIME 类型
   - 检查 CORS 配置

2. **摄像头无法访问**
   - 确保使用 HTTPS
   - 检查浏览器权限设置

3. **蓝牙连接失败**
   - 确保使用 HTTPS
   - 检查浏览器蓝牙支持

4. **模型加载缓慢**
   - 使用 CDN 加速
   - 启用 gzip 压缩

### 性能监控

建议监控以下指标：
- 首屏加载时间
- WASM 模块加载时间
- 检测延迟
- 触觉反馈延迟

## 📈 扩展部署

### 集群部署

```bash
# 使用 PM2 进行集群部署
npm install -g pm2
pm2 start serve.cjs --instances max --name finger-haptic
```

### 负载均衡

建议使用 Nginx 或云服务商的负载均衡器进行流量分发。

### CDN 配置

将静态资源部署到 CDN：
- `/assets/*` - JS/CSS 文件
- `/models/*` - ONNX/GLB 模型文件
- `/favicon.svg` - 图标文件