# ChannelHelper

ChannelHelper（界面名称为 **Nine7 Control Room**）是一个面向 Telegram 频道运营的 Mini App 控制台，用于集中管理频道同步、自动任务、消息工具和常用频道。

前端基于 Next.js 构建，通过 Telegram Web App 提供的 `initData` 完成用户身份传递，并将 `/backend/*` 请求代理到独立后端服务的 `/api/*` 接口。

> 本项目必须从 Telegram 机器人菜单中的 Web App / Mini App 按钮打开。直接在普通浏览器中访问时，由于缺少 Telegram `initData`，控制台不会加载业务数据。

## 主要功能

- **控制台概览**：查看同步组、统计任务、目录任务、频道节点、消息映射和 Userbot 状态。
- **同步矩阵**：配置一个来源频道到一个或多个目标频道的自动转发路径。
- **频道簿**：保存常用频道 ID 与备注，供各类表单快速选择。
- **统计任务**：定时生成频道互动榜单，支持触发标签、榜单人数、统计周期和屏蔽名单。
- **目录任务**：扫描频道标签，并将生成的目录发布到指定频道消息。
- **消息工具**：发送带按钮的文本或媒体消息、修改旧消息按钮，以及发送多按钮消息。
- **频道工具**：智能备份、生成标签目录、批量替换标签、导出频道成员和批量创建频道。
- **Telegram 体验适配**：支持用户信息读取、触觉反馈、确认弹窗和移动端导航。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Telegram Web Apps SDK

## 运行要求

- Node.js 20 或更高版本
- npm
- 一个可用的 ChannelHelper 后端服务
- 一个已配置 Mini App / Web App 的 Telegram Bot

## 本地开发

1. 克隆仓库并安装依赖：

   ```bash
   git clone https://github.com/lin7zhi/ChannelHelper.git
   cd ChannelHelper
   npm install
   ```

2. 创建本地环境变量文件：

   ```bash
   cp .env.example .env.local
   ```

3. 编辑 `.env.local`，填写后端服务地址：

   ```env
   BACKEND_URL=https://your-backend.example.com
   ```

   前端请求 `/backend/data` 时，Next.js 会将其代理到：

   ```text
   https://your-backend.example.com/api/data
   ```

4. 启动开发服务器：

   ```bash
   npm run dev
   ```

5. 打开 `http://localhost:3000`。

普通浏览器只能用于检查页面是否正常启动。完整功能需要由 Telegram Mini App 环境注入有效的 `initData`，因此联调时应使用 HTTPS 地址，并将其配置到 Telegram Bot 的 Web App 按钮中。可使用受信任的 HTTPS 隧道服务将本地端口临时暴露给 Telegram。

## 可用命令

```bash
npm run dev    # 启动开发服务器
npm run build  # 创建生产构建
npm run start  # 启动生产服务器
npm run lint   # 执行代码检查
```

## 部署

项目包含 `vercel.json`，可直接部署到 Vercel：

1. 在 Vercel 中导入本仓库。
2. 添加环境变量 `BACKEND_URL`，值为后端服务的公开 HTTPS 地址。
3. 完成部署后，将生成的 HTTPS 地址配置为 Telegram Bot 的 Mini App / Web App 地址。
4. 通过机器人菜单打开控制台，确认 Telegram 身份信息和后端请求均可正常使用。

也可以部署到其他支持 Next.js 的平台，但必须保证：

- 已设置 `BACKEND_URL`；
- 前端使用 HTTPS；
- 部署环境支持 Next.js rewrites；
- 后端能够处理前端转发的 `X-Init-Data` 请求头。

## 身份验证与安全

前端会把 Telegram Web App 的 `initData` 放入 `X-Init-Data` 请求头，并随每次 API 请求发送给后端。后端必须使用 Bot Token 验证该数据的签名和有效期，不能只信任其中的用户 ID。

请勿将以下内容提交到仓库：

- Telegram Bot Token；
- 后端密钥或数据库凭据；
- 用户会话文件；
- 生产环境的私密配置。

`BACKEND_URL` 是公开服务地址，不应包含用户名、密码、Token 或其他敏感参数。

## 项目结构

```text
.
├── app/
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 页面布局、元数据和 Telegram SDK
│   └── page.tsx          # 控制台页面及交互逻辑
├── lib/
│   └── telegram.ts       # Telegram Web App 类型与初始化工具
├── .env.example          # 环境变量示例
├── next.config.ts        # 后端 API 代理配置
├── package.json          # 依赖与运行命令
└── vercel.json           # Vercel 部署配置
```

## 使用提示

- 频道 ID 通常为 `-100xxxxxxxxxx` 格式。
- 耗时操作会在后台执行，结果通常返回到当前 Telegram 机器人会话。
- 使用频道同步、成员导出或批量创建等功能前，请确保 Bot/Userbot 拥有相应频道权限。
- 若页面提示“请从 Telegram 内打开”，请通过机器人提供的 Mini App 按钮重新进入，不要直接复制浏览器地址访问。

## License

仓库当前未提供开源许可证。在添加许可证之前，默认保留所有权利。
