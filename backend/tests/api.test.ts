#!/usr/bin/env bun

/**
 * SPanel API 测试脚本
 * 使用 Bun 测试容器化的后端 API
 */

// API 基础 URL
const API_BASE = process.env.API_URL || 'https://test-spanel-bun.freessr.bid';

// 测试颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// 测试结果
let passed = 0;
let failed = 0;

// 日志函数
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
  passed++;
}

function errorLog(message: string) {
  log(`✗ ${message}`, colors.red);
  failed++;
}

function info(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

// 测试 API 端点
async function testAPI(endpoint: string, method: string = 'GET') {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 主测试函数
async function runTests() {
  log('\n🧪 SPanel API 测试\n', colors.blue);
  log('=' .repeat(50) + '\n');

  // 测试 1: 首页
  info('测试 1: 首页 (GET /)');
  const home = await testAPI('/');
  if (home.ok && home.data?.status === 'ok') {
    success('首页响应正常');
    log(`   消息: ${home.data.message}`, colors.reset);
  } else {
    errorLog('首页响应失败');
  }
  console.log('');

  // 测试 2: 健康检查
  info('测试 2: 健康检查 (GET /health)');
  const health = await testAPI('/health');
  if (health.ok && health.data?.status === 'healthy') {
    success('健康检查通过');
    log(`   时间戳: ${health.data.timestamp}`, colors.reset);
  } else {
    errorLog('健康检查失败');
  }
  console.log('');

  // 测试 3: 认证 API - 登录 (模拟请求)
  info('测试 3: 登录端点 (POST /auth/login)');
  const login = await testAPI('/auth/login', 'POST');
  if (login.status === 404 || login.status === 400 || login.status === 200) {
    success('登录端点可访问 (响应正常, 未实现逻辑)');
    log(`   状态码: ${login.status}`, colors.reset);
  } else {
    errorLog('登录端点响应异常');
  }
  console.log('');

  // 测试 4: 用户 API
  info('测试 4: 用户信息端点 (GET /user/info)');
  const userInfo = await testAPI('/user/info');
  if (userInfo.status === 401 || userInfo.status === 404) {
    success('用户端点可访问 (未授权是正常的)');
    log(`   状态码: ${userInfo.status}`, colors.reset);
  } else {
    errorLog('用户端点响应异常');
  }
  console.log('');

  // 测试 5: 404 处理
  info('测试 5: 404 处理 (GET /notfound)');
  const notFound = await testAPI('/notfound');
  if (notFound.status === 404 && notFound.data?.error === 'Not Found') {
    success('404 处理正确');
  } else {
    errorLog('404 处理失败');
  }
  console.log('');

  // 打印总结
  log('=' .repeat(50) + '\n', colors.blue);

  const total = passed + failed;
  log(`总计: ${total} 个测试`, colors.reset);
  log(`通过: ${passed}`, colors.green);
  log(`失败: ${failed}`, colors.red);

  if (failed === 0) {
    log('\n🎉 所有测试通过!\n', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  部分测试失败\n', colors.yellow);
    process.exit(1);
  }
}

// 运行测试
runTests().catch((err) => {
  const errorMsg = err as Error;
  console.error(`测试运行出错: ${errorMsg.message}`);
  console.error(err);
  process.exit(1);
});
