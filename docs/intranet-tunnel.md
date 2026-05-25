# 内网穿透使用指南

本文档用于把本地宠物店服务临时暴露到公网，方便手机、外部网络或他人访问官网页面。

## 当前正在使用的穿透方式

当前这次内网穿透使用的是 **Serveo + Windows 自带 ssh.exe**，没有额外安装 ngrok 或 cloudflared。

本地服务：

```text
http://127.0.0.1:8787
```

公网地址：

```text
https://56a37fb79984aa55-117-176-211-162.serveousercontent.com
```

公网官网地址：

```text
https://56a37fb79984aa55-117-176-211-162.serveousercontent.com/official/
```

本次实际使用的命令：

```powershell
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:127.0.0.1:8787 serveo.net
```

当前 SSH 隧道进程：

```text
进程名：ssh.exe
进程 ID：21972
启动时间：2026-05-23 20:03:07
```

本次成功验证命令：

```powershell
curl.exe https://56a37fb79984aa55-117-176-211-162.serveousercontent.com/health
```

返回：

```json
{"code":0,"message":"ok","data":{"status":"up"}}
```

关闭当前这条穿透：

```powershell
Stop-Process -Id 21972
```

如果关闭后重新启动穿透，Serveo 可能会分配新的公网地址，需要以终端新输出的地址为准。

## 脚本化启动和关闭

项目已经提供了两个 PowerShell 脚本：

```text
scripts/start-tunnel.ps1
scripts/stop-tunnel.ps1
```

也可以直接使用 npm 命令。

启动穿透：

```powershell
npm run tunnel:start
```

重建穿透：

```powershell
npm run tunnel:restart
```

关闭穿透：

```powershell
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

```powershell
npm run dev
```

## Serveo 固定地址

项目脚本默认请求一个和门店相关的固定 Serveo 地址：

```text
https://chongzhiyu-shuai.serveousercontent.com/official/
```

对应命令核心参数是：

```text
-R chongzhiyu-shuai:80:127.0.0.1:8787
```

也就是请求 Serveo 把 `chongzhiyu-shuai.serveousercontent.com` 转发到本机 `127.0.0.1:8787`。

注意：Serveo 要求先注册当前电脑的 SSH 公钥，之后才允许使用指定子域名。未注册时，脚本仍会启动成功，但 Serveo 会退回一个随机地址，例如：

```text
https://32dd20ebdf7338e2-117-176-211-162.serveousercontent.com/official/
```

脚本会把 Serveo 返回的 SSH 公钥注册链接写入：

```text
server/runtime/tunnel-info.json
```

字段名：

```text
registrationUrl
```

注册完成后，重新执行：

```powershell
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

也就是本机回环地址，不依赖你电脑在局域网里的内网 IP，例如 `192.168.x.x` 或 `10.x.x.x`。所以局域网 IP 变化本身不会影响脚本连接本地服务。

但公网地址是否变化，取决于 Serveo 是否重新分配域名：

1. 隧道进程一直运行：公网地址通常保持不变。
2. 电脑重启、SSH 进程关闭、网络断开后重新启动：Serveo 可能分配新的公网地址。
3. 如果需要长期固定公网域名，建议改用 Cloudflare Tunnel 绑定自己的域名。

简单说：**内网 IP 变化不一定导致公网网址变化；重启穿透进程更可能导致公网网址变化。**

## 当前服务

本项目本地服务默认运行在：

```text
http://localhost:8787
```

常用页面：

```text
http://localhost:8787/official/
http://localhost:8787/admin/
```

注意：当前 8787 端口同时包含官网和后台。如果直接做内网穿透，公网也能访问 `/admin/`。测试完要及时关闭隧道，正式使用前建议给后台加登录保护。

## 启动本地服务

在项目根目录执行：

```powershell
npm run dev
```

或者：

```powershell
npm start
```

验证本地服务是否正常：

```powershell
curl.exe http://localhost:8787/health
```

看到类似下面内容说明本地服务正常：

```json
{"code":0,"message":"ok","data":{"status":"up"}}
```

## 方式一：使用 Serveo 临时穿透

本机已经有 Windows 自带的 `ssh.exe`，可以免安装使用 Serveo。

启动穿透：

```powershell
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:127.0.0.1:8787 serveo.net
```

启动成功后，终端会输出类似：

```text
Forwarding HTTP traffic from https://xxxx.serveousercontent.com
```

公网访问官网：

```text
https://xxxx.serveousercontent.com/official/
```

验证公网是否连通：

```powershell
curl.exe https://xxxx.serveousercontent.com/health
```

如果返回 `{"code":0,"message":"ok"...}`，说明穿透成功。

### 关闭 Serveo 隧道

如果 SSH 命令在当前终端前台运行，直接按：

```text
Ctrl + C
```

如果是后台进程，先查看进程：

```powershell
Get-Process ssh
```

然后停止对应进程：

```powershell
Stop-Process -Id 进程ID
```

例如：

```powershell
Stop-Process -Id 11860
```

## 方式二：使用 localhost.run 临时穿透

如果 Serveo 不稳定，也可以试：

```powershell
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:127.0.0.1:8787 nokey@localhost.run
```

成功后会输出类似：

```text
https://xxxx.lhr.life
```

公网访问官网：

```text
https://xxxx.lhr.life/official/
```

如果出现空响应或不稳定，优先换回 Serveo，或者使用 Cloudflare Tunnel。

## 更稳定方案：Cloudflare Tunnel

如果后续要长期给客户访问，建议使用 Cloudflare Tunnel，而不是临时 SSH 隧道。

大致流程：

1. 安装 `cloudflared`
2. 登录 Cloudflare
3. 创建 tunnel
4. 绑定自己的域名
5. 把公网域名转发到 `http://localhost:8787`

优点：

- 域名更稳定
- 支持 HTTPS
- 可以绑定自己的正式域名
- 后续可以加访问控制

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

通常是隧道服务连不到本地服务。

检查：

```powershell
curl.exe http://localhost:8787/health
```

如果本地正常，穿透命令里优先使用：

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

```powershell
npm run dev
```

一般 nodemon 会自动重启。否则手动按 `Ctrl + C` 停止，再重新执行：

```powershell
npm run dev
```

### 如何只给别人官网地址

给对方这个格式：

```text
https://公网域名/official/
```

不要主动发：

```text
https://公网域名/admin/
```

但要记住：只要 8787 暴露了，知道路径的人仍然可能访问后台，所以正式使用前要加后台登录保护。
