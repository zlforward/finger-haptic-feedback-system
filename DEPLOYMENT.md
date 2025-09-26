# 指套触感反馈系统部署指南

## 概述

本文档提供了指套触感反馈系统的完整部署指南，包括本地开发、测试环境和生产环境的部署方法。

## 系统要求

### 最低要求
- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **内存**: 4GB RAM (推荐 8GB+)
- **存储**: 2GB 可用空间
- **网络**: 稳定的互联网连接

### 软件依赖
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (仅开发环境)
- **pnpm**: 8+ (仅开发环境)

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd finger-haptic-feedback-system
```

### 2. 使用Docker部署 (推荐)

#### Windows用户
```powershell
# 部署到本地环境
.\deploy.ps1 local

# 仅构建不启动
.\deploy.ps1 local -BuildOnly

# 不使用缓存构建
.\deploy.ps1 local -NoCache
```

#### Linux/macOS用户
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 部署到本地环境
./deploy.sh local

# 仅构建不启动
./deploy.sh local --build-only

# 不使用缓存构建
./deploy.sh local --no-cache
```

### 3. 手动Docker部署
```bash
# 构建镜像
docker build -t finger-haptic-feedback:latest .

# 使用Docker Compose启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 访问应用
- **应用地址**: http://localhost:8080
- **健康检查**: http://localhost:8080/health

## 开发环境部署

### 1. 安装依赖
```bash
# 安装pnpm (如果未安装)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 启动开发服务器
```bash
# 开发模式
pnpm dev

# 生产模式预览
pnpm build:prod
pnpm serve
```

### 3. 开发环境配置
- 开发服务器端口: 3000
- 生产预览端口: 4173
- 热重载: 已启用
- TypeScript检查: 已启用

## 生产环境部署

### Docker部署 (推荐)

#### 1. 准备环境
```bash
# 创建生产环境目录
mkdir -p /opt/finger-haptic-app
cd /opt/finger-haptic-app

# 复制部署文件
cp docker-compose.yml .
cp nginx.conf .
```

#### 2. 环境变量配置
创建 `.env` 文件:
```env
# 应用配置
NODE_ENV=production
PORT=80

# Docker配置
DOCKER_IMAGE=finger-haptic-feedback:latest
CONTAINER_NAME=finger-haptic-app

# 网络配置
EXTERNAL_PORT=80
INTERNAL_PORT=80
```

#### 3. 启动服务
```bash
# 拉取最新镜像
docker-compose pull

# 启动服务
docker-compose up -d

# 检查状态
docker-compose ps
docker-compose logs
```

### 传统部署

#### 1. 构建应用
```bash
# 安装依赖
pnpm install --frozen-lockfile

# 生产构建
pnpm run build:prod
```

#### 2. 配置Web服务器

##### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

##### Apache配置示例
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    <Directory /path/to/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # SPA路由支持
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## 环境配置

### 环境变量
| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `development` | 否 |
| `PORT` | 服务端口 | `3000` | 否 |
| `VITE_API_BASE_URL` | API基础URL | `/api` | 否 |

### 配置文件
- `vite.config.ts`: 开发环境配置
- `vite.config.prod.ts`: 生产环境配置
- `nginx.conf`: Nginx服务器配置
- `docker-compose.yml`: Docker编排配置

## 监控和维护

### 健康检查
```bash
# 检查应用状态
curl http://localhost:8080/health

# 检查Docker容器状态
docker-compose ps
docker stats finger-haptic-app
```

### 日志管理
```bash
# 查看应用日志
docker-compose logs -f finger-haptic-app

# 查看Nginx日志
docker exec finger-haptic-app tail -f /var/log/nginx/access.log
docker exec finger-haptic-app tail -f /var/log/nginx/error.log
```

### 性能监控
- **内存使用**: 建议不超过512MB
- **CPU使用**: 正常情况下 < 10%
- **响应时间**: 首屏加载 < 3秒
- **文件大小**: 总包大小 < 2MB

## 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存重新构建
docker system prune -f
docker-compose build --no-cache
```

#### 2. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :8080

# 修改端口配置
# 编辑 docker-compose.yml 中的端口映射
```

#### 3. 权限问题
```bash
# Linux/macOS 给脚本执行权限
chmod +x deploy.sh

# Windows PowerShell 执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 4. 内存不足
```bash
# 增加Docker内存限制
# 编辑 docker-compose.yml 添加:
# mem_limit: 1g
# memswap_limit: 1g
```

### 调试模式
```bash
# 启用调试模式
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up

# 查看详细日志
docker-compose logs --tail=100 -f
```

## 安全考虑

### 1. 网络安全
- 使用HTTPS (生产环境)
- 配置防火墙规则
- 限制不必要的端口访问

### 2. 容器安全
- 定期更新基础镜像
- 使用非root用户运行
- 扫描镜像漏洞

### 3. 数据安全
- 敏感配置使用环境变量
- 不在代码中硬编码密钥
- 定期备份重要数据

## 更新和升级

### 1. 应用更新
```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
./deploy.sh local --no-cache
```

### 2. 依赖更新
```bash
# 更新npm依赖
pnpm update

# 更新Docker镜像
docker-compose pull
docker-compose up -d
```

### 3. 系统升级
```bash
# 备份当前版本
docker-compose down
docker save finger-haptic-feedback:latest > backup.tar

# 升级系统
# ... 执行升级步骤 ...

# 恢复服务
docker-compose up -d
```

## 支持和联系

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的 Issues 页面
3. 联系开发团队获取支持

---

**注意**: 本文档会随着项目更新而持续维护，请确保使用最新版本的部署指南。