# 内网穿透使用指南

本文档用于把本地宠物店服务临时暴露到公网，方便手机、外部网络或他人访问官网页面。

## 当前方案

当前内网穿透使用 **Serveo + 系统 SSH**，没有额外安装 ngrok 或 cloudflared。

项目通过跨平台 Node 脚本启动和关闭隧道：

```text
scripts/start-tunnel.js
scripts/stop-tunnel.js
```

Windows、macOS 都使用同一组 npm 命令。脚本内部会根据系统选择 `ssh.exe` 或 `ssh`。

## 启动本地服务

在项目根目录执行：

```bash
npm start
```

默认服务地址：

```text
http://localhost:8787
```

常用页面：

```text
http://localhost:8787/official/
http://localhost:8787/admin/
```

验证本地服务是否正常：

```bash
curl http://localhost:8787/health
```

看到类似下面内容说明本地服务正常：

```json
{"code":0,"message":"ok","data":{"status":"up"}}
```

## 启动和关闭穿透

启动穿透：

```bash
npm run tunnel:start
```

重建穿透：

```bash
npm run tunnel:restart
```

关闭穿透：

```bash
npm run tunnel:stop
```

启动成功后，脚本会输出：

```text
Public URL
Official URL
Admin URL
PID
```

同时会把本次穿透信息写入：

```text
server/runtime/tunnel-info.json
```

这个文件包含公网地址、官网地址、后台地址、SSH 进程 ID、启动命令等。`server/runtime/*.json` 已经在 `.gitignore` 里，不会提交到代码仓库。

如果本地服务没有启动，脚本会提示先运行：

```bash
npm start
```

## Serveo 固定地址

项目脚本默认请求固定 Serveo 地址：

```text
https://chongzhiyu-shuai.serveousercontent.com/official/
```

对应命令核心参数是：

```text
-R chongzhiyu-shuai:80:127.0.0.1:8787
```

也就是请求 Serveo 把 `chongzhiyu-shuai.serveousercontent.com` 转发到本机 `127.0.0.1:8787`。

Serveo 要求先注册当前电脑的 SSH 公钥，之后才允许使用指定子域名。未注册时，脚本会把 Serveo 返回的 SSH 公钥注册链接写入：

```text
server/runtime/tunnel-info.json
```

字段名：

```text
registrationUrl
```

注册完成后重新执行：

```bash
npm run tunnel:restart
```

如果固定地址生效，`server/runtime/tunnel-info.json` 中会显示：

```json
{
  "publicUrl": "https://chongzhiyu-shuai.serveousercontent.com",
  "fixedUrlActive": true
}
```

## 内网 IP 变化会不会影响公网地址

当前脚本使用的是：

```text
127.0.0.1:8787
```

也就是本机回环地址，不依赖电脑在局域网里的内网 IP，例如 `192.168.x.x` 或 `10.x.x.x`。所以局域网 IP 变化本身不会影响脚本连接本地服务。

公网地址是否变化取决于 Serveo 是否重新分配域名：

1. 隧道进程一直运行：公网地址通常保持不变。
2. 电脑重启、SSH 进程关闭、网络断开后重新启动：Serveo 可能分配新的公网地址。
3. 固定地址注册成功后，脚本会优先请求固定地址。

## 安全建议

临时测试可以直接暴露 8787，但不要长期这样使用。

正式上线前建议至少完成：

1. 给 `/admin/` 加管理员登录。
2. 后台接口增加鉴权。
3. 不要把测试密码、真实手机号随意暴露到公网。
4. 使用正式 HTTPS 域名。
5. 定期备份 SQLite 数据库。

## 常见问题

### 公网地址打开 502

通常是隧道服务连不到本地服务。先检查：

```bash
curl http://localhost:8787/health
```

如果本地正常，确认穿透命令里使用的是：

```text
127.0.0.1:8787
```

不要使用：

```text
localhost:8787
```

因为有些环境里 `localhost` 会解析到 IPv6，导致隧道服务连接失败。

### 公网地址能打开，但修改代码没变化

需要确认本地 server 是否已重启。

如果使用：

```bash
npm run dev
```

一般 nodemon 会自动重启。否则手动按 `Ctrl + C` 停止，再重新执行：

```bash
npm start
```

### 如何只给别人官网地址

给对方这个格式：

```text
https://公网地址/official/
```

后台地址是：

```text
https://公网地址/admin/
```

测试完后及时关闭隧道：

```bash
npm run tunnel:stop
```
