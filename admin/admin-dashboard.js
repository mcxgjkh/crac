// admin-dashboard.js – v3.9.1 (修复 LFS 文件大小显示，自适应单位)
(function() {
    var pageState = {};

    // ===== HTML 转义（防止 XSS） =====
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== 文件大小格式化（自适应单位） =====
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var k = 1024;
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        var size = (bytes / Math.pow(k, i)).toFixed(2);
        return size + ' ' + units[i];
    }

    // ===== 自定义确认对话框 =====
    function showConfirmDialog(message) {
        return new Promise(function(resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';

            var dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            dialog.innerHTML = `
                <div class="confirm-header">
                    <span>确认操作</span>
                    <button class="confirm-close" title="关闭">×</button>
                </div>
                <div class="confirm-body">${escapeHtml(message)}</div>
                <div class="confirm-footer">
                    <button class="confirm-btn confirm-cancel">取消</button>
                    <button class="confirm-btn confirm-ok">确定</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            function close(result) {
                overlay.remove();
                resolve(result);
            }

            dialog.querySelector('.confirm-close').addEventListener('click', function() { close(false); });
            dialog.querySelector('.confirm-cancel').addEventListener('click', function() { close(false); });
            dialog.querySelector('.confirm-ok').addEventListener('click', function() { close(true); });
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) close(false);
            });
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    close(false);
                    document.removeEventListener('keydown', handler);
                }
            });
        });
    }

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
                'qsl_cards': 'QSL卡片列表',
                'download_files': '下载文件管理'
            };
            document.getElementById('pageTitle').textContent = titleMap[pageId] || '概览';
            var sb = window.__supabaseClient;
            if (!sb) return;

            if (pageId === 'download_files') {
                loadDownloadFiles(sb);
                return;
            }

            if (!pageState[pageId]) {
                pageState[pageId] = { page: 1, pageSize: 50 };
            }
            loadTableData(sb, pageId, pageState[pageId].page, pageState[pageId].pageSize);
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

    // ===== 获取带 token 的请求头 =====
    function getAuthHeaders(sb) {
        return sb.auth.getSession().then(function(session) {
            var token = session.data.session?.access_token;
            if (!token) {
                throw new Error('未登录或 session 已过期');
            }
            return {
                Authorization: 'Bearer ' + token
            };
        });
    }

    // ===== 下载管理 =====
    function loadDownloadFiles(sb) {
        var tbody = document.getElementById('downloadFilesBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">加载中...</td></tr>';

        getAuthHeaders(sb).then(function(headers) {
            return sb.functions.invoke('github-files', {
                method: 'GET',
                headers: headers
            });
        }).then(function(result) {
            if (result.error) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">加载失败: ' + escapeHtml(result.error.message) + '</td></tr>';
                return;
            }
            var files = result.data.files || [];
            if (files.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">暂无文件</td></tr>';
                return;
            }
            var rows = files.map(function(file) {
                var sizeDisplay = formatFileSize(file.size);
                var safeName = escapeHtml(file.name);
                var safeSha = escapeHtml(file.sha);
                return '<tr><td>' + safeName + ' (' + sizeDisplay + ')</td><td><button class="delete-file-btn" data-filename="' + safeName + '" data-sha="' + safeSha + '">删除</button></td></tr>';
            }).join('');
            tbody.innerHTML = rows;
            tbody.querySelectorAll('.delete-file-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var filename = this.dataset.filename;
                    var sha = this.dataset.sha;
                    var msg = '确定删除文件 "' + filename + '" 吗？\nSHA: ' + sha;
                    showConfirmDialog(msg).then(function(confirmed) {
                        if (confirmed) {
                            deleteFile(sb, filename, sha);
                        }
                    });
                });
            });
        }).catch(function(err) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">加载失败: ' + escapeHtml(err.message) + '</td></tr>';
            console.error('加载下载文件失败:', err);
        });
    }

    function deleteFile(sb, filename, sha) {
        getAuthHeaders(sb).then(function(headers) {
            return sb.functions.invoke('github-files', {
                method: 'DELETE',
                headers: headers,
                body: { filename: filename, sha: sha }
            });
        }).then(function(result) {
            if (result.error) {
                alert('删除失败: ' + result.error.message);
                return;
            }
            alert('删除成功');
            loadDownloadFiles(sb);
        }).catch(function(err) {
            alert('删除失败: ' + err.message);
        });
    }

    // ===== 上传文件（支持加密选项） =====
    document.addEventListener('DOMContentLoaded', function() {
        var uploadForm = document.getElementById('uploadForm');
        if (uploadForm && !uploadForm.dataset.bound) {
            uploadForm.dataset.bound = 'true';

            var protectedCheckbox = document.getElementById('uploadProtected');
            var passwordGroup = document.getElementById('passwordGroup');
            if (protectedCheckbox && passwordGroup) {
                protectedCheckbox.addEventListener('change', function() {
                    passwordGroup.style.display = this.checked ? 'flex' : 'none';
                    if (!this.checked) {
                        document.getElementById('uploadPassword').value = '';
                    }
                });
            }

            uploadForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var fileInput = document.getElementById('fileInput');
                var file = fileInput.files[0];
                if (!file) {
                    alert('请先选择文件');
                    return;
                }
                if (file.size > 200 * 1024 * 1024) {
                    alert('文件不能超过 200MB');
                    return;
                }

                var sb = window.__supabaseClient;
                if (!sb) {
                    alert('未登录');
                    return;
                }

                var formData = new FormData();
                formData.append('file', file);

                var isProtected = document.getElementById('uploadProtected').checked;
                formData.append('protected', isProtected ? 'true' : 'false');
                if (isProtected) {
                    var password = document.getElementById('uploadPassword').value.trim();
                    if (!password) {
                        alert('请设置下载密码');
                        return;
                    }
                    formData.append('password', password);
                }

                var uploadBtn = uploadForm.querySelector('button[type="submit"]');
                uploadBtn.disabled = true;
                uploadBtn.textContent = '上传中...';

                getAuthHeaders(sb).then(function(headers) {
                    return sb.functions.invoke('github-files', {
                        method: 'POST',
                        headers: headers,
                        body: formData,
                    });
                }).then(function(result) {
                    if (result.error) {
                        alert('上传失败: ' + result.error.message);
                        return;
                    }
                    var msg = '上传成功';
                    if (result.data.method === 'lfs') {
                        msg += ' (通过 LFS)';
                    }
                    if (result.data.md5) {
                        msg += '\nMD5: ' + result.data.md5;
                    }
                    if (result.data.sha256) {
                        msg += '\nSHA-256: ' + result.data.sha256;
                    }
                    alert(msg);
                    fileInput.value = '';
                    var fileNameSpan = document.querySelector('.file-name-display');
                    if (fileNameSpan) fileNameSpan.textContent = '未选择任何文件';
                    protectedCheckbox.checked = false;
                    passwordGroup.style.display = 'none';
                    document.getElementById('uploadPassword').value = '';
                    loadDownloadFiles(sb);
                }).catch(function(err) {
                    alert('上传失败: ' + err.message);
                }).finally(function() {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '上传文件';
                });
            });
        }
    });

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

    // 加载表格数据
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

        var pageHeader = document.querySelector('#page-' + tableName + ' .page-header');
        if (pageHeader) {
            var refreshBtn = pageHeader.querySelector('.refresh-btn');
            if (!refreshBtn) {
                refreshBtn = document.createElement('button');
                refreshBtn.className = 'refresh-btn';
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.title = '刷新数据';
                refreshBtn.addEventListener('click', function() {
                    var currentPage = pageState[tableName] ? pageState[tableName].page : 1;
                    loadTableData(sb, tableName, currentPage, pageSize);
                });
                var h3 = pageHeader.querySelector('h3');
                if (h3) {
                    h3.style.display = 'inline-flex';
                    h3.style.alignItems = 'center';
                    h3.style.gap = '12px';
                    h3.appendChild(refreshBtn);
                } else {
                    pageHeader.appendChild(refreshBtn);
                }
            }
        }

        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载中...</td></tr>';
        paginationContainer.innerHTML = '';

        var offset = (page - 1) * pageSize;
        var query = sb.from(tableName).select('*', { count: 'exact' });
        if (tableName === 'qsl_cards') {
            query = query.order('id', { ascending: true });
        } else {
            query = query.order('id', { ascending: false });
        }
        query.range(offset, offset + pageSize - 1)
            .then(function(result) {
                if (result.error) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">加载失败: ' + escapeHtml(result.error.message) + '</td></tr>';
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
                if (isQsl) headers.push('操作');

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
                        return '<th>' + escapeHtml(h.replace(/_/g, ' ').toUpperCase()) + '</th>';
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
                            var safeCardPart = encodeURIComponent(cardNumberPart);
                            var safeCallPart = encodeURIComponent(callsignPart);
                            var link = '../images/QSL/webp/' + safeCardPart + (safeCallPart ? safeCallPart : '') + '.webp';
                            return '<td><a href="' + link + '" target="_blank" class="qsl-link">查看</a></td>';
                        }
                        var val = row[key];
                        if (val === null || val === undefined) return '<td>-</td>';
                        if (typeof val === 'object') val = JSON.stringify(val).substring(0, 50);
                        return '<td>' + escapeHtml(String(val)) + '</td>';
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
        if (firstToggle) firstToggle.click();
        document.addEventListener('click', function(e) {
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay && overlay.classList.contains('show')) closeSidebar();
        });
    });
})();