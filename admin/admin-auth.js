// admin-dashboard.js – 仪表盘 + 侧边栏导航 + 数据加载（无 users 表查询）
(function() {
    // 侧边栏折叠切换
    document.querySelectorAll('.nav-group-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            var group = this.dataset.group;
            var items = document.querySelector('.nav-group-items[data-group="' + group + '"]');
            if (items) {
                items.classList.toggle('open');
                this.classList.toggle('active');
            }
        });
    });

    // 页面切换
    document.querySelectorAll('.nav-group-items a[data-page]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var page = this.dataset.page;
            switchPage(page);
            document.querySelectorAll('.nav-group-items a').forEach(function(el) {
                el.classList.remove('active');
            });
            this.classList.add('active');
            closeSidebar();
        });
    });

    function switchPage(pageId) {
        document.querySelectorAll('.page-content').forEach(function(el) {
            el.classList.remove('active');
        });
        var target = document.getElementById('page-' + pageId);
        if (target) {
            target.classList.add('active');
            var titleMap = {
                'exam_pending': '待审批列表',
                'exam_progress': '考试进度',
                'exam_sessions': '考试场次',
                'login_logs': '登录日志',
                'qsl_cards': 'QSL卡片列表'
            };
            document.getElementById('pageTitle').textContent = titleMap[pageId] || '概览';
        }
    }

    // 侧边栏移动端开关
    var sidebar = document.querySelector('.dashboard-sidebar');
    var toggleBtn = document.getElementById('sidebarToggle');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            var overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
                overlay.addEventListener('click', closeSidebar);
            }
            overlay.classList.toggle('show', sidebar.classList.contains('open'));
        });
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        var overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('show');
    }

    // ===== 数据加载（只查业务表） =====
    window.loadDashboardData = function(sb) {
        document.getElementById('pageTitle').textContent = '概览';
        document.querySelector('.page-content.active') || switchPage('overview');

        // 加载统计数据（从业务表计数，不查 users）
        loadStats(sb);
        // 加载各表格数据
        loadTableData(sb, 'exam_pending');
        loadTableData(sb, 'exam_progress');
        loadTableData(sb, 'exam_sessions');
        loadTableData(sb, 'login_logs');
        loadTableData(sb, 'qsl_cards');
    };

    // 统计数量（只从允许的表查询，不涉及 auth.users）
    function loadStats(sb) {
        // 统计 exam_sessions 数量作为“用户总数”示例
        sb.from('exam_sessions').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载统计失败:', result.error);
                return;
            }
            document.getElementById('totalUsers').textContent = result.count || '0';
        });

        // 统计 qsl_cards 数量
        sb.from('qsl_cards').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载统计失败:', result.error);
                return;
            }
            document.getElementById('totalPosts').textContent = result.count || '0';
        });

        // 统计 login_logs 数量
        sb.from('login_logs').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载统计失败:', result.error);
                return;
            }
            document.getElementById('totalComments').textContent = result.count || '0';
        });
    }

    // 加载表格数据
    function loadTableData(sb, tableName) {
        var tbody = document.querySelector('#page-' + tableName + ' tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载中...</td></tr>';

        sb.from(tableName).select('*').limit(50).then(function(result) {
            if (result.error) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载失败: ' + result.error.message + '</td></tr>';
                return;
            }
            var data = result.data;
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">暂无数据</td></tr>';
                return;
            }
            // 动态渲染表头（取第一个对象的键）
            var headers = Object.keys(data[0]);
            // 重新构建表头（如果希望自定义可在此处修改）
            var thead = document.querySelector('#page-' + tableName + ' thead');
            if (thead) {
                thead.innerHTML = '<tr>' + headers.map(function(h) {
                    return '<th>' + h.replace(/_/g, ' ').toUpperCase() + '</th>';
                }).join('') + '</tr>';
            }

            var rows = data.map(function(row) {
                return '<tr>' + headers.map(function(key) {
                    var val = row[key];
                    if (val === null || val === undefined) return '<td>-</td>';
                    if (typeof val === 'object') val = JSON.stringify(val).substring(0, 50);
                    return '<td>' + val + '</td>';
                }).join('') + '</tr>';
            }).join('');
            tbody.innerHTML = rows;
        }).catch(function(err) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">网络错误，请重试</td></tr>';
        });
    }

    // 默认展开第一个分组
    document.addEventListener('DOMContentLoaded', function() {
        var firstToggle = document.querySelector('.nav-group-toggle');
        if (firstToggle) {
            firstToggle.click();
        }
        // 自动关闭侧边栏的遮罩点击
        document.addEventListener('click', function(e) {
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay && overlay.classList.contains('show')) {
                closeSidebar();
            }
        });
    });
})();