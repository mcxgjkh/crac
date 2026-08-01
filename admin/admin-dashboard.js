// admin-dashboard.js
(function() {
    var pageState = {};

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
                'exam_pending': '待做列表',
                'exam_progress': '考试错题',
                'exam_sessions': '考试成绩',
                'login_logs': '登录日志',
                'qsl_cards': 'QSL卡片列表'
            };
            document.getElementById('pageTitle').textContent = titleMap[pageId] || '概览';
            var sb = window.__supabaseClient;
            if (sb) {
                if (!pageState[pageId]) {
                    pageState[pageId] = { page: 1, pageSize: 50 };
                }
                loadTableData(sb, pageId, pageState[pageId].page, pageState[pageId].pageSize);
            }
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

    // ===== 数据加载 =====
    window.loadDashboardData = function(sb) {
        document.getElementById('pageTitle').textContent = '概览';
        document.querySelector('.page-content.active') || switchPage('overview');

        loadStats(sb);

        var tables = ['exam_pending', 'exam_progress', 'exam_sessions', 'login_logs', 'qsl_cards'];
        tables.forEach(function(table) {
            pageState[table] = { page: 1, pageSize: 50 };
            loadTableData(sb, table, 1, 50);
        });
    };

    // 统计数量
    function loadStats(sb) {
        sb.from('user_roles').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载用户统计失败:', result.error);
                document.getElementById('totalUsers').textContent = '--';
                return;
            }
            document.getElementById('totalUsers').textContent = result.count || '0';
        });

        sb.from('qsl_cards').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载 QSL 统计失败:', result.error);
                document.getElementById('totalPosts').textContent = '--';
                return;
            }
            document.getElementById('totalPosts').textContent = result.count || '0';
        });

        sb.from('login_logs').select('*', { count: 'exact', head: true }).then(function(result) {
            if (result.error) {
                console.warn('加载日志统计失败:', result.error);
                document.getElementById('totalComments').textContent = '--';
                return;
            }
            document.getElementById('totalComments').textContent = result.count || '0';
        });
    }

    // 加载表格数据（支持分页、排序、QSL 查看链接、刷新按钮）
    function loadTableData(sb, tableName, page, pageSize) {
        var tbody = document.querySelector('#page-' + tableName + ' tbody');
        var paginationContainer = document.querySelector('#page-' + tableName + ' .pagination-container');
        if (!tbody) return;

        if (!paginationContainer) {
            var container = document.getElementById('page-' + tableName);
            var div = document.createElement('div');
            div.className = 'pagination-container';
            container.appendChild(div);
            paginationContainer = div;
        }

        // ---- 添加刷新按钮到标题右侧 ----
        var pageHeader = document.querySelector('#page-' + tableName + ' .page-header');
        if (pageHeader) {
            var refreshBtn = pageHeader.querySelector('.refresh-btn');
            if (!refreshBtn) {
                refreshBtn = document.createElement('button');
                refreshBtn.className = 'refresh-btn';
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.title = '刷新数据';
                refreshBtn.addEventListener('click', function() {
                    // 重新加载当前页，保持分页
                    var currentPage = pageState[tableName] ? pageState[tableName].page : 1;
                    loadTableData(sb, tableName, currentPage, pageSize);
                });
                // 将刷新按钮添加到 h3 右侧
                var h3 = pageHeader.querySelector('h3');
                if (h3) {
                    h3.style.display = 'inline-flex';
                    h3.style.alignItems = 'center';
                    h3.style.gap = '12px';
                    h3.appendChild(refreshBtn);
                } else {
                    pageHeader.appendChild(refreshBtn);
                }
            } else {
                // 已存在，更新引用（无需操作）
            }
        }

        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载中...</td></tr>';
        paginationContainer.innerHTML = '';

        var offset = (page - 1) * pageSize;
        var rangeStart = offset;
        var rangeEnd = offset + pageSize - 1;

        var query = sb.from(tableName).select('*', { count: 'exact' });

        if (tableName === 'qsl_cards') {
            query = query.order('id', { ascending: true });
        } else {
            query = query.order('id', { ascending: false });
        }

        query.range(rangeStart, rangeEnd)
            .then(function(result) {
                if (result.error) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载失败: ' + result.error.message + '</td></tr>';
                    return;
                }
                var data = result.data;
                var totalCount = result.count || 0;
                var totalPages = Math.ceil(totalCount / pageSize);

                pageState[tableName] = { page: page, pageSize: pageSize };

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">暂无数据</td></tr>';
                    paginationContainer.innerHTML = '';
                    return;
                }

                var isQsl = (tableName === 'qsl_cards');
                var headers = Object.keys(data[0]);
                if (isQsl) {
                    headers.push('操作');
                }

                var cardCounts = {};
                if (isQsl) {
                    data.forEach(function(row) {
                        var cn = row.card_number;
                        cardCounts[cn] = (cardCounts[cn] || 0) + 1;
                    });
                }

                var thead = document.querySelector('#page-' + tableName + ' thead');
                if (thead) {
                    thead.innerHTML = '<tr>' + headers.map(function(h) {
                        if (h === '操作') return '<th>操作</th>';
                        return '<th>' + h.replace(/_/g, ' ').toUpperCase() + '</th>';
                    }).join('') + '</tr>';
                }

                var rows = data.map(function(row) {
                    var cols = headers.map(function(key) {
                        if (key === '操作') {
                            var cn = row.card_number || '';
                            var callsign = row.callsign || '';
                            var numLen = cn.length;
                            var cardNumberPart;
                            if (numLen === 12) cardNumberPart = cn.slice(-3);
                            else if (numLen === 11) cardNumberPart = cn.slice(-2);
                            else cardNumberPart = cn.slice(-3);

                            var callsignPart = '';
                            if (cardCounts[cn] > 1 && callsign) {
                                var callLen = callsign.length;
                                if (callLen >= 6) callsignPart = callsign.substring(3, 6);
                                else if (callLen >= 5) callsignPart = callsign.substring(3, 5);
                                else callsignPart = callsign;
                            }
                            var link = '../images/QSL/webp/' + cardNumberPart + (callsignPart ? callsignPart : '') + '.webp';
                            return '<td><a href="' + link + '" target="_blank" class="qsl-link">查看</a></td>';
                        } else {
                            var val = row[key];
                            if (val === null || val === undefined) return '<td>-</td>';
                            if (typeof val === 'object') val = JSON.stringify(val).substring(0, 50);
                            return '<td>' + val + '</td>';
                        }
                    });
                    return '<tr>' + cols.join('') + '</tr>';
                }).join('');
                tbody.innerHTML = rows;

                if (totalPages > 1) {
                    var paginationHTML = '<div class="pagination-wrapper">';
                    paginationHTML += '<button class="page-btn prev" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
                    paginationHTML += '<span class="page-info">' + page + ' / ' + totalPages + '</span>';
                    paginationHTML += '<button class="page-btn next" data-page="' + (page + 1) + '" ' + (page >= totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';
                    paginationHTML += '</div>';
                    paginationContainer.innerHTML = paginationHTML;

                    paginationContainer.querySelectorAll('.page-btn').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            var newPage = parseInt(this.dataset.page);
                            if (newPage >= 1 && newPage <= totalPages) {
                                loadTableData(sb, tableName, newPage, pageSize);
                            }
                        });
                    });
                } else {
                    paginationContainer.innerHTML = '';
                }
            })
            .catch(function(err) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">网络错误，请重试</td></tr>';
                console.error('加载表 ' + tableName + ' 失败:', err);
            });
    }

    // 默认展开第一个分组
    document.addEventListener('DOMContentLoaded', function() {
        var firstToggle = document.querySelector('.nav-group-toggle');
        if (firstToggle) {
            firstToggle.click();
        }
        document.addEventListener('click', function(e) {
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay && overlay.classList.contains('show')) {
                closeSidebar();
            }
        });
    });
})();