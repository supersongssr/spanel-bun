# SPanel Bun 项目迁移 TODO 工作计划

**项目:** SPanel PHP → SPanel Bun (TypeScript + Vue.js)
**生成时间:** 2026-01-10
**当前状态:** 后端API完成,前端页面基础框架完成

---

## 📊 项目完成度总览

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 后端API | ✅ 100% | 72个API路由全部实现 |
| 前端页面 | ⚠️ 30% | 基础框架完成,功能待实现 |
| 数据库 | ✅ 100% | Prisma Schema完成 |
| 部署配置 | ⚠️ 80% | Nginx待配置API转发 |

---

## 🔍 详细对比分析

### PHP路由 → TS迁移对照表

#### ✅ 已完成的迁移

| PHP路由 | TS API | 前端页面 | 状态 |
|---------|--------|----------|------|
| `/auth/login` | `POST /auth/login` | `/pages/login/` | ✅ 完成 |
| `/auth/register` | `POST /auth/register` | `/pages/register/` | ✅ 完成 |
| `/user` | `GET /user/dashboard` | `/pages/index/` | ✅ 完成 |
| `/user/node` | `GET /user/nodes` | `/pages/node/` | ✅ 完成 |
| `/user/shop` | `GET /user/shop` | `/pages/shop/` | ✅ 完成 |
| `/user/ticket` | `GET /user/tickets` | `/pages/ticket/` | ✅ 完成 |
| `/admin` | `GET /admin/dashboard` | `/pages/admin/` | ✅ 完成 |
| `/mu/*` | `POST /node/mu/*` | - | ✅ 完成 |

#### ❌ 未完成的迁移 (待实现)

| PHP路由 | 功能 | 优先级 | 复杂度 |
|---------|------|--------|--------|
| `/user/tutorial` | 教程页面 | 中 | 低 |
| `/user/announcement` | 公告查看 | 高 | 低 |
| `/user/donate` | 捐赠页面 | 低 | 低 |
| `/user/lookingglass` | Looking Glass | 中 | 中 |
| `/user/detect` | 检测规则 | 中 | 中 |
| `/user/disable` | 账号禁用 | 高 | 中 |
| `/user/relay` | 中继管理 | 低 | 高 |
| `/user/profile` | 个人资料编辑 | 高 | 中 |
| `/user/invite` | 邀请系统 | 中 | 中 |
| `/user/code` | 充值码 | 中 | 中 |
| `/user/bought` | 购买记录 | 中 | 中 |
| `/user/trafficlog` | 流量日志 | 高 | 低 |
| `/user/kill` | 清空流量 | 高 | 低 |
| `/payment/*` | 支付系统 | 高 | 高 |
| `/api/token/*` | 订阅令牌 | 高 | 高 |
| `/api/sublink` | 订阅链接生成 | 高 | 高 |
| `/mu/*` (完整) | Mu API完整版 | 高 | 中 |
| `/admin/*` | 管理后台完整功能 | 高 | 高 |

---

## 📋 详细工作计划

### 阶段1: 核心功能完善 (优先级: 高)

#### 1.1 订阅系统 (关键功能)

**目标:** 实现用户订阅链接生成和管理

**涉及文件:**
- `backend/src/controllers/subscribe.controller.ts` (新建)
- `backend/src/utils/subscription.ts` (新建)
- `frontend/src/pages/node/index.vue` (修改)

**任务列表:**
- [ ] 1.1.1 创建订阅控制器
  - 实现 `GET /api/subscribe/:token` 获取订阅链接
  - 支持 SS/SSR/V2Ray/Trojan 协议
  - 节点信息序列化

- [ ] 1.1.2 实现订阅链接生成工具
  - `backend/src/utils/subscription.ts`
  - 实现 SS URI 格式化
  - 实现 SSR URI 格式化
  - 实现 V2Ray URI 格式化
  - 实现 Trojan URI 格式化

- [ ] 1.1.3 前端订阅页面
  - 显示订阅链接
  - 二维码生成
  - 订阅更新
  - 订阅导入

**预估时间:** 2-3天

---

#### 1.2 支付系统 (关键功能)

**目标:** 集成支付网关

**涉及文件:**
- `backend/src/controllers/payment.controller.ts` (新建)
- `backend/src/services/payment.ts` (新建)
- `frontend/src/pages/shop/payment.vue` (新建)

**任务列表:**
- [ ] 1.2.1 支付控制器
  - `POST /api/payment/purchase` 创建支付订单
  - `POST /api/payment/notify/{type}` 支付回调
  - `GET /api/payment/status` 查询支付状态

- [ ] 1.2.2 支付服务集成
  - 支付宝SDK集成
  - 微信支付SDK集成
  - 订单状态管理
  - 支付回调验证

- [ ] 1.2.3 前端支付页面
  - 订单确认
  - 支付方式选择
  - 二维码显示
  - 支付状态轮询

**预估时间:** 3-5天

---

### 阶段2: 用户功能完善 (优先级: 中)

#### 2.1 个人资料编辑

**涉及文件:**
- `backend/src/controllers/user.controller.ts` (已存在,需扩展)
- `frontend/src/pages/profile/index.vue` (新建)

**任务列表:**
- [ ] 2.1.1 扩展用户API
  - `PUT /user/profile` 已实现,需增加字段
  - `POST /user/wechat` 绑定微信
  - `POST /user/theme` 更新主题
  - `POST /user/method` 更新加密方式

- [ ] 2.1.2 前端资料页面
  - 基本信息编辑
  - 密码修改
  - 二维码登录设置
  - 主题切换

**预估时间:** 1-2天

---

#### 2.2 邀请系统

**涉及文件:**
- `backend/src/controllers/invite.controller.ts` (新建)
- `frontend/src/pages/invite/index.vue` (新建)

**任务列表:**
- [ ] 2.2.1 邀请API
  - `GET /user/invite` 邀请页面
  - `POST /user/invite/generate` 生成邀请码
  - `GET /user/invite/stats` 邀请统计
  - `POST /user/buy_invite` 购买邀请码

- [ ] 2.2.2 前端邀请页面
  - 邀请码展示
  - 邀请链接分享
  - 邀请统计图表
  - 返利记录

**预估时间:** 1-2天

---

#### 2.3 流量日志

**涉及文件:**
- `backend/src/controllers/user.controller.ts` (已存在)
- `frontend/src/pages/traffic/index.vue` (新建)

**任务列表:**
- [ ] 2.3.1 API已实现,需优化
  - `GET /user/traffic` 已实现
  - 增加图表数据API
  - 流量统计API

- [ ] 2.3.2 前端流量页面
  - 流量使用图表
  - 每日/每周/每月统计
  - 节点流量分布
  - 流量导出

**预估时间:** 1-2天

---

### 阶段3: 高级功能 (优先级: 中)

#### 3.1 工单系统完善

**涉及文件:**
- `backend/src/controllers/user.controller.ts` (已实现)
- `frontend/src/pages/ticket/index.vue` (已存在,需完善)

**任务列表:**
- [ ] 3.1.1 工单API已实现
  - `GET /user/tickets` ✅
  - `POST /user/tickets` ✅
  - `PUT /user/tickets/:id` ✅

- [ ] 3.1.2 前端工单页面完善
  - 工单列表 (已完成基础)
  - 工单详情
  - 工单创建
  - 实时通知
  - 图片上传

**预估时间:** 1天

---

#### 3.2 公告系统

**涉及文件:**
- `backend/src/controllers/announce.controller.ts` (新建)
- `frontend/src/pages/announcement/index.vue` (新建)

**任务列表:**
- [ ] 3.2.1 公告API
  - `GET /api/announces` 公告列表
  - `GET /api/announces/:id` 公告详情
  - `GET /api/announces/active` 活跃公告

- [ ] 3.2.2 前端公告页面
  - 公告列表
  - 公告详情
  - Markdown渲染
  - 公告提醒

**预估时间:** 1天

---

#### 3.3 节点功能增强

**涉及文件:**
- `backend/src/controllers/node.controller.ts` (已实现)
- `frontend/src/pages/node/index.vue` (已存在)

**任务列表:**
- [ ] 3.3.1 节点API扩展
  - `GET /node/:id/config` 节点配置
  - `GET /node/:id/latency` 节点延迟测试
  - `POST /node/:id/test` 节点连通性测试

- [ ] 3.3.2 前端节点页面增强
  - 节点列表 (已有基础)
  - 节点详情
  - 节点延迟显示
  - 节点筛选
  - 订阅一键导入

**预估时间:** 2天

---

### 阶段4: 管理后台完善 (优先级: 高)

#### 4.1 管理后台仪表板

**涉及文件:**
- `backend/src/controllers/admin.controller.ts` (已实现)
- `frontend/src/pages/admin/index.vue` (已存在)

**任务列表:**
- [ ] 4.1.1 仪表板API已实现
  - `GET /admin/dashboard` ✅

- [ ] 4.1.2 前端仪表板完善
  - 统计卡片
  - 实时数据
  - 图表展示
  - 快捷操作

**预估时间:** 2天

---

#### 4.2 用户管理

**涉及文件:**
- `backend/src/controllers/admin.controller.ts` (已实现)
- `frontend/src/pages/admin/users/index.vue` (新建)

**任务列表:**
- [ ] 4.2.1 用户管理API已实现
  - `GET /admin/users` ✅
  - `GET /admin/users/:id` ✅
  - `PUT /admin/users/:id` ✅
  - `DELETE /admin/users/:id` ✅

- [ ] 4.2.2 前端用户管理
  - 用户列表
  - 用户搜索/筛选
  - 用户编辑
  - 流量重置
  - 账号操作

**预估时间:** 2天

---

#### 4.3 节点管理

**涉及文件:**
- `backend/src/controllers/admin.controller.ts` (已实现)
- `frontend/src/pages/admin/nodes/index.vue` (新建)

**任务列表:**
- [ ] 4.3.1 节点管理API已实现
  - `GET /admin/nodes` ✅
  - `POST /admin/nodes` ✅
  - `PUT /admin/nodes/:id` ✅
  - `DELETE /admin/nodes/:id` ✅

- [ ] 4.3.2 前端节点管理
  - 节点列表
  - 节点创建/编辑
  - 节点状态监控
  - 节点配置导入

**预估时间:** 2天

---

### 阶段5: 其他功能 (优先级: 低)

#### 5.1 Looking Glass

**涉及文件:**
- `backend/src/controllers/looking.controller.ts` (新建)
- `frontend/src/pages/looking/index.vue` (新建)

**任务列表:**
- [ ] 5.1.1 Looking Glass API
  - `GET /api/looking/nodes` 节点列表
  - `POST /api/looking/test` 路由测试
  - `POST /api/looking/ping` Ping测试
  - `POST /api/looking/traceroute` Traceroute

- [ ] 5.1.2 前端页面
  - 测试工具界面
  - 结果展示
  - 历史记录

**预估时间:** 2-3天

---

#### 5.2 捐赠系统

**涉及文件:**
- `backend/src/controllers/donate.controller.ts` (新建)
- `frontend/src/pages/donate/index.vue` (新建)

**任务列表:**
- [ ] 5.2.1 捐赠API
  - `GET /api/donate/types` 捐赠方式
  - `POST /api/donate/record` 捐赠记录

- [ ] 5.2.2 前端页面
  - 捐赠方式展示
  - 二维码显示
  - 捐赠榜单

**预估时间:** 1天

---

#### 5.3 检测系统

**涉及文件:**
- `backend/src/controllers/detect.controller.ts` (新建)
- `frontend/src/pages/detect/index.vue` (新建)

**任务列表:**
- [ ] 5.3.1 检测API
  - `GET /api/detect/rules` 检测规则
  - `POST /api/detect/check` 检测流量
  - `GET /api/detect/logs` 检测日志

- [ ] 5.3.2 前端页面
  - 规则列表
  - 检测日志
  - 实时监控

**预估时间:** 2天

---

### 阶段6: 部署和优化 (优先级: 高)

#### 6.1 Nginx配置

**涉及文件:**
- `/etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf`

**任务列表:**
- [ ] 6.1.1 配置API转发
  ```nginx
  location /api {
      proxy_pass http://localhost:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }
  ```

- [ ] 6.1.2 配置WebSocket支持
- [ ] 6.1.3 配置Gzip压缩
- [ ] 6.1.4 配置缓存策略

**预估时间:** 0.5天

---

#### 6.2 数据库迁移

**涉及文件:**
- `backend/prisma/schema.prisma` (已完成)
- `backend/prisma/migrations/` (待创建)

**任务列表:**
- [ ] 6.2.1 创建初始迁移
  ```bash
  bun run prisma:migrate dev --name init
  ```

- [ ] 6.2.2 从旧数据库迁移数据
  - 编写迁移脚本
  - 数据导入
  - 数据验证

- [ ] 6.2.3 备份策略
  - 自动备份脚本
  - 恢复流程

**预估时间:** 1天

---

#### 6.3 测试

**涉及文件:**
- `backend/tests/` (已有基础)
- `frontend/tests/` (待创建)

**任务列表:**
- [ ] 6.3.1 API测试
  - 扩展Python测试脚本
  - TypeScript测试脚本
  - 覆盖率 > 80%

- [ ] 6.3.2 前端测试
  - 组件测试
  - E2E测试
  - 性能测试

- [ ] 6.3.3 压力测试
  - 并发测试
  - 负载测试
  - 性能优化

**预估时间:** 2天

---

## 📁 待创建文件清单

### 后端文件

```
backend/src/
├── controllers/
│   ├── subscribe.controller.ts      # 订阅管理
│   ├── payment.controller.ts        # 支付系统
│   ├── invite.controller.ts         # 邀请系统
│   ├── announce.controller.ts       # 公告系统
│   ├── looking.controller.ts        # Looking Glass
│   ├── donate.controller.ts         # 捐赠系统
│   └── detect.controller.ts         # 检测系统
├── services/
│   ├── payment.ts                   # 支付服务
│   ├── alipay.ts                    # 支付宝集成
│   └── wechat.ts                    # 微信支付集成
├── utils/
│   └── subscription.ts              # 订阅工具
└── middleware/
    └── payment.ts                   # 支付中间件
```

### 前端文件

```
frontend/src/pages/
├── profile/
│   └── index.vue                     # 个人资料
├── invite/
│   └── index.vue                     # 邀请页面
├── traffic/
│   └── index.vue                     # 流量日志
├── announcement/
│   └── index.vue                     # 公告列表
├── looking/
│   └── index.vue                     # Looking Glass
├── donate/
│   └── index.vue                     # 捐赠页面
├── detect/
│   └── index.vue                     # 检测系统
└── admin/
    ├── users/
    │   └── index.vue                 # 用户管理
    ├── nodes/
    │   └── index.vue                 # 节点管理
    ├── orders/
    │   └── index.vue                 # 订单管理
    └── tickets/
        └── index.vue                 # 工单管理
```

---

## 🗓️ 时间估算

| 阶段 | 任务 | 预估时间 | 优先级 |
|------|------|----------|--------|
| 阶段1 | 订阅系统 | 2-3天 | 高 |
| 阶段1 | 支付系统 | 3-5天 | 高 |
| 阶段2 | 个人资料 | 1-2天 | 中 |
| 阶段2 | 邀请系统 | 1-2天 | 中 |
| 阶段2 | 流量日志 | 1-2天 | 中 |
| 阶段3 | 工单完善 | 1天 | 中 |
| 阶段3 | 公告系统 | 1天 | 中 |
| 阶段3 | 节点增强 | 2天 | 中 |
| 阶段4 | 管理后台 | 6天 | 高 |
| 阶段5 | 其他功能 | 6-8天 | 低 |
| 阶段6 | 部署优化 | 3.5天 | 高 |
| **总计** | | **27-37天** | |

---

## 🎯 里程碑

### 里程碑1: 核心功能可用 (第1周)
- ✅ 后端API完成
- ⏳ 订阅系统完成
- ⏳ 支付系统基础完成
- ⏳ 前端核心页面完成

**目标:** 用户可以注册、购买、使用基本功能

### 里程碑2: 功能完善 (第2-3周)
- ⏳ 所有用户功能完成
- ⏳ 管理后台完成
- ⏳ 支付系统完整集成

**目标:** 功能与原PHP版本对等

### 里程碑3: 优化上线 (第4周)
- ⏳ 性能优化
- ⏳ 测试完成
- ⏳ 文档完善
- ⏳ 正式上线

**目标:** 生产环境稳定运行

---

## ⚡ 快速开始建议

### 第一优先级 (本周必须)

1. **订阅系统** - 核心功能
   - `backend/src/controllers/subscribe.controller.ts`
   - `backend/src/utils/subscription.ts`
   - 实现基础的订阅链接生成

2. **Nginx配置** - 部署必需
   - 配置 `/api` 转发
   - 测试API可访问性

3. **前端核心页面** - 用户可见
   - 完善节点页面
   - 完善工单页面
   - 完善商店页面

### 第二优先级 (下周)

4. **支付系统** - 商业必需
   - 支付宝集成
   - 订单管理
   - 支付回调

5. **管理后台** - 运营必需
   - 用户管理
   - 节点管理
   - 订单管理

---

## 📝 注意事项

### 技术约束
- 必须保持API与原PHP版本兼容
- 数据库Schema不能轻易修改
- 需要考虑平滑迁移方案

### 测试要求
- 所有新功能必须有测试
- 测试覆盖率 > 80%
- 必须进行压力测试

### 安全要求
- 所有API必须验证权限
- 支付回调必须验证签名
- 用户输入必须严格验证

---

## 📞 支持资源

- **后端API文档:** `backend/API_ROUTES.md`
- **完成度报告:** `backend/API_COMPLETION_REPORT.md`
- **测试脚本:** `backend/tests/api.test.ts`
- **原PHP路由:** `backend/.links/spanel/config/routes.php`

---

**生成时间:** 2026-01-10
**最后更新:** 2026-01-10
**状态:** 进行中
