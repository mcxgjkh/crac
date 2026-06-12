(function() {
    var SUPABASE_URL = 'https://pxhiobmdzntnxwpwtgpx.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_06fy5uemh4fJnAQXIsIXdQ_79UMtlC_';

    if (!window.supabase) {
        console.error('Supabase SDK 未加载');
        return;
    }
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    document.addEventListener('DOMContentLoaded', function() {
        injectAuthModal();
        updateAuthUI();
        sb.auth.onAuthStateChange(function() {
            updateAuthUI();
        });
    });

    function injectAuthModal() {
        var html = [
            '<div class="modal fade" id="authModal" tabindex="-1">',
            '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header">',
            '<h5 class="modal-title" id="authModalTitle">登录</h5>',
            '<button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>',
            '<div class="modal-body">',
            '<div id="authError" class="alert alert-danger d-none"></div>',
            '<div class="mb-3"><label class="form-label">邮箱</label>',
            '<input type="email" id="authEmail" class="form-control" placeholder="your@email.com"></div>',
            '<div class="mb-3"><label class="form-label">密码</label>',
            '<input type="password" id="authPassword" class="form-control" placeholder="至少6位"></div>',
            '<button id="authSubmitBtn" class="btn btn-primary w-100 mb-2">登录</button>',
            '<button id="authToggleBtn" class="btn btn-link w-100">没有账号？去注册</button>',
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
        var bsModal = new bootstrap.Modal(modal);

        function setMode(m) {
            mode = m;
            titleEl.textContent = m === 'login' ? '登录' : '注册';
            submitBtn.textContent = m === 'login' ? '登录' : '注册';
            toggleBtn.textContent = m === 'login' ? '没有账号？去注册' : '已有账号？去登录';
            errorEl.classList.add('d-none');
        }

        toggleBtn.addEventListener('click', function() {
            setMode(mode === 'login' ? 'register' : 'login');
        });

        submitBtn.addEventListener('click', async function() {
            var email = emailEl.value.trim();
            var password = passwordEl.value;
            if (!email || !password) {
                errorEl.textContent = '请填写邮箱和密码';
                errorEl.classList.remove('d-none');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>处理中…';
            var result;
            if (mode === 'login') {
                result = await sb.auth.signInWithPassword({ email: email, password: password });
            } else {
                result = await sb.auth.signUp({ email: email, password: password });
            }
            submitBtn.disabled = false;
            setMode(mode);
            if (result.error) {
                errorEl.textContent = result.error.message;
                errorEl.classList.remove('d-none');
            } else {
                if (mode === 'register') {
                    errorEl.textContent = '注册成功！请检查邮箱确认（如已关闭邮箱确认则直接登录）。';
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
                '<a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">',
                '<i class="fas fa-user-circle me-1"></i>' + escapeHtml(user.email.split('@')[0]),
                '</a>',
                '<ul class="dropdown-menu dropdown-menu-end">',
                '<li><span class="dropdown-item-text text-muted small">' + escapeHtml(user.email) + '</span></li>',
                '<li><hr class="dropdown-divider"></li>',
                '<li><a class="dropdown-item" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>退出登录</a></li>',
                '</ul></div>'
            ].join('');
            document.getElementById('logoutBtn').addEventListener('click', async function(e) {
                e.preventDefault();
                await sb.auth.signOut();
                updateAuthUI();
            });
        } else {
            navItem.innerHTML = '<a class="nav-link" href="#" id="loginNavBtn"><i class="fas fa-sign-in-alt me-1"></i>登录</a>';
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
