# KidsAcademy — Rocky 9 VPS 部署指南

## 1. 系统准备

```bash
# 更新系统
sudo dnf update -y

# 安装基础工具
sudo dnf install -y git curl wget nano
```

## 2. 安装 Node.js (nvm)

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 重新加载 shell
source ~/.bashrc

# 安装 Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# 验证
node -v   # 应输出 v20.x.x
npm -v
```

## 3. 安装 PM2

```bash
npm install -g pm2
```

## 4. 部署项目

```bash
# 创建项目目录
sudo mkdir -p /var/www/kids-academy
sudo chown $USER:$USER /var/www/kids-academy

# 创建日志目录
sudo mkdir -p /var/log/kids-academy
sudo chown $USER:$USER /var/log/kids-academy

# 克隆代码（替换为你的 Git 仓库地址）
cd /var/www
git clone https://github.com/your-username/KidsAcademy.git kids-academy
# 如果代码在子目录中：
# cd kids-academy && mv kids_academy/* . && mv kids_academy/.* . 2>/dev/null

cd /var/www/kids-academy

# 安装依赖
npm install

# 构建前端
npm run build
```

## 5. 配置环境变量

```bash
cd /var/www/kids-academy

# 创建 .env 文件
cp .env.example .env

# 编辑配置
nano .env
```

**必须修改的配置：**

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=这里替换为一个强随机字符串
APP_URL=https://你的域名.com
```

> 💡 生成安全的 JWT_SECRET：
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

## 6. 使用 PM2 启动应用

```bash
cd /var/www/kids-academy

# 启动应用
pm2 start ecosystem.config.cjs

# 查看运行状态
pm2 status

# 查看日志
pm2 logs kids-academy

# 设置开机自启
pm2 startup
# 执行它输出的 sudo 命令
pm2 save
```

## 7. 安装并配置 Nginx

```bash
# 安装 Nginx
sudo dnf install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/conf.d/kids-academy.conf
```

写入以下内容（**将 `yourdomain.com` 替换为你的实际域名**）：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 上传文件大小限制
    client_max_body_size 50M;

    # 静态文件上传目录（直接由 Nginx 提供，性能更好）
    location /uploads/ {
        alias /var/www/kids-academy/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 前端静态资源（Vite 构建的带哈希文件名，可以长期缓存）
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 所有其他请求转发到 Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 测试配置语法
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

## 8. 配置防火墙 (firewalld)

```bash
# 开放 HTTP 和 HTTPS 端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 重载防火墙
sudo firewall-cmd --reload

# 验证
sudo firewall-cmd --list-all
```

> ⚠️ **不要** 对外开放 3000 端口，所有流量应通过 Nginx 代理。

## 9. 配置 SSL 证书 (Let's Encrypt)

```bash
# 安装 certbot
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx

# 申请证书（替换域名）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

certbot 会自动修改 Nginx 配置，添加 SSL 相关设置和自动 HTTP→HTTPS 跳转。

## 10. SELinux 配置（Rocky 9 默认启用）

```bash
# 允许 Nginx 连接到 Node.js 后端
sudo setsebool -P httpd_can_network_connect 1
```

## 11. 后续更新部署

> ⚠️ **重要：** 更新时请勿重新 `git clone`，否则会产生一个新的空数据库文件。应始终用 `git pull` 原地更新代码。

每次代码更新后，在 VPS 上执行以下步骤：

### 推荐：使用安全更新脚本（保留数据库和上传文件）

首次创建脚本：

```bash
nano /var/www/kids-academy/deploy.sh
```

写入以下内容：

```bash
#!/bin/bash
set -e  # 任何步骤失败时立即停止

APP_DIR="/var/www/kids-academy"
BACKUP_DIR="/var/backups/kids-academy"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🚀 开始部署..."

# ── 1. 备份数据库和上传文件 ──────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

if [ -f "$APP_DIR/database.sqlite" ]; then
    cp "$APP_DIR/database.sqlite" "$BACKUP_DIR/database_${TIMESTAMP}.sqlite"
    echo "✅ 数据库备份完成：$BACKUP_DIR/database_${TIMESTAMP}.sqlite"
fi

# 只保留最近 10 个备份，自动清理旧的
ls -t "$BACKUP_DIR"/database_*.sqlite 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

# ── 2. 拉取最新代码 ─────────────────────────────────────────────────
cd "$APP_DIR"
git pull

# ── 3. 安装依赖 / 构建前端 ──────────────────────────────────────────
npm install
npm run build

# ── 4. 重启后端 ──────────────────────────────────────────────────────
pm2 restart kids-academy

echo "✅ 部署完成！"
echo "   数据库已备份至 $BACKUP_DIR/database_${TIMESTAMP}.sqlite"
```

授权并运行：

```bash
chmod +x /var/www/kids-academy/deploy.sh

# 以后每次更新只需运行：
/var/www/kids-academy/deploy.sh
```

### 如果数据库意外被清空（紧急恢复）

备份文件保存在 `/var/backups/kids-academy/`，恢复方法：

```bash
# 查看所有备份
ls -lh /var/backups/kids-academy/

# 恢复最新备份（替换 TIMESTAMP 为实际时间戳）
cp /var/backups/kids-academy/database_TIMESTAMP.sqlite /var/www/kids-academy/database.sqlite
pm2 restart kids-academy
```

### 数据库升级安全性说明

应用的 `src/db.ts` 使用 `CREATE TABLE IF NOT EXISTS` 和 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 迁移策略，**不会删除现有数据**。每次重启只会在已有结构基础上追加新字段，不会清空数据。

## 常用维护命令

| 操作 | 命令 |
|------|------|
| 查看应用状态 | `pm2 status` |
| 查看实时日志 | `pm2 logs kids-academy` |
| 重启应用 | `pm2 restart kids-academy` |
| 停止应用 | `pm2 stop kids-academy` |
| 查看 Nginx 状态 | `sudo systemctl status nginx` |
| 重载 Nginx 配置 | `sudo systemctl reload nginx` |
| 查看 Nginx 错误日志 | `sudo tail -f /var/log/nginx/error.log` |
| 续期 SSL 证书 | `sudo certbot renew` |
| 查看防火墙规则 | `sudo firewall-cmd --list-all` |
