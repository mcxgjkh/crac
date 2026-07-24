(function() {
    var SUPABASE_URL = 'https://pxhiobmdzntnxwpwtgpx.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_06fy5uemh4fJnAQXIsIXdQ_79UMtlC_';
    var TURNSTILE_SITEKEY = '0x4AAAAAADjdL8yyZdBwUnB1';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    var loginContainer = document.getElementById('loginContainer');
    var dashboardContainer = document.getElementById('dashboardContainer');
    var loginForm = document.getElementById('loginForm');
    var emailInput = document.getElementById('emailInput');
    var passwordInput = document.getElementById('passwordInput');
    var loginError = document.getElementById('loginError');
    var loginBtn = document.getElementById('loginBtn');
    var turnstileWidget = document.getElementById('turnstileWidget');

    var tsId = null;

    function renderTurnstile() {
        if (typeof turnstile === 'undefined') {
            setTimeout(renderTurnstile, 200);
            return;
        }
        if (tsId !== null) turnstile.remove(tsId);
        tsId = turnstile.render(turnstileWidget, {
            sitekey: TURNSTILE_SITEKEY,
            theme: 'dark',
            appearance: 'always'
        });
    }

    function getCaptchaToken() {
        if (tsId === null) return null;
        return turnstile.getResponse(tsId);
    }

    function showError(msg) {
        loginError.textContent = msg;
        loginError.style.display = 'block';
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    async function handleLogin(email, password) {
        hideError();
        var captchaToken = getCaptchaToken();
        if (!captchaToken) {
            showError('请完成人机验证');
            return;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        try {
            var result = await sb.auth.signInWithPassword({
                email: email,
                password: password,
                options: { captchaToken: captchaToken }
            });
            if (result.error) {
                showError(result.error.message);
                if (tsId !== null) turnstile.reset(tsId);
                return;
            }
            var user = result.data.user;
            if (!user) {
                showError('登录失败，请重试');
                return;
            }
            var role = user.user_metadata && user.user_metadata.role;
            if (role !== 'admin') {
                showError('该账户无管理员权限');
                await sb.auth.signOut();
                if (tsId !== null) turnstile.reset(tsId);
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
        var emailSpan = document.getElementById('adminEmail');
        if (emailSpan) emailSpan.textContent = user.email;
        var nameSpan = document.getElementById('adminName');
        if (nameSpan) {
            var username = user.user_metadata && user.user_metadata.username;
            nameSpan.textContent = username || user.email.split('@')[0];
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
            var role = user.user_metadata && user.user_metadata.role;
            if (role === 'admin') {
                showDashboard(user);
                return true;
            } else {
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
                renderTurnstile();
            }
            setupLogout();
        });
    });

    window.__adminSb = sb;
})();