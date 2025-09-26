#!/bin/bash

# 指套触感反馈系统部署脚本
# 使用方法: ./deploy.sh [环境] [选项]
# 环境: local, staging, production
# 选项: --build-only, --no-cache, --help

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
ENVIRONMENT=${1:-local}
BUILD_ONLY=false
NO_CACHE=false
DOCKER_IMAGE_NAME="finger-haptic-feedback"
DOCKER_TAG="latest"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --help)
            echo "指套触感反馈系统部署脚本"
            echo ""
            echo "使用方法: $0 [环境] [选项]"
            echo ""
            echo "环境:"
            echo "  local      本地开发环境 (默认)"
            echo "  staging    测试环境"
            echo "  production 生产环境"
            echo ""
            echo "选项:"
            echo "  --build-only  仅构建，不启动服务"
            echo "  --no-cache    不使用Docker缓存"
            echo "  --help        显示此帮助信息"
            exit 0
            ;;
        *)
            ENVIRONMENT=$1
            shift
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在PATH中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装或不在PATH中"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 构建Docker镜像
build_image() {
    log_info "构建Docker镜像..."
    
    local build_args=""
    if [ "$NO_CACHE" = true ]; then
        build_args="--no-cache"
    fi
    
    docker build $build_args -t ${DOCKER_IMAGE_NAME}:${DOCKER_TAG} .
    
    if [ $? -eq 0 ]; then
        log_success "Docker镜像构建完成"
    else
        log_error "Docker镜像构建失败"
        exit 1
    fi
}

# 部署到本地环境
deploy_local() {
    log_info "部署到本地环境..."
    
    # 停止现有容器
    docker-compose down 2>/dev/null || true
    
    # 启动服务
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_success "本地部署完成"
        log_info "应用访问地址: http://localhost:8080"
        log_info "健康检查: http://localhost:8080/health"
    else
        log_error "本地部署失败"
        exit 1
    fi
}

# 部署到测试环境
deploy_staging() {
    log_info "部署到测试环境..."
    log_warning "测试环境部署功能待实现"
    # TODO: 实现测试环境部署逻辑
}

# 部署到生产环境
deploy_production() {
    log_info "部署到生产环境..."
    log_warning "生产环境部署功能待实现"
    # TODO: 实现生产环境部署逻辑
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo "  环境: $ENVIRONMENT"
    echo "  镜像: ${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
    echo "  构建时间: $(date)"
    
    if [ "$ENVIRONMENT" = "local" ]; then
        echo "  访问地址: http://localhost:8080"
        echo "  健康检查: http://localhost:8080/health"
    fi
}

# 主函数
main() {
    log_info "开始部署指套触感反馈系统..."
    log_info "目标环境: $ENVIRONMENT"
    
    check_dependencies
    build_image
    
    if [ "$BUILD_ONLY" = true ]; then
        log_success "仅构建模式，跳过部署"
        show_deployment_info
        exit 0
    fi
    
    case $ENVIRONMENT in
        local)
            deploy_local
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            log_error "未知环境: $ENVIRONMENT"
            log_info "支持的环境: local, staging, production"
            exit 1
            ;;
    esac
    
    show_deployment_info
    log_success "部署完成!"
}

# 执行主函数
main