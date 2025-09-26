# 🚀 快速部署指南

指套触感反馈系统的快速部署指南。

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## ⚡ 一键部署

### Windows
```powershell
.\deploy.ps1 local
```

### Linux/macOS
```bash
chmod +x deploy.sh
./deploy.sh local
```

### 使用npm脚本
```bash
npm run deploy:local
```

## 🌐 访问应用

部署完成后，访问：
- **应用**: http://localhost:8080
- **健康检查**: http://localhost:8080/health

## 🛠️ 其他部署选项

```bash
# 仅构建，不启动
npm run deploy:build-only

# Docker命令
npm run docker:build      # 构建镜像
npm run docker:compose    # 启动服务
npm run docker:compose:down # 停止服务
```

## 📚 详细文档

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署文档。

## 🔧 故障排除

### 端口冲突
如果8080端口被占用，修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8081:80"  # 改为其他端口
```

### 权限问题 (Linux/macOS)
```bash
chmod +x deploy.sh
```

### 权限问题 (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📞 获取帮助

```bash
# Windows
.\deploy.ps1 -Help

# Linux/macOS  
./deploy.sh --help
```