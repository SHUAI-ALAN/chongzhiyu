# 宠之寓 API 文档

默认地址：`http://localhost:8787`

页面入口：

- 公众号页：`http://localhost:8787/official/`
- 门店后台：`http://localhost:8787/admin/`

## 通用响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

错误响应：

```json
{
  "code": 400,
  "message": "错误说明"
}
```

## 健康检查

`GET /health`

## 门店配置

`GET /api/config`

返回门店名称、营业时间、电话、地址、首页快捷入口等。

## 服务列表

`GET /api/services`

可选参数：

- `category`：`grooming`、`boarding`、`health`、`training`

## 商品列表

`GET /api/products`

可选参数：

- `category`：`food`、`care`、`toy`、`daily`

## 预约时段

`GET /api/slots?serviceId=svc-bath`

返回未来可预约日期与时段。

## 创建预约

`POST /api/bookings`

```json
{
  "serviceId": "svc-bath",
  "petName": "团团",
  "petType": "dog",
  "customerName": "李女士",
  "phone": "13800138000",
  "date": "2026-05-19",
  "time": "10:30",
  "remark": "胆子小，希望温柔一点"
}
```

后端会校验手机号、服务是否存在、时段是否可约，以及同服务同日期同时间是否已有待确认/已确认预约。

## 订单列表

`GET /api/orders?phone=13800138000`

当前版本返回示例订单。

## 优惠券

`GET /api/coupons`

## 公众号订阅

`POST /api/subscribe`

```json
{
  "phone": "13800138000",
  "source": "official-account"
}
```

订阅记录会写入 SQLite 数据库 `server/runtime/pet.sqlite`。

## 门店后台

### 汇总

`GET /api/admin/summary`

返回总预约、待确认、已确认、今日预约、未来待服务和公众号线索数量。

### 预约列表

`GET /api/admin/bookings`

可选参数：

- `status`：`all`、`pending`、`confirmed`、`completed`、`canceled`
- `date`：`YYYY-MM-DD`

### 更新预约状态

`PATCH /api/admin/bookings/:id`

```json
{
  "status": "confirmed"
}
```

允许状态：

- `pending`
- `confirmed`
- `completed`
- `canceled`

### 公众号线索

`GET /api/admin/subscribers`

## 公众号微信服务器校验

`GET /wechat/verify?signature=...&timestamp=...&nonce=...&echostr=...`

开发环境未配置 `WECHAT_TOKEN` 时会直接返回 `echostr`。生产环境请配置公众号 token 并启用真实签名校验。
