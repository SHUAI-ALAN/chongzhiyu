# 宠之寓微信生态项目

宠之寓是一套面向宠物店的微信小程序、公众号落地页、门店后台和轻量后端 API 代码骨架。当前版本聚焦门店展示、服务预约、宠物用品、会员信息、公众号引流和预约管理。

## 项目结构

```text
pet-miniapp/        微信小程序前端
official-account/   公众号落地页
admin/              门店后台管理页
server/             Node.js 后端 API
server/runtime/     运行时数据目录，默认不提交 git
scripts/            调试和自动检查脚本
docs/               设计方案与接口说明
```

## 快速开始

### 1. 安装调试依赖

```bash
npm install
```

Windows PowerShell 如果遇到 `npm.ps1` 执行策略限制，可以使用：

```bash
npm.cmd install
```

### 2. 启动后端

```bash
npm start
```

默认服务地址是 `http://localhost:8787`。

开发时可以使用自动重启：

```bash
npm run dev
```

### 3. 打开小程序

使用微信开发者工具导入 `pet-miniapp` 目录。开发阶段可在微信开发者工具中勾选“不校验合法域名”。

如需修改 API 地址，编辑：

```text
pet-miniapp/utils/request.js
```

### 4. 预览公众号页和后台

后端启动后访问：

```text
http://localhost:8787/official/
http://localhost:8787/admin/
```

## 调试命令

```bash
npm run check
npm run smoke
```

- `npm run check`：检查 JS 语法、JSON、小程序页面结构和 tabBar 跳转。
- `npm run smoke`：启动临时后端并验证核心 API、预约提交、重复预约拦截、公众号页和门店后台。

## 数据持久化

预约和公众号订阅会默认写入：

```text
server/runtime/pet.sqlite
```

这个运行时文件已在 `.gitignore` 中忽略。生产环境建议替换为 MySQL、PostgreSQL、MongoDB 或云开发数据库。

## 当前功能

- 小程序首页：品牌头图、门店状态、快捷预约、推荐服务、精选用品。
- 服务页：美容洗护、寄养、健康护理、训练咨询等服务卡片。
- 预约页：服务、宠物、手机号、日期和时段选择，提交到后端。
- 商城页：宠物用品列表、分类筛选和加入购物袋交互。
- 我的页：会员信息、订单概览、优惠券和门店联系方式。
- 后端 API：配置、服务、商品、优惠券、时段、预约、订单、公众号事件入口。
- 公众号页：品牌展示、服务入口、预约 CTA、会员权益。
- 门店后台：预约指标、预约列表、状态更新、公众号预约提醒列表。

## 后续建议

- 接入微信登录 `wx.login` 与后端 session。
- 接入微信支付、订单状态机和库存管理。
- 给门店后台增加登录鉴权和角色权限。
- 生产环境可将 `server/runtime/pet.sqlite` 迁移到托管 MySQL、PostgreSQL 或云数据库。
- 接入公众号菜单、模板消息或订阅消息。
