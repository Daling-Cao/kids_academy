# KidsAcademy 代码重构记录

> **日期**: 2026-03-07  
> **背景**: 对 Gemini 3.1 生成的初始代码进行全面 Code Review 后，修复了 17 个问题（4 个严重、5 个重要、8 个一般）。

---

## 🔒 安全修复

### 1. 密码加密（严重）
- **之前**: 密码以明文存储在 SQLite 中，登录时直接 `===` 比较
- **之后**: 使用 `bcryptjs`（salt=10）做 hash，登录时 `bcrypt.compareSync()` 验证
- **文件**: `src/db.ts`（种子数据）、`server.ts`（登录 + 创建/更新用户）

### 2. JWT 认证（严重）
- **之前**: 所有 API 完全无认证保护，任何人可直接调用
- **之后**: 
  - 登录成功后签发 JWT Token（7 天有效期）
  - `authMiddleware` 校验 Bearer Token
  - `teacherOnly` 限制教师专属路由
  - 前端 `authFetch()` 封装自动附加 Authorization 头
- **文件**: `server.ts`、`src/App.tsx`

### 3. 越权防护 IDOR（严重）
- **之前**: 学生路由只校验 Token 有效性，未校验 userId 是否属于当前用户
- **之后**: `studentSelfOnly` 中间件校验 `req.params.userId` 或 `req.body.userId` 是否等于 `req.user.id`
- **覆盖路由**: `GET /api/student/buildings/:userId`、`GET /api/student/buildings/:buildingId/projects/:userId`、`POST .../start`、`POST .../complete`、`GET .../progress/:userId`

### 4. XSS 防护（严重）
- **之前**: `dangerouslySetInnerHTML` 直接渲染教师输入的 HTML 内容
- **之后**: 
  - 服务端：保存 project 时用 `isomorphic-dompurify` 清洗 `content` 和 `quiz.question`
  - 客户端：`Classroom.tsx` 渲染前再次 `DOMPurify.sanitize()`
- **文件**: `server.ts`、`src/pages/Classroom.tsx`

### 5. 全局错误处理
- **之前**: SQLite 同步操作抛异常时，Express 返回原生 HTML 500 堆栈
- **之后**: `app.use((err, req, res, next) => ...)` 统一返回 JSON 格式错误
- **文件**: `server.ts`

---

## 🏗️ 架构改进

### 6. TeacherDashboard 拆分（992 → 50 行）
- **之前**: 单个 992 行的巨型组件
- **之后**: 拆分为 5 个独立文件
  - `TeacherDashboard.tsx` — 50 行 Tab 容器
  - `ProjectsTab.tsx` — 项目管理
  - `BuildingsTab.tsx` — 建筑管理  
  - `StudentsTab.tsx` — 学生管理
  - `ProjectEditor.tsx` — 项目编辑器（复用组件）

### 7. 图片存储改进
- **之前**: 图片用 `FileReader` 转为 base64 存储在 SQLite（导致数据库膨胀）
- **之后**: 
  - 后端：`multer` 处理上传，保存到 `/uploads/` 目录
  - 前端：`ImageUpload.tsx` 组件上传文件并返回 URL 路径
  - 限制：10MB 文件大小，仅允许 image/*

### 8. TypeScript 类型化
- **之前**: 遍布 `any` 类型
- **之后**: 新建 `src/types.ts`，定义 8 个接口
  - `User`, `AuthUser`, `Quiz`, `Project`, `Building`, `BuildingWithVisibility`, `UserProgress`, `ProjectWithState`, `StudentProgress`

### 9. 前端错误处理
- **之前**: fetch 无 loading/error 状态，失败时无提示
- **之后**: 所有学生侧组件添加 `loading`/`error` state，检查 `res.ok`

---

## 🔧 快速修复

### 10. package.json
- `name`: `react-example` → `kids-academy`
- `start` 脚本: `node server.js` → `tsx server.ts`
- `@tailwindcss/*`、`@vitejs/plugin-react`、`vite` 移到 `devDependencies`
- 新增依赖: `bcryptjs`, `jsonwebtoken`, `isomorphic-dompurify`, `multer`

### 11. AI Studio 残留清理
- `index.html` title: `My Google AI Studio App` → `Kids Academy`
- `vite.config.ts`: 删除 `GEMINI_API_KEY` 注入和 `DISABLE_HMR` 注释

### 12. .gitignore 完善
- 新增: `database.sqlite`, `uploads/`, `fix*.cjs`, `fix*.js`, `temp.txt`, `metadata.json`

### 13. 数据库改进 (db.ts)
- 启用 WAL 模式和外键约束
- 所有外键添加 `ON DELETE CASCADE`
- 删除旧的 `ALTER TABLE` 兼容代码
- 种子数据使用 bcrypt hash 密码

### 14. 新增 API 端点
- `GET /api/buildings/:id` — 获取单个建筑（BuildingView 不再获取全部再过滤）

### 15. Door.tsx 修复
- 移除多余的 `key?: any` prop（React 保留 prop）
- 定义 `DoorProps` 接口

---

## 📁 文件变更清单

| 文件 | 操作 | 行数 |
|------|------|------|
| `server.ts` | 重写 | 465 |
| `src/db.ts` | 重写 | 84 |
| `src/App.tsx` | 重写 | 98 |
| `src/types.ts` | **新建** | 63 |
| `src/components/ImageUpload.tsx` | **新建** | 78 |
| `src/components/ProjectEditor.tsx` | **新建** | 184 |
| `src/components/Door.tsx` | 修改 | 88 |
| `src/pages/TeacherDashboard.tsx` | 重写 | 50 |
| `src/pages/ProjectsTab.tsx` | **新建** | 213 |
| `src/pages/BuildingsTab.tsx` | **新建** | 215 |
| `src/pages/StudentsTab.tsx` | **新建** | 299 |
| `src/pages/Login.tsx` | 重写 | 82 |
| `src/pages/StudentDashboard.tsx` | 重写 | 79 |
| `src/pages/BuildingView.tsx` | 重写 | 92 |
| `src/pages/Classroom.tsx` | 重写 | 237 |
| `package.json` | 修改 | 49 |
| `index.html` | 修改 | - |
| `vite.config.ts` | 重写 | 13 |
| `.gitignore` | 重写 | 14 |

---

## ✅ 验证结果

- `tsc --noEmit` → 0 错误
- `vite build` → 成功（2421 modules, 7.48s）
- 浏览器测试：登录 ✓ / 错误凭证拒绝 ✓ / Teacher Dashboard 三 Tab ✓ / 学生完整流程 ✓
- 恶意测试：IDOR 越权攻击被 403 拦截 ✓ / 畸形 JSON 被全局错误处理拦截 ✓
