(function() {
    var SUPABASE_URL = 'https://pxhiobmdzntnxwpwtgpx.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_06fy5uemh4fJnAQXIsIXdQ_79UMtlC_';
    var TURNSTILE_KEY = '0x4AAAAAADjdL8yyZdBwUnB1';

    if (!window.supabase) {
        console.error('Supabase SDK 未加载');
        return;
    }
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    var tsScript = document.createElement('script');
    tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    tsScript.async = true;
    tsScript.defer = true;
    document.head.appendChild(tsScript);

    document.addEventListener('DOMContentLoaded', function() {
        injectAuthModal();
        injectDarkModeStyles();
        updateAuthUI();
        sb.auth.onAuthStateChange(function() {
            updateAuthUI();
        });
    });

    function injectDarkModeStyles() {
        var css = [
            '.dark-theme #authModal .modal-content { background-color: #1e1e1e; color: #e0e0e0; border-color: #333; }',
            '.dark-theme #authModal .modal-header { border-bottom-color: #333; }',
            '.dark-theme #authModal .modal-title { color: #e0e0e0; }',
            '.dark-theme #authModal .btn-close { filter: invert(1); }',
            '.dark-theme #authModal .form-control { background-color: #2a2a2a; border-color: #444; color: #e0e0e0; }',
            '.dark-theme #authModal .form-control::placeholder { color: #888; }',
            '.dark-theme #authModal .form-label { color: #bbb; }',
            '.dark-theme #authModal .btn-link { color: #64b5f6; }',
            '.dark-theme #authModal .btn-link:hover { color: #90caf9; }',
            '.dark-theme #authModal .btn-primary { background-color: #2a5a8a; border-color: #2a5a8a; }',
            '.dark-theme #authModal .btn-primary:hover { background-color: #3a6a9a; }',
            '.dark-theme #authModal .text-muted { color: #aaa !important; }'
        ].join('');
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function injectAuthModal() {
        var html = [
            '<div class="modal fade" id="authModal" tabindex="-1">',
            '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header">',
            '<h5 class="modal-title" id="authModalTitle">登录</h5>',
            '<button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>',
            '<div class="modal-body">',
            '<div id="authError" class="alert alert-danger d-none"></div>',
            '<div class="mb-3 d-none" id="usernameGroup"><label class="form-label">用户名</label>',
            '<input type="text" id="authUsername" class="form-control" placeholder="10位以内，选填" maxlength="10"></div>',
            '<div class="mb-3"><label class="form-label">邮箱</label>',
            '<input type="email" id="authEmail" class="form-control" placeholder="your@email.com"></div>',
            '<div class="mb-3"><label class="form-label">密码</label>',
            '<input type="password" id="authPassword" class="form-control" placeholder="至少8位，需包含字母和数字"></div>',
            '<div id="turnstileWidget" class="d-flex justify-content-center mb-2"></div>',
            '<button id="authSubmitBtn" class="btn btn-primary w-100 mb-2">登录</button>',
            '<button id="authToggleBtn" class="btn btn-link w-100">没有账号？去注册</button>',
            '<p class="text-muted small mt-2 mb-0" style="line-height:1.5;">密码全部以哈希加密形式存储于云服务器，BH6RKW 无权也无法访问您的账号与密码，但仍不建议您使用常用密码。</p>',
            '</div></div></div></div>'
        ].join('');
        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);

        var mode = 'login';
        var modal = document.getElementById('authModal');
        var titleEl = document.getElementById('authModalTitle');
        var submitBtn = document.getElementById('authSubmitBtn');
        var toggleBtn = document.getElementById('authToggleBtn');
        var errorEl = document.getElementById('authError');
        var emailEl = document.getElementById('authEmail');
        var passwordEl = document.getElementById('authPassword');
        var usernameEl = document.getElementById('authUsername');
        var usernameGroup = document.getElementById('usernameGroup');
        var tsWidget = document.getElementById('turnstileWidget');
        var bsModal = new bootstrap.Modal(modal);
        var tsId = null;

        function renderTurnstile() {
            if (typeof turnstile === 'undefined') {
                setTimeout(renderTurnstile, 200);
                return;
            }
            if (tsId !== null) turnstile.remove(tsId);
            tsId = turnstile.render('#turnstileWidget', {
                sitekey: TURNSTILE_KEY,
                theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light'
            });
        }

        function getCaptchaToken() {
            return turnstile.getResponse(tsId);
        }

        modal.addEventListener('shown.bs.modal', function() {
            if (!tsId) renderTurnstile();
        });

        function setMode(m) {
            mode = m;
            titleEl.textContent = m === 'login' ? '登录' : '注册';
            submitBtn.textContent = m === 'login' ? '登录' : '注册';
            toggleBtn.textContent = m === 'login' ? '没有账号？去注册' : '已有账号？去登录';
            errorEl.classList.add('d-none');
            if (m === 'register') {
                usernameGroup.classList.remove('d-none');
            } else {
                usernameGroup.classList.add('d-none');
            }
        }

        toggleBtn.addEventListener('click', function() {
            setMode(mode === 'login' ? 'register' : 'login');
        });

        function validatePassword(pwd) {
            if (pwd.length < 8) return '密码至少需要 8 位';
            if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
            if (!/[0-9]/.test(pwd)) return '密码需包含数字';
            return null;
        }

        submitBtn.addEventListener('click', async function() {
            var email = emailEl.value.trim();
            var password = passwordEl.value;
            var username = usernameEl.value.trim();
            if (!email || !password) {
                errorEl.textContent = '请填写邮箱和密码';
                errorEl.classList.remove('d-none');
                return;
            }
            var pwdErr = validatePassword(password);
            if (pwdErr) {
                errorEl.textContent = pwdErr;
                errorEl.classList.remove('d-none');
                return;
            }
            var captchaToken = getCaptchaToken();
            if (!captchaToken) {
                errorEl.textContent = '请完成人机验证';
                errorEl.classList.remove('d-none');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>处理中…';
            var options = { email: email, password: password, options: { captchaToken: captchaToken } };
            if (mode === 'register' && username) {
                options.options.data = { username: username };
            }
            var result;
            if (mode === 'login') {
                result = await sb.auth.signInWithPassword(options);
            } else {
                result = await sb.auth.signUp(options);
            }
            submitBtn.disabled = false;
            if (result.error) {
                turnstile.reset(tsId);
                errorEl.textContent = result.error.message;
                errorEl.classList.remove('d-none');
            } else {
                if (mode === 'register') {
                    errorEl.textContent = '注册成功！请检查邮箱确认链接。';
                    errorEl.classList.remove('d-none');
                    errorEl.classList.remove('alert-danger');
                    errorEl.classList.add('alert-success');
                } else {
                    var user = result.data.user;
                    sb.from('login_logs').insert({ user_id: user.id, ip_address: '', logged_at: new Date().toISOString() }).then(function() {});
                    fetch('https://api64.ipify.org?format=json').then(function(r) { return r.json(); }).then(function(d) {
                        sb.from('login_logs').update({ ip_address: d.ip }).eq('user_id', user.id).is('ip_address', '').then(function() {});
                    }).catch(function() {});
                    if (user && !user.email_confirmed_at) {
                        errorEl.textContent = '邮箱尚未验证，请检查邮箱确认链接。';
                        errorEl.classList.remove('d-none');
                        errorEl.classList.remove('alert-danger');
                        errorEl.classList.add('alert-warning');
                    } else {
                        bsModal.hide();
                        updateAuthUI();
                    }
                }
            }
        });
                    errorEl.textContent = '注册成功！请检查邮箱确认链接。';
                    errorEl.classList.remove('d-none');
                    errorEl.classList.remove('alert-danger');
                    errorEl.classList.add('alert-success');
                } else {
                    bsModal.hide();
                    updateAuthUI();
                }
            }
        });

        window.showAuthModal = function(initialMode) {
            setMode(initialMode || 'login');
            emailEl.value = '';
            passwordEl.value = '';
            errorEl.classList.add('d-none');
            errorEl.classList.remove('alert-success');
            errorEl.classList.add('alert-danger');
            bsModal.show();
        };
    }

    window.updateAuthUI = async function() {
        var navItem = document.getElementById('authNavItem');
        if (!navItem) return;
        var session = await sb.auth.getSession();
        var user = session.data.session ? session.data.session.user : null;
        if (user) {
            navItem.innerHTML = [
                '<div class="dropdown">',
                '<a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">' + escapeHtml(user.email.split('@')[0]) + '</a>',
                '<ul class="dropdown-menu dropdown-menu-end">',
                '<li><span class="dropdown-item-text text-muted small">' + escapeHtml(user.email) + '</span></li>',
                '<li><hr class="dropdown-divider"></li>',
                '<li><a class="dropdown-item" href="#" id="logoutBtn">退出登录</a></li>',
                '</ul></div>'
            ].join('');
            document.getElementById('logoutBtn').addEventListener('click', async function(e) {
                e.preventDefault();
                await sb.auth.signOut();
                updateAuthUI();
            });
        } else {
            navItem.innerHTML = '<a class="nav-link" href="#" id="loginNavBtn">登录</a>';
            document.getElementById('loginNavBtn').addEventListener('click', function(e) {
                e.preventDefault();
                window.showAuthModal('login');
            });
        }
    };

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
})();
