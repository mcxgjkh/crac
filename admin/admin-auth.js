// admin-auth.js – 认证模块（使用 user_roles 表判断管理员）
(function() {
    var SUPABASE_URL = 'https://pxhiobmdzntnxwpwtgpx.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_06fy5uemh4fJnAQXIsIXdQ_79UMtlC_';

    var sb = window.__supabaseClient;
    if (!sb) {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.__supabaseClient = sb;
    }

    var loginContainer = document.getElementById('loginContainer');
    var dashboardContainer = document.getElementById('dashboardContainer');
    var loginForm = document.getElementById('loginForm');
    var emailInput = document.getElementById('emailInput');
    var passwordInput = document.getElementById('passwordInput');
    var loginError = document.getElementById('loginError');
    var loginBtn = document.getElementById('loginBtn');

    function showError(msg) {
        loginError.textContent = msg;
        loginError.style.display = 'block';
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    // 从 user_roles 表查询用户角色
    async function getUserRole(userId) {
        try {
            var result = await sb.from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .maybeSingle();
            if (result.error) {
                console.warn('查询 user_roles 失败:', result.error);
                return null;
            }
            return result.data ? result.data.role : null;
        } catch (e) {
            console.warn('查询 user_roles 异常:', e);
            return null;
        }
    }

    async function handleLogin(email, password) {
        hideError();
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        try {
            var result = await sb.auth.signInWithPassword({ email: email, password: password });
            if (result.error) {
                showError(result.error.message);
                return;
            }
            var user = result.data.user;
            if (!user) {
                showError('登录失败，请重试');
                return;
            }

            // 检查 user_roles 表中的角色
            var role = await getUserRole(user.id);
            if (role !== 'admin') {
                showError('该账户无管理员权限');
                await sb.auth.signOut();
                return;
            }

            showDashboard(user);
        } catch (err) {
            showError('网络错误，请稍后重试');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '登 录';
        }
    }

    function showDashboard(user) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'flex';

        var email = user.email || '未知邮箱';
        var username = (user.user_metadata && user.user_metadata.username) || email.split('@')[0] || '管理员';

        var adminEmailEl = document.getElementById('adminEmail');
        var adminNameEl = document.getElementById('adminName');
        var dashboardAdminNameEl = document.getElementById('dashboardAdminName');
        var headerAdminNameEl = document.getElementById('headerAdminName');
        var sidebarAdminNameEl = document.getElementById('sidebarAdminName');
        var sidebarAdminEmailEl = document.getElementById('sidebarAdminEmail');

        if (adminEmailEl) adminEmailEl.textContent = email;
        if (adminNameEl) adminNameEl.textContent = username;
        if (dashboardAdminNameEl) dashboardAdminNameEl.textContent = username;
        if (headerAdminNameEl) headerAdminNameEl.textContent = username;
        if (sidebarAdminNameEl) sidebarAdminNameEl.textContent = username;
        if (sidebarAdminEmailEl) sidebarAdminEmailEl.textContent = email;

        var sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                sb.auth.signOut().then(function() {
                    window.location.reload();
                });
            });
        }

        if (window.loadDashboardData) {
            window.loadDashboardData(sb);
        }
    }

    function setupLogout() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                sb.auth.signOut().then(function() {
                    window.location.reload();
                });
            });
        }
    }

    async function checkSession() {
        var session = await sb.auth.getSession();
        var user = session.data.session ? session.data.session.user : null;
        if (user) {
            var role = await getUserRole(user.id);
            if (role === 'admin') {
                showDashboard(user);
                return true;
            } else {
                // 非管理员，登出
                await sb.auth.signOut();
                return false;
            }
        }
        return false;
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = emailInput.value.trim();
        var password = passwordInput.value;
        if (!email || !password) {
            showError('请输入邮箱和密码');
            return;
        }
        handleLogin(email, password);
    });

    document.addEventListener('DOMContentLoaded', function() {
        checkSession().then(function(isAdmin) {
            if (!isAdmin) {
                loginContainer.style.display = 'flex';
                dashboardContainer.style.display = 'none';
            }
            setupLogout();
        });
    });

    window.__adminAuth = { sb: sb };
})();