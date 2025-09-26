# 指套触感反馈系统部署脚本 (Windows PowerShell)
# 使用方法: .\deploy.ps1 [环境] [选项]
# 环境: local, staging, production
# 选项: -BuildOnly, -NoCache, -Help

param(
    [string]$Environment = "local",
    [switch]$BuildOnly = $false,
    [switch]$NoCache = $false,
    [switch]$Help = $false
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 配置
$DockerImageName = "finger-haptic-feedback"
$DockerTag = "latest"

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { $Colors.Blue }
        "SUCCESS" { $Colors.Green }
        "WARNING" { $Colors.Yellow }
        "ERROR" { $Colors.Red }
        default { $Colors.White }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# 显示帮助信息
function Show-Help {
    Write-Host "指套触感反馈系统部署脚本 (Windows PowerShell)" -ForegroundColor Green
    Write-Host ""
    Write-Host "使用方法: .\deploy.ps1 [环境] [选项]" -ForegroundColor White
    Write-Host ""
    Write-Host "环境:" -ForegroundColor Yellow
    Write-Host "  local      - 本地开发环境 (默认)" -ForegroundColor White
    Write-Host "  staging    - 测试环境" -ForegroundColor White
    Write-Host "  production - 生产环境" -ForegroundColor White
    Write-Host ""
    Write-Host "选项:" -ForegroundColor Yellow
    Write-Host "  -BuildOnly - 仅构建Docker镜像，不启动服务" -ForegroundColor White
    Write-Host "  -NoCache   - 构建时不使用缓存" -ForegroundColor White
    Write-Host "  -Help      - 显示此帮助信息" -ForegroundColor White
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 local" -ForegroundColor White
    Write-Host "  .\deploy.ps1 local -BuildOnly" -ForegroundColor White
    Write-Host "  .\deploy.ps1 production -NoCache" -ForegroundColor White
}

# 检查依赖
function Test-Dependencies {
    Write-Log "检查系统依赖..." "INFO"
    
    # 检查Docker
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            throw "Docker 未安装或不在PATH中"
        }
        Write-Log "Docker版本: $dockerVersion" "INFO"
    }
    catch {
        Write-Log "Docker 未安装或不在PATH中" "ERROR"
        exit 1
    }
    
    # 检查Docker Compose
    try {
        $composeVersion = docker compose version 2>$null
        if (-not $composeVersion) {
            throw "Docker Compose 未安装或不在PATH中"
        }
        Write-Log "Docker Compose版本: $composeVersion" "INFO"
    }
    catch {
        Write-Log "Docker Compose 未安装或不在PATH中" "ERROR"
        exit 1
    }
}

# 构建Docker镜像
function Build-DockerImage {
    Write-Log "构建Docker镜像..." "INFO"
    
    $buildArgs = @("build", "-t", "${DockerImageName}:${DockerTag}")
    
    if ($NoCache) {
        $buildArgs += "--no-cache"
        Write-Log "使用 --no-cache 选项" "INFO"
    }
    
    $buildArgs += "."
    
    Write-Log "执行命令: docker $($buildArgs -join ' ')" "INFO"
    
    try {
        & docker @buildArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Docker构建失败"
        }
        Write-Log "Docker镜像构建成功" "SUCCESS"
    }
    catch {
        Write-Log "Docker镜像构建失败: $_" "ERROR"
        exit 1
    }
}

# 部署到本地环境
function Deploy-Local {
    Write-Log "部署到本地环境..." "INFO"
    
    if (-not $BuildOnly) {
        # 停止现有容器
        Write-Log "停止现有容器..." "INFO"
        docker compose down 2>$null
        
        # 启动服务
        Write-Log "启动服务..." "INFO"
        try {
            docker compose up -d
            if ($LASTEXITCODE -ne 0) {
                throw "Docker Compose启动失败"
            }
            
            Write-Log "等待服务启动..." "INFO"
            Start-Sleep -Seconds 5
            
            # 检查服务状态
            $containerStatus = docker compose ps --format json | ConvertFrom-Json
            if ($containerStatus) {
                Write-Log "服务启动成功" "SUCCESS"
                Write-Log "应用地址: http://localhost:8080" "SUCCESS"
                Write-Log "健康检查: http://localhost:8080/health" "INFO"
            } else {
                Write-Log "服务启动可能失败，请检查日志" "WARNING"
            }
        }
        catch {
            Write-Log "服务启动失败: $_" "ERROR"
            Write-Log "查看日志: docker compose logs" "INFO"
            exit 1
        }
    }
}

# 部署到测试环境
function Deploy-Staging {
    Write-Log "部署到测试环境..." "INFO"
    Write-Log "测试环境部署功能待实现" "WARNING"
    # TODO: 实现测试环境部署逻辑
}

# 部署到生产环境
function Deploy-Production {
    Write-Log "部署到生产环境..." "INFO"
    Write-Log "生产环境部署功能待实现" "WARNING"
    # TODO: 实现生产环境部署逻辑
}

# 显示部署信息
function Show-DeploymentInfo {
    Write-Log "部署信息:" "INFO"
    Write-Host "  环境: $Environment" -ForegroundColor White
    Write-Host "  镜像: ${DockerImageName}:${DockerTag}" -ForegroundColor White
    Write-Host "  仅构建: $BuildOnly" -ForegroundColor White
    Write-Host "  无缓存: $NoCache" -ForegroundColor White
}

# 主函数
function Main {
    Write-Log "开始部署指套触感反馈系统..." "INFO"
    
    # 显示帮助
    if ($Help) {
        Show-Help
        return
    }
    
    # 检查依赖
    Test-Dependencies
    
    # 构建镜像
    Build-DockerImage
    
    # 根据环境部署
    switch ($Environment.ToLower()) {
        "local" {
            Deploy-Local
        }
        "staging" {
            Deploy-Staging
        }
        "production" {
            Deploy-Production
        }
        default {
            Write-Log "未知环境: $Environment" "ERROR"
            Write-Log "支持的环境: local, staging, production" "INFO"
            exit 1
        }
    }
    
    Show-DeploymentInfo
    Write-Log "部署完成!" "SUCCESS"
}

# 执行主函数
Main