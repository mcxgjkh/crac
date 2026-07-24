// admin-dashboard.js – 仪表盘 + 侧边栏导航 + 数据加载
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
            // 高亮菜单
            document.querySelectorAll('.nav-group-items a').forEach(function(el) {
                el.classList.remove('active');
            });
            this.classList.add('active');
            // 移动端关闭侧边栏
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
            // 更新标题
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
            // 创建/移除遮罩
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

    // 数据加载函数
    window.loadDashboardData = function(sb) {
        // 默认显示概览
        document.getElementById('pageTitle').textContent = '概览';
        document.querySelector('.page-content.active') || switchPage('overview');

        // 加载统计数据（示例）
        loadStats(sb);
        // 加载各表格数据
        loadTableData(sb, 'exam_pending');
        loadTableData(sb, 'exam_progress');
        loadTableData(sb, 'exam_sessions');
        loadTableData(sb, 'login_logs');
        loadTableData(sb, 'qsl_cards');
    };

    function loadStats(sb) {
        // 示例：从各表统计数量
        Promise.all([
            sb.from('exam_sessions').select('*', { count: 'exact', head: true }),
            sb.from('qsl_cards').select('*', { count: 'exact', head: true }),
            sb.from('login_logs').select('*', { count: 'exact', head: true }),
        ]).then(function(results) {
            var totalUsers = results[0]?.count ?? 0;
            var totalPosts = results[1]?.count ?? 0;
            var totalComments = results[2]?.count ?? 0;
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('totalPosts').textContent = totalPosts;
            document.getElementById('totalComments').textContent = totalComments;
        }).catch(function(err) {
            console.warn('加载统计数据失败:', err);
        });
    }

    function loadTableData(sb, tableName) {
        sb.from(tableName).select('*').limit(20).then(function(result) {
            var container = document.querySelector('#page-' + tableName + ' tbody');
            if (!container) return;
            if (result.error) {
                container.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载失败: ' + result.error.message + '</td></tr>';
                return;
            }
            var data = result.data;
            if (!data || data.length === 0) {
                container.innerHTML = '<tr><td colspan="10" class="text-center text-muted">暂无数据</td></tr>';
                return;
            }
            // 根据表结构渲染行
            var rows = data.map(function(row) {
                var cols = Object.values(row);
                return '<tr>' + cols.map(function(val) {
                    return '<td>' + (val === null ? '-' : String(val)) + '</td>';
                }).join('') + '</tr>';
            }).join('');
            container.innerHTML = rows;
        }).catch(function(err) {
            console.warn('加载表 ' + tableName + ' 失败:', err);
        });
    }

    // 默认展开第一个分组
    document.addEventListener('DOMContentLoaded', function() {
        var firstToggle = document.querySelector('.nav-group-toggle');
        if (firstToggle) {
            firstToggle.click();
        }
    });
})();