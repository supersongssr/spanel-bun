#!/bin/bash

# SPanel Frontend Build Script - Build to public directory

set -e

echo "🔨 Building SPanel Frontend to public directory..."

# Define paths
PROJECT_DIR="/root/git/spanel-bun/frontend"
PUBLIC_DIR="$PROJECT_DIR/public"

# Create public directory structure
echo "📁 Creating directory structure in $PUBLIC_DIR..."
mkdir -p "$PUBLIC_DIR/user"
mkdir -p "$PUBLIC_DIR/admin"
mkdir -p "$PUBLIC_DIR/assets"

echo "✅ Creating static HTML files..."

# 1. User Login Page
cat > "$PUBLIC_DIR/user/login.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPanel - Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            text-align: center;
            color: #409eff;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #606266;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #409eff;
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #409eff;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #66b1ff;
        }
        .links {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            font-size: 14px;
        }
        .links a {
            color: #409eff;
            text-decoration: none;
        }
        .links a:hover {
            text-decoration: underline;
        }
        .error {
            color: #f56c6c;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>SPanel Login</h1>
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>
            <div class="error" id="errorMsg"></div>
            <button type="submit" class="btn">Login</button>
            <div class="links">
                <a href="/user/register.html">Register</a>
                <a href="/user/forgot.html">Forgot Password?</a>
            </div>
        </form>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMsg');

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                    window.location.href = '/user/index.html';
                } else {
                    errorMsg.textContent = data.message || 'Login failed';
                    errorMsg.style.display = 'block';
                }
            } catch (error) {
                errorMsg.textContent = 'Network error: ' + error.message;
                errorMsg.style.display = 'block';
            }
        });
    </script>
</body>
</html>
EOF

# 2. User Index Page (Dashboard)
cat > "$PUBLIC_DIR/user/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPanel - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #409eff;
            font-size: 24px;
        }
        .nav {
            display: flex;
            gap: 20px;
        }
        .nav a {
            text-decoration: none;
            color: #606266;
            padding: 8px 16px;
            border-radius: 4px;
            transition: all 0.3s;
        }
        .nav a:hover, .nav a.active {
            color: #409eff;
            background: #ecf5ff;
        }
        .container {
            max-width: 1200px;
            margin: 40px auto;
            padding: 0 20px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .stat-card h3 {
            color: #909399;
            font-size: 14px;
            margin-bottom: 12px;
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #409eff;
        }
        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .card-header {
            padding: 20px;
            border-bottom: 1px solid #ebeef5;
            font-weight: 600;
        }
        .card-body {
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ebeef5;
        }
        th {
            background: #fafafa;
            font-weight: 600;
            color: #606266;
        }
        .tag {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
        }
        .tag.success {
            background: #f0f9ff;
            color: #67c23a;
        }
        .tag.danger {
            background: #fef0f0;
            color: #f56c6c;
        }
        .loading {
            text-align: center;
            color: #909399;
            padding: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SPanel Dashboard</h1>
        <nav class="nav">
            <a href="/user/index.html" class="active">Dashboard</a>
            <a href="/user/node.html">Nodes</a>
            <a href="/user/shop.html">Shop</a>
            <a href="/user/ticket.html">Tickets</a>
            <a href="/user/profile.html">Profile</a>
            <a href="#" onclick="logout()">Logout</a>
        </nav>
    </div>

    <div class="container">
        <div class="stats">
            <div class="stat-card">
                <h3>Total Traffic</h3>
                <div class="value" id="totalTraffic">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Used Traffic</h3>
                <div class="value" id="usedTraffic">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Balance</h3>
                <div class="value" id="balance">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Expires</h3>
                <div class="value" id="expires">Loading...</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">Available Nodes</div>
            <div class="card-body">
                <table id="nodesTable">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Server</th>
                            <th>Status</th>
                            <th>Online Users</th>
                            <th>Load</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" class="loading">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/user/login.html';
        }

        async function loadDashboard() {
            try {
                const response = await fetch('/api/user/info', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const user = await response.json();

                    document.getElementById('totalTraffic').textContent = formatBytes(user.transfer_enable || 0);
                    document.getElementById('usedTraffic').textContent = formatBytes((user.u || 0) + (user.d || 0));
                    document.getElementById('balance').textContent = '¥' + ((user.balance || 0) / 100).toFixed(2);

                    const expires = user.expire_time || 0;
                    document.getElementById('expires').textContent = expires > 0
                        ? new Date(expires * 1000).toLocaleDateString()
                        : 'Never';

                    loadNodes();
                } else {
                    console.error('Failed to load user info');
                }
            } catch (error) {
                console.error('Failed to load dashboard:', error);
                document.getElementById('totalTraffic').textContent = 'Error';
            }
        }

        async function loadNodes() {
            try {
                const response = await fetch('/api/user/nodes', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const nodes = await response.json();

                    const tbody = document.querySelector('#nodesTable tbody');
                    if (nodes && nodes.length > 0) {
                        tbody.innerHTML = nodes.map(node => `
                            <tr>
                                <td>${node.name || 'Unknown'}</td>
                                <td>${node.server || 'N/A'}</td>
                                <td><span class="tag ${node.is_online ? 'success' : 'danger'}">${node.is_online ? 'Online' : 'Offline'}</span></td>
                                <td>${node.online_user_count || 0}</td>
                                <td>${node.load || '0.00'}</td>
                            </tr>
                        `).join('');
                    } else {
                        tbody.innerHTML = '<tr><td colspan="5" class="loading">No nodes available</td></tr>';
                    }
                }
            } catch (error) {
                console.error('Failed to load nodes:', error);
            }
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/user/login.html';
        }

        loadDashboard();
    </script>
</body>
</html>
EOF

# 3. User Register Page
cat > "$PUBLIC_DIR/user/register.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPanel - Register</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .register-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            text-align: center;
            color: #409eff;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #606266;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            font-size: 14px;
        }
        input:focus {
            outline: none;
            border-color: #409eff;
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #409eff;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        .btn:hover {
            background: #66b1ff;
        }
        .links {
            text-align: center;
            margin-top: 20px;
        }
        .links a {
            color: #409eff;
            text-decoration: none;
        }
        .error {
            color: #f56c6c;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }
        .success {
            color: #67c23a;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="register-container">
        <h1>SPanel Register</h1>
        <form id="registerForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" required placeholder="Choose a username">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" required placeholder="Choose a password (min 8 chars)">
            </div>
            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" required placeholder="Confirm your password">
            </div>
            <div class="error" id="errorMsg"></div>
            <div class="success" id="successMsg"></div>
            <button type="submit" class="btn">Register</button>
            <div class="links">
                Already have an account? <a href="/user/login.html">Login</a>
            </div>
        </form>
    </div>
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorMsg = document.getElementById('errorMsg');
            const successMsg = document.getElementById('successMsg');

            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            if (password !== confirmPassword) {
                errorMsg.textContent = 'Passwords do not match!';
                errorMsg.style.display = 'block';
                return;
            }

            if (password.length < 8) {
                errorMsg.textContent = 'Password must be at least 8 characters!';
                errorMsg.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    successMsg.textContent = 'Registration successful! Redirecting to login...';
                    successMsg.style.display = 'block';
                    setTimeout(() => {
                        window.location.href = '/user/login.html';
                    }, 2000);
                } else {
                    errorMsg.textContent = data.message || 'Registration failed';
                    errorMsg.style.display = 'block';
                }
            } catch (error) {
                errorMsg.textContent = 'Network error: ' + error.message;
                errorMsg.style.display = 'block';
            }
        });
    </script>
</body>
</html>
EOF

# 4. Admin Page
cat > "$PUBLIC_DIR/admin/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPanel - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        .header {
            background: #303133;
            color: white;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 24px;
        }
        .nav {
            display: flex;
            gap: 20px;
        }
        .nav a {
            text-decoration: none;
            color: #c0c4cc;
            padding: 8px 16px;
            border-radius: 4px;
            transition: all 0.3s;
        }
        .nav a:hover, .nav a.active {
            color: white;
            background: #409eff;
        }
        .container {
            max-width: 1400px;
            margin: 40px auto;
            padding: 0 20px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .stat-card h3 {
            color: #909399;
            font-size: 14px;
            margin-bottom: 12px;
        }
        .stat-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #409eff;
        }
        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .card-header {
            padding: 20px;
            border-bottom: 1px solid #ebeef5;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .card-body {
            padding: 20px;
        }
        .btn {
            padding: 8px 16px;
            background: #409eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ebeef5;
        }
        th {
            background: #fafafa;
            font-weight: 600;
            color: #606266;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SPanel Admin Panel</h1>
        <nav class="nav">
            <a href="/admin/index.html" class="active">Dashboard</a>
            <a href="/admin/users.html">Users</a>
            <a href="/admin/nodes.html">Nodes</a>
            <a href="/admin/orders.html">Orders</a>
            <a href="/admin/tickets.html">Tickets</a>
            <a href="/admin/settings.html">Settings</a>
            <a href="#" onclick="logout()">Logout</a>
        </nav>
    </div>

    <div class="container">
        <div class="stats">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="value">1,234</div>
            </div>
            <div class="stat-card">
                <h3>Active Nodes</h3>
                <div class="value">56</div>
            </div>
            <div class="stat-card">
                <h3>Today's Traffic</h3>
                <div class="value">234 GB</div>
            </div>
            <div class="stat-card">
                <h3>Revenue (This Month)</h3>
                <div class="value">¥12,345</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <span>Recent Users</span>
                <a href="/admin/users.html" class="btn">View All</a>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Username</th>
                            <th>Plan</th>
                            <th>Expire Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1234</td>
                            <td>user@example.com</td>
                            <td>testuser</td>
                            <td>Premium</td>
                            <td>2025-12-31</td>
                            <td>Active</td>
                        </tr>
                        <tr>
                            <td>1233</td>
                            <td>user2@example.com</td>
                            <td>user2</td>
                            <td>Basic</td>
                            <td>2025-06-30</td>
                            <td>Active</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/user/login.html';
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/user/login.html';
        }
    </script>
</body>
</html>
EOF

echo ""
echo "✅ Static HTML files created successfully!"
echo ""
echo "📁 Output directory: $PUBLIC_DIR"
echo ""
echo "📄 Created files:"
echo "  - user/login.html"
echo "  - user/index.html"
echo "  - user/register.html"
echo "  - admin/index.html"
echo ""
echo "🔗 Next: Deploy to /var/www/"
echo "  Run: sudo ./scripts/deploy-public.sh"
