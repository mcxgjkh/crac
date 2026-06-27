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
            '.dark-theme #authModal .text-muted { color: #aaa !important; }',
            '.dark-theme .dropdown-menu { background-color: #1e1e1e; border-color: #333; }',
            '.dark-theme .dropdown-item { color: #e0e0e0; }',
            '.dark-theme .dropdown-item:hover { background-color: #2a2a2a; color: #64b5f6; }',
            '.dark-theme .dropdown-divider { border-top-color: #333; }',
            '.dark-theme .dropdown-item-text { color: #aaa; }',
            '.dark-theme .dropdown-item-text.text-muted { color: #aaa !important; }'
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
            '<div id="authExtraLinks" class="d-flex justify-content-between mb-2">',
            '<button id="authToggleBtn" class="btn btn-link p-0">没有账号？去注册</button>',
            '<button id="authForgotBtn" class="btn btn-link p-0">忘记密码？</button>',
            '</div>',
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
        var forgotBtn = document.getElementById('authForgotBtn');
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
                theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                size: 'flexible'
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

        forgotBtn.addEventListener('click', async function() {
            var email = emailEl.value.trim();
            if (!email) {
                errorEl.textContent = '请先输入邮箱地址再点击忘记密码';
                errorEl.classList.remove('d-none');
                return;
            }
            forgotBtn.disabled = true;
            var captchaToken = getCaptchaToken();
            if (!captchaToken) {
                errorEl.textContent = '请完成人机验证';
                errorEl.classList.remove('d-none');
                forgotBtn.disabled = false;
                return;
            }
            var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://bh6rkw.dpdns.org/profile/index.html', captchaToken: captchaToken });
            forgotBtn.disabled = false;
            if (r.error) {
                errorEl.textContent = r.error.message;
                errorEl.classList.remove('d-none');
            } else {
                errorEl.textContent = '密码重置链接已发送到 ' + email + '，请检查邮箱。';
                errorEl.classList.remove('d-none');
                errorEl.classList.remove('alert-danger');
                errorEl.classList.add('alert-success');
            }
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
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>处理中…';
            var captchaToken = getCaptchaToken();
            if (!captchaToken) {
                errorEl.textContent = '请完成人机验证';
                errorEl.classList.remove('d-none');
                submitBtn.disabled = false;
                submitBtn.innerHTML = mode === 'login' ? '登录' : '注册';
                return;
            }
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
                    console.log('[LoginLog] 开始获取公网IP...');
                    getPublicIP().then(function(ip) {
                        console.log('[LoginLog] 获取到IP:', ip || '(空)');
                        sb.from('login_logs').insert({
                            user_id: user.id,
                            ip_address: ip || '未知',
                            logged_at: new Date().toISOString()
                        }).then(function(res) {
                            console.log('[LoginLog] 写入结果:', res.error ? '失败 ' + res.error.message : '成功');
                        });
                    }).catch(function(e) {
                        console.error('[LoginLog] 获取IP异常:', e);
                        sb.from('login_logs').insert({
                            user_id: user.id,
                            ip_address: '未知',
                            logged_at: new Date().toISOString()
                        }).then(function() {});
                    });
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
            var accessToken = session.data.session.access_token;
            var refreshToken = session.data.session.refresh_token;
            setCrossDomainCookie('sb-access-token', accessToken, 7);
            setCrossDomainCookie('sb-refresh-token', refreshToken, 7);
            var displayName = (user.user_metadata && user.user_metadata.username) || user.email.split('@')[0];
            navItem.innerHTML = [
                '<div class="dropdown">',
                '<a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">' + escapeHtml(displayName) + '</a>',
                '<ul class="dropdown-menu dropdown-menu-end">',
                '<li><a class="dropdown-item" href="/profile/index.html">个人中心</a></li>',
                '<li><span class="dropdown-item-text text-muted small">' + escapeHtml(user.email) + '</span></li>',
                '<li><hr class="dropdown-divider"></li>',
                '<li><a class="dropdown-item" href="#" id="logoutBtn">退出登录</a></li>',
                '</ul></div>'
            ].join('');
            document.getElementById('logoutBtn').addEventListener('click', async function(e) {
                e.preventDefault();
                await sb.auth.signOut();
                updateAuthUI();
                if (window.location.pathname.indexOf('/profile/') !== -1) {
                    window.location.href = '/';
                }
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

    function setCrossDomainCookie(name, value, days) {
        var expires = '';
        if (days) {
            var d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + d.toUTCString();
        }
        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; domain=.bh6rkw.dpdns.org; SameSite=Lax; Secure';
    }

    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    window.restoreCrossDomainSession = async function() {
        var accessToken = getCookie('sb-access-token');
        var refreshToken = getCookie('sb-refresh-token');
        if (!accessToken || !refreshToken) return null;
        var result = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (result.error) return null;
        var session = await sb.auth.getSession();
        return session.data.session ? session.data.session.user : null;
    };

    async function getPublicIP() {
        var apis = [
            { url: 'https://api.ip.sb/jsonip', type: 'json', field: 'ip' },
            { url: 'https://api.my-ip.io/ip.json', type: 'json', field: 'ip' },
            { url: 'https://ipinfo.io/json', type: 'json', field: 'ip' },
            { url: 'https://icanhazip.com/', type: 'text' }
        ];
        for (var i = 0; i < apis.length; i++) {
            try {
                var api = apis[i];
                var headers = { 'Accept': api.type === 'json' ? 'application/json' : 'text/plain' };
                var resp = await fetch(api.url, { method: 'GET', headers: headers, mode: 'cors', credentials: 'omit' });
                if (!resp.ok) { console.warn('[getPublicIP]', api.url, 'HTTP', resp.status); continue; }
                var ip;
                if (api.type === 'text') {
                    ip = (await resp.text()).trim();
                } else {
                    var data = await resp.json();
                    ip = data[api.field] || data.ip || data.query || data.ip_address;
                }
                console.log('[getPublicIP]', api.url, '->', ip);
                if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return ip;
                if (ip) return ip;
            } catch(e) { continue; }
        }
        return '';
    }

    injectDarkModeStyles();
    injectAuthModal();
    updateAuthUI();
    sb.auth.onAuthStateChange(function() {
        updateAuthUI();
    });
})();
