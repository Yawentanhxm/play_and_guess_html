#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  你弹我猜 — 阿里云一键部署脚本
#  适用：Ubuntu 20.04/22.04 | CentOS 7/8 | 阿里云轻量应用服务器
#
#  用法：
#    chmod +x deploy.sh && sudo bash deploy.sh
#
#  可选环境变量（覆盖默认值）：
#    APP_PORT   游戏端口（默认 3000）
#    DOMAIN     绑定的域名（留空则只用 IP 访问）
#    APP_DIR    项目目录（默认当前目录）
# ═══════════════════════════════════════════════════════════════

set -e  # 遇到错误立即退出

# ── 配置（按需修改） ──────────────────────────────────────────
# 代码就在当前目录，无需 git clone
APP_DIR="${APP_DIR:-$(pwd)}"
APP_PORT="${APP_PORT:-3000}"
APP_NAME="yinle-game"
NODE_VERSION="20"   # Node.js 大版本号
DOMAIN="${DOMAIN:-}"  # 填入域名则自动配置 Nginx，留空跳过

# ── 颜色输出 ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━${NC}"; }

# ── 检测系统 ─────────────────────────────────────────────────
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    elif type lsb_release &>/dev/null; then
        OS=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
    else
        error "无法识别操作系统"
    fi
    info "操作系统: $OS"
}

# ── 安装 Node.js ─────────────────────────────────────────────
install_node() {
    step "安装 Node.js $NODE_VERSION"
    if command -v node &>/dev/null; then
        CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT" -ge "$NODE_VERSION" ]; then
            success "Node.js 已安装: $(node -v)，跳过"
            return
        fi
    fi

    # 使用 NodeSource 官方源（阿里云镜像加速）
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>/dev/null || \
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>/dev/null || \
    error "Node.js 安装源配置失败"

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y nodejs
    elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "aliyun" || "$OS" == "alinux" ]]; then
        yum install -y nodejs
    else
        error "不支持的系统: $OS"
    fi

    success "Node.js 安装完成: $(node -v)"
}

# ── 安装 git ─────────────────────────────────────────────────
install_git() {
    if command -v git &>/dev/null; then
        success "Git 已安装: $(git --version)"
        return
    fi
    step "安装 Git"
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get update -y && apt-get install -y git
    else
        yum install -y git
    fi
    success "Git 安装完成"
}

# ── 安装 PM2 ─────────────────────────────────────────────────
install_pm2() {
    step "安装 PM2"
    if command -v pm2 &>/dev/null; then
        success "PM2 已安装: $(pm2 -v)"
        return
    fi
    npm install -g pm2 --registry=https://registry.npmmirror.com
    success "PM2 安装完成: $(pm2 -v)"
}

# ── 安装 Nginx ────────────────────────────────────────────────
install_nginx() {
    if [ -z "$DOMAIN" ]; then
        info "未配置域名，跳过 Nginx 安装"
        return
    fi
    step "安装 Nginx"
    if command -v nginx &>/dev/null; then
        success "Nginx 已安装，跳过"
        return
    fi
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y nginx
    else
        yum install -y nginx
    fi
    systemctl enable nginx
    success "Nginx 安装完成"
}

# ── 安装依赖 ─────────────────────────────────────────────────
deploy_code() {
    step "安装 npm 依赖"
    cd "$APP_DIR"
    [ ! -f "package.json" ] && error "未在 $APP_DIR 找到 package.json，请确认在项目目录下运行"
    npm install --production --registry=https://registry.npmmirror.com
    success "依赖安装完成"
}

# ── 配置并启动 PM2 ────────────────────────────────────────────
start_app() {
    step "启动应用"
    cd "$APP_DIR"

    # 写入 ecosystem 配置
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'server.js',
    cwd: '${APP_DIR}',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/${APP_NAME}-error.log',
    out_file:   '/var/log/${APP_NAME}-out.log',
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
EOF

    # 停止旧实例（若存在）
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # 启动
    pm2 start ecosystem.config.js
    pm2 save

    # 设置开机自启
    pm2 startup | tail -1 | bash 2>/dev/null || \
        warn "开机自启配置需手动执行 pm2 startup 输出的命令"

    success "应用启动成功，端口: $APP_PORT"
}

# ── 配置 Nginx 反向代理 ───────────────────────────────────────
configure_nginx() {
    if [ -z "$DOMAIN" ]; then return; fi
    step "配置 Nginx 反向代理 → $DOMAIN"

    cat > /etc/nginx/conf.d/${APP_NAME}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # 静态文件缓存
    location ~* \.(css|js|mid|json|png|jpg|gif|ico|woff2?)$ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_cache_bypass \$http_upgrade;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        # WebSocket 支持（多人房间必须）
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

    nginx -t && systemctl reload nginx
    success "Nginx 配置完成：http://$DOMAIN"
}

# ── 配置系统防火墙 ────────────────────────────────────────────
configure_firewall() {
    step "配置防火墙"
    if command -v ufw &>/dev/null; then
        ufw allow "$APP_PORT"/tcp 2>/dev/null && success "ufw: 开放端口 $APP_PORT"
        ufw allow 80/tcp 2>/dev/null
        ufw allow 22/tcp 2>/dev/null
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-port="${APP_PORT}/tcp" 2>/dev/null && \
        firewall-cmd --permanent --add-service=http 2>/dev/null && \
        firewall-cmd --reload 2>/dev/null && success "firewalld: 开放端口 $APP_PORT"
    else
        warn "未检测到 ufw/firewalld，请手动在阿里云控制台安全组开放端口 $APP_PORT"
    fi
    info "⚠️  请确认阿里云控制台「安全组」已开放端口 $APP_PORT（TCP 入方向）"
}

# ── 打印访问信息 ──────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       🎹 部署完成！                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"

    # 获取公网 IP
    PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
                curl -s --max-time 5 api.ipify.org 2>/dev/null || echo "获取失败")

    echo ""
    echo -e "  📍 IP 访问:    ${CYAN}http://${PUBLIC_IP}:${APP_PORT}${NC}"
    if [ -n "$DOMAIN" ]; then
    echo -e "  🌐 域名访问:   ${CYAN}http://${DOMAIN}${NC}"
    fi
    echo ""
    echo -e "  📋 常用命令:"
    echo -e "     查看状态:   ${YELLOW}pm2 status${NC}"
    echo -e "     查看日志:   ${YELLOW}pm2 logs ${APP_NAME}${NC}"
    echo -e "     重启应用:   ${YELLOW}pm2 restart ${APP_NAME}${NC}"
    echo -e "     更新代码:   ${YELLOW}cd ${APP_DIR} && git pull && pm2 restart ${APP_NAME}${NC}"
    echo ""
    echo -e "  ⚠️  别忘了在阿里云控制台「安全组」开放端口 ${YELLOW}${APP_PORT}${NC}"
    echo ""
}

# ── 主流程 ────────────────────────────────────────────────────
main() {
    echo -e "${BOLD}"
    echo "  ╔════════════════════════════════════╗"
    echo "  ║   🎹 你弹我猜 — 一键部署脚本      ║"
    echo "  ╚════════════════════════════════════╝"
    echo -e "${NC}"

    [ "$(id -u)" -ne 0 ] && error "请用 root 或 sudo 运行此脚本"

    detect_os
    install_git
    install_node
    install_pm2
    install_nginx
    deploy_code
    start_app
    configure_nginx
    configure_firewall
    print_summary
}

main "$@"
