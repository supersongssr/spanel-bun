<template>
  <div id="wrapper">
    <!-- Header -->
    <header id="header">
      <div class="logo">
        <span class="icon fa-rocket"></span>
      </div>
      <div class="content">
        <div class="inner">
          <h1>{{ siteName }}</h1>
          <div v-html="announcementHtml" />
        </div>
      </div>
      <nav>
        <ul>
          <li><a href="#1">简介</a></li>
          <li><a href="/login.html">登录</a></li>
          <li><a href="/register.html">注册</a></li>
          <li><a href="#5">下载</a></li>
        </ul>
      </nav>
    </header>

    <!-- Main Content -->
    <div id="main">
      <!-- Article 1: 简介 -->
      <article id="1">
        <h2 class="major">简介</h2>
        <p>我变秃了，也变强了。<br>首家免费V2ray服务，支持SS SR V2Ray。<br>提供百+节点和G口带宽。<br>所有捐赠全部用于网站建设，非营利站点。<br>请节约账号资源，浪费可耻。</p>
      </article>

      <!-- Article 2: 联系我们 -->
      <article id="4">
        <h2 class="major">联系我们</h2>
        <ul class="icons">
          <p>{{ contactInfo }}</p>
          <li v-for="(contact, index) in contacts" :key="index">
            <a target="_blank" :href="contact.url" :class="`icon ${contact.icon}`">
              <span class="label">{{ contact.label }}</span>
            </a>
          </li>
        </ul>
      </article>

      <!-- Article 3: 软件下载 -->
      <article id="5">
        <h2 class="major">软件下载</h2>
        <ul>
          <li v-for="(download, index) in downloads" :key="index">
            <a :href="download.url" :class="`icon ${download.icon}`">
              <span class="label">{{ download.platform }}</span> {{ download.name }}
            </a>
          </li>
        </ul>
      </article>

      <!-- Article 4: 登录 -->
      <article id="login">
        <h2 class="major">登录</h2>
        <form @submit.prevent="handleLogin">
          <div class="field half first">
            <label for="email">邮箱</label>
            <input type="text" name="email" id="email" v-model="loginForm.email" required />
          </div>
          <div class="field half">
            <label for="password">密码</label>
            <input type="password" name="password" id="password" v-model="loginForm.password" required />
          </div>
          <ul class="actions">
            <li><input type="submit" value="登录" class="special" /></li>
            <li><input type="reset" value="清空" @click.prevent="resetForm" /></li>
          </ul>
        </form>
        <div class="field half">
          <input type="checkbox" id="remember_me" v-model="loginForm.remember">
          <label for="remember_me">记住我</label>
        </div>
        <br />
        <div id="result" role="dialog">
          <p class="h5 margin-top-sm text-black-hint">{{ loginMessage }}</p>
        </div>
      </article>
    </div>

    <!-- Footer -->
    <footer id="footer">
      <p class="copyright">&copy; {{ copyrightYears }} {{ siteName }}</p>
    </footer>

    <!-- BG -->
    <div id="bg"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

// 站点配置
const siteName = ref('test-spanel')
const announcementHtml = ref(`公告：注册送<code>32G</code>流量，<code>0.99￥</code>余额，<code>16</code>次邀请码，免费网速<code>1-10M</code>带宽，捐赠用户网速<code>16Mbps-1Gbps</code><br>
    全球<code>500+</code>节点，<code>50Gbps</code>总带宽，BGP CN2 HKBN PWWC NTT多线接入, 解锁 Openai NetFlix Disney HULU HBO等<br>
    推广返利:<code>6￥</code>金额+<code>10%</code>提成+<code>64G</code>流量+<code>5%</code>二级提成+<code>1-8G</code>每天签到流量`)
const contactInfo = ref('此处填写联系方式')
const copyrightYears = ref('2015-2026')

// 联系方式
const contacts = ref([
  { url: '#', icon: 'fa-envelope', label: 'Email' },
  { url: '#', icon: 'fa-telegram', label: 'Telegram' }
])

// 软件下载列表
const downloads = ref([
  { url: 'https://github.com/2dust/v2rayN/releases/', icon: 'fa-windows', platform: 'Windows', name: 'V2rayN' },
  { url: 'https://github.com/2dust/v2rayNG/releases/', icon: 'fa-android', platform: 'Android', name: 'V2rayNG' },
  { url: 'https://apps.apple.com/app/sing-box-vt/id6673731168', icon: 'fa-apple', platform: 'iOS', name: 'Sing-Box' },
  { url: 'https://github.com/2dust/v2rayN/releases/', icon: 'fa-apple', platform: 'Mac', name: 'V2rayN' },
  { url: 'https://github.com/yanue/V2rayU/releases/', icon: 'fa-apple', platform: 'Mac', name: 'V2rayU' },
  { url: 'https://github.com/2dust/v2rayN/releases/', icon: 'fa-linux', platform: 'Linux', name: 'Ubuntu V2rayN' }
])

// 登录表单
const loginForm = reactive({
  email: '',
  password: '',
  remember: true
})

const loginMessage = ref('')

// 登录处理
const handleLogin = async () => {
  try {
    loginMessage.value = '登录中...'
    // TODO: 实现登录逻辑
    // const response = await axios.post('/api/auth/login', loginForm)
    // if (response.ret === 1) {
    //   localStorage.setItem('token', response.data.token)
    //   window.location.href = '/user'
    // } else {
    //   loginMessage.value = response.msg
    // }
    setTimeout(() => {
      loginMessage.value = '登录功能开发中...'
    }, 500)
  } catch (error) {
    loginMessage.value = '登录失败，请重试'
  }
}

// 重置表单
const resetForm = () => {
  loginForm.email = ''
  loginForm.password = ''
  loginMessage.value = ''
}

onMounted(() => {
  // 初始化页面
  if (typeof console !== 'undefined' && console.log) {
    console.log('%ctest-spanel', 'font-size: 5em')
    console.log('%chttps://github.com/NimaQu/ss-panel-v3-mod_Uim', 'background: rgba(252,234,187,1); font-size: 3em')
  }
})
</script>

<style>
/* 引入Dimension主题样式 - 使用绝对路径确保在生产环境也能加载 */
@import '/assets/css/main.css';

/* 覆盖部分样式以适配Vue */
code {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Courier New', monospace;
}
</style>
