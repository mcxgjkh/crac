// admin-dashboard.js – v4.9.11
(function() {
    var pageState = {};

    // ===== HTML 转义 =====
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== 文件大小格式化 =====
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var k = 1024;
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        var size = (bytes / Math.pow(k, i)).toFixed(2);
        return size + ' ' + units[i];
    }

    // ===== 自定义确认对话框 =====
    function showConfirmDialog(message, options) {
        options = options || {};
        var zIndex = options.zIndex || 9999;
        return new Promise(function(resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.style.zIndex = zIndex;

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

    // ===== 自定义消息对话框 =====
    function showMessageDialog(message, title) {
        title = title || '提示';
        return new Promise(function(resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';

            var dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            var escapedMsg = escapeHtml(message).replace(/\n/g, '<br>');
            dialog.innerHTML = `
                <div class="confirm-header">
                    <span>${escapeHtml(title)}</span>
                    <button class="confirm-close" title="关闭">×</button>
                </div>
                <div class="confirm-body" style="max-height:60vh;overflow-y:auto;word-break:break-all;white-space:pre-wrap;">${escapedMsg}</div>
                <div class="confirm-footer">
                    <button class="confirm-btn confirm-ok" style="background:var(--primary-color);">确定</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            function close() {
                overlay.remove();
                resolve();
            }

            dialog.querySelector('.confirm-close').addEventListener('click', close);
            dialog.querySelector('.confirm-ok').addEventListener('click', close);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    close();
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

            var origin = window.location.origin;
            var rows = files.map(function(file) {
                var sizeDisplay = formatFileSize(file.size);
                var safeName = escapeHtml(file.name);
                var safeSha = escapeHtml(file.sha);
                var md5 = file.md5 || null;
                var sha256 = file.sha256 || null;
                var md5Display = md5 ? escapeHtml(md5) : '无';
                var sha256Display = sha256 ? escapeHtml(sha256) : '无';
                var downloadUrl = origin + '/download/' + encodeURIComponent(file.name);
                return '<tr><td>' + safeName + ' (' + sizeDisplay + ')</td><td><div class="action-buttons">' +
                    '<button class="file-action-btn download-btn" data-url="' + downloadUrl + '">下载</button>' +
                    '<button class="file-action-btn hash-btn" data-hash="' + sha256Display + '" data-type="SHA-256">SHA-256</button>' +
                    '<button class="file-action-btn hash-btn" data-hash="' + md5Display + '" data-type="MD5">MD5</button>' +
                    '<button class="delete-file-btn" data-filename="' + safeName + '" data-sha="' + safeSha + '">删除</button>' +
                    '</div></td></tr>';
            }).join('');
            tbody.innerHTML = rows;

            // 绑定下载按钮
            tbody.querySelectorAll('.download-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var url = this.dataset.url;
                    if (url) {
                        window.open(url, '_blank');
                    } else {
                        showMessageDialog('下载链接不可用', '错误');
                    }
                });
            });

            // 绑定哈希按钮
            tbody.querySelectorAll('.hash-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var hash = this.dataset.hash;
                    var type = this.dataset.type;
                    showMessageDialog(type + ': ' + hash, '哈希值');
                });
            });

            // 绑定删除按钮
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
                showMessageDialog('删除失败: ' + result.error.message, '错误');
                return;
            }
            showMessageDialog('删除成功', '成功').then(function() {
                loadDownloadFiles(sb);
            });
        }).catch(function(err) {
            showMessageDialog('删除失败: ' + err.message, '错误');
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
                    showMessageDialog('请先选择文件', '提示');
                    return;
                }
                if (file.size > 200 * 1024 * 1024) {
                    showMessageDialog('文件不能超过 200MB', '错误');
                    return;
                }

                var sb = window.__supabaseClient;
                if (!sb) {
                    showMessageDialog('未登录', '错误');
                    return;
                }

                var formData = new FormData();
                formData.append('file', file);

                var isProtected = document.getElementById('uploadProtected').checked;
                formData.append('protected', isProtected ? 'true' : 'false');
                if (isProtected) {
                    var password = document.getElementById('uploadPassword').value.trim();
                    if (!password) {
                        showMessageDialog('请设置下载密码', '提示');
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
                        showMessageDialog('上传失败: ' + result.error.message, '错误');
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
                    showMessageDialog(msg, '成功').then(function() {
                        fileInput.value = '';
                        var fileNameSpan = document.querySelector('.file-name-display');
                        if (fileNameSpan) fileNameSpan.textContent = '未选择任何文件';
                        protectedCheckbox.checked = false;
                        passwordGroup.style.display = 'none';
                        document.getElementById('uploadPassword').value = '';
                        loadDownloadFiles(sb);
                    });
                }).catch(function(err) {
                    console.error('上传异常:', err);
                    showMessageDialog('上传失败: ' + err.message, '错误');
                }).finally(function() {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = '上传文件';
                });
            });
        }

        // 修复文件选择显示
        var fileInput = document.getElementById('fileInput');
        var fileNameSpan = document.querySelector('.file-name-display');
        if (fileInput && fileNameSpan) {
            fileInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    fileNameSpan.textContent = this.files[0].name;
                } else {
                    fileNameSpan.textContent = '未选择任何文件';
                }
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

                // ----- 针对 QSL 表固定列顺序 -----
                var headers;
                if (isQsl) {
                    var baseCols = ['id', 'card_number', 'qso_time', 'call_sign', 'card_type', 'card_class', 'generation'];
                    baseCols.push('操作');
                    headers = baseCols;
                } else {
                    headers = Object.keys(data[0]);
                }

                // ----- 生成表头 -----
                var thead = document.querySelector('#page-' + tableName + ' thead');
                if (thead) {
                    thead.innerHTML = '<tr>' + headers.map(function(h) {
                        if (h === '操作') {
                            return '<th>操作</th>';
                        }
                        if (h === 'image_url') {
                            return '<th>图片</th>';
                        }
                        return '<th>' + escapeHtml(h.replace(/_/g, ' ').toUpperCase()) + '</th>';
                    }).join('') + '</tr>';
                }

                // ----- 生成数据行 -----
                var rows;
                if (isQsl) {
                    // QSL 表特殊处理：使用固定列顺序，并生成操作链接
                    rows = data.map(function(row) {
                        var cols = headers.map(function(key) {
                            if (key === '操作') {
                                // 操作列：基于 card_number 和 callsign 生成查看链接
                                var cn = row.card_number || '';
                                var callsign = row.callsign || '';
                                var numLen = cn.length;
                                var cardNumberPart;
                                if (numLen === 12) cardNumberPart = cn.slice(-3);
                                else if (numLen === 11) cardNumberPart = cn.slice(-2);
                                else cardNumberPart = cn.slice(-3);
                                var callsignPart = '';
                                if (callsign) {
                                    var callLen = callsign.length;
                                    if (callLen >= 6) callsignPart = callsign.substring(3, 6);
                                    else if (callLen >= 5) callsignPart = callsign.substring(3, 5);
                                    else callsignPart = callsign;
                                }
                                var version = row.updated_at ? encodeURIComponent(row.updated_at) : Date.now();
                                var link = '../images/QSL/webp/' + cardNumberPart + (callsignPart ? callsignPart : '') + '.webp?v=' + version;
                                return '<td><a href="' + link + '" target="_blank" class="qsl-link">查看</a></td>';
                            } else {
                                var val = row[key];
                                if (val === null || val === undefined) return '<td>-</td>';
                                if (typeof val === 'object') val = JSON.stringify(val).substring(0, 50);
                                return '<td>' + escapeHtml(String(val)) + '</td>';
                            }
                        });
                        return '<tr>' + cols.join('') + '</tr>';
                    });
                } else {
                    // 其他表使用通用逻辑
                    var cardCounts = {};
                    // 通用表头（原有逻辑）
                    var genericHeaders = Object.keys(data[0]);
                    // 添加操作列（如果需要）
                    var hasOperation = false;
                    // 对于 exam_pending 等，我们可能不需要操作列，但保持原有逻辑
                    // 原代码中非QSL表没有操作列，所以我们保持原样
                    rows = data.map(function(row) {
                        var cols = genericHeaders.map(function(key) {
                            var val = row[key];
                            if (val === null || val === undefined) return '<td>-</td>';
                            if (typeof val === 'object') val = JSON.stringify(val).substring(0, 50);
                            return '<td>' + escapeHtml(String(val)) + '</td>';
                        });
                        return '<tr>' + cols.join('') + '</tr>';
                    });
                }

                // ----- 渲染表格，修复多余逗号（使用 join） -----
                tbody.innerHTML = rows.join('');

                // ----- 分页控件 -----
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

    // 默认展开分组，添加QSL按钮
    document.addEventListener('DOMContentLoaded', function() {
        // 展开所有侧边栏分组
        document.querySelectorAll('.nav-group-toggle').forEach(function(toggle) {
            toggle.classList.add('active');
            var group = toggle.dataset.group;
            var items = document.querySelector('.nav-group-items[data-group="' + group + '"]');
            if (items) items.classList.add('open');
        });
        document.addEventListener('click', function(e) {
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay && overlay.classList.contains('show')) closeSidebar();
        });
        // ===== 添加QSL记录功能 =====
        (function initAddQsl() {
            var addBtn = document.getElementById('addQslBtn');
            var modal = document.getElementById('addQslModal');
            if (!addBtn || !modal) return;

            var closeBtn = document.getElementById('closeQslModal');
            var cancelBtn = document.getElementById('cancelQslBtn');
            var form = document.getElementById('addQslForm');
            var errorEl = document.getElementById('qslFormError');

            function showModal() {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

            function hideModal() {
                modal.classList.remove('active');
                document.body.style.overflow = '';
                form.reset();
                errorEl.style.display = 'none';
                var fileInput = document.getElementById('qslImage');
                if (fileInput) fileInput.value = '';
            }

            function getCallSignSuffix(callsign) {
                if (!callsign) return '';
                var len = callsign.length;
                if (len >= 6) return callsign.substring(3, 6);
                if (len >= 5) return callsign.substring(3, 5);
                return callsign;
            }

            // 决定旧图的 URL：如果只有 1 条记录，说明该后三位唯一，图不带后缀
            function getOldImageUrl(lastThree, callsign, isUnique, version) {
                var suffix = isUnique ? '' : getCallSignSuffix(callsign);
                var v = version ? '?v=' + encodeURIComponent(version) : '?v=' + Date.now();
                return '../images/QSL/webp/' + lastThree + suffix + '.webp' + v;
            }

            function previewImage(src) {
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10010;display:flex;align-items:center;justify-content:center;cursor:pointer;';
                var img = document.createElement('img');
                img.src = src;
                img.style.cssText = 'max-width:92vw;max-height:92vh;object-fit:contain;';
                overlay.appendChild(img);
                document.body.appendChild(overlay);
                overlay.onclick = function() { overlay.remove(); };
            }

            addBtn.addEventListener('click', showModal);
            if (closeBtn) closeBtn.addEventListener('click', hideModal);
            if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
            modal.addEventListener('click', function(e) { if (e.target === modal) hideModal(); });

            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                errorEl.style.display = 'none';

                var cardNumber = document.getElementById('qslCardNumber').value.trim();
                var qsoTime = document.getElementById('qslQsoTime').value;
                var callSign = document.getElementById('qslCallSign').value.trim();
                var cardType = document.getElementById('qslCardType').value;
                var cardClass = document.getElementById('qslCardClass').value;
                var generation = parseInt(document.getElementById('qslGeneration').value);
                var imageFile = document.getElementById('qslImage').files[0];

                if (!cardNumber || !qsoTime || !callSign || !cardType || !cardClass || isNaN(generation)) {
                    errorEl.textContent = '请填写所有必填字段';
                    errorEl.style.display = 'block';
                    return;
                }

                var sb = window.__supabaseClient;
                if (!sb) { errorEl.textContent = '未登录或客户端未初始化'; errorEl.style.display = 'block'; return; }

                var session = await sb.auth.getSession();
                var user = session.data.session?.user;
                if (!user) { errorEl.textContent = '请先登录'; errorEl.style.display = 'block'; return; }

                var { data: roleData, error: roleError } = await sb.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
                if (roleError || !roleData || roleData.role !== 'admin') {
                    errorEl.textContent = '权限不足，仅管理员可添加';
                    errorEl.style.display = 'block';
                    return;
                }

                var lastThree;
                if (cardNumber.length === 12) lastThree = cardNumber.slice(-3);
                else if (cardNumber.length === 11) lastThree = cardNumber.slice(-2);
                else lastThree = cardNumber.slice(-3);

                var { data: existingRecords, error: queryError } = await sb
                    .from('qsl_cards')
                    .select('*')
                    .like('card_number', '%' + lastThree);

                if (queryError) {
                    errorEl.textContent = '查询数据库失败: ' + queryError.message;
                    errorEl.style.display = 'block';
                    return;
                }

                if (!existingRecords || existingRecords.length === 0) {
                    await doNormalUpload(sb, cardNumber, qsoTime, callSign, cardType, cardClass, generation, imageFile, lastThree);
                } else {
                    var newImageBlob = await compressToWebp(imageFile);
                    showDuplicateDialog(sb, existingRecords, { cardNumber, qsoTime, callSign, cardType, cardClass, generation }, newImageBlob, lastThree, hideModal);
                }
            });

            async function compressToWebp(imageFile) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) resolve(blob);
                                else reject(new Error('WebP 转换失败'));
                            }, 'image/webp', 0.5);
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
            }

            async function doNormalUpload(sb, cardNumber, qsoTime, callSign, cardType, cardClass, generation, imageFile, lastThree) {
                var submitBtn = document.getElementById('submitQslBtn');
                submitBtn.disabled = true;
                submitBtn.textContent = '提交中...';
                try {
                    if (imageFile) {
                        var webpBlob = await compressToWebp(imageFile);
                        var { data: { session } } = await sb.auth.getSession();
                        var token = session?.access_token;
                        var formData = new FormData();
                        formData.append('file', webpBlob, lastThree + '.webp');
                        formData.append('cardNumber', cardNumber);
                        formData.append('filename', lastThree + '.webp');
                        var uploadResp = await fetch('https://pxhiobmdzntnxwpwtgpx.supabase.co/functions/v1/github-upload', {
                            method: 'POST',
                            headers: { Authorization: 'Bearer ' + token },
                            body: formData,
                        });
                        if (!uploadResp.ok) {
                            var err = await uploadResp.json();
                            throw new Error('图片上传失败: ' + (err.error || '未知错误'));
                        }
                    }
                    var insertData = { card_number: cardNumber, qso_time: qsoTime, call_sign: callSign, card_type: cardType, card_class: cardClass, generation: generation };
                    var { error: insertError } = await sb.from('qsl_cards').insert(insertData);
                    if (insertError) throw new Error('插入失败: ' + insertError.message);
                    hideModal();
                    loadTableData(sb, 'qsl_cards', pageState['qsl_cards']?.page || 1, 50);
                } catch (err) {
                    errorEl.textContent = err.message || '添加失败，请重试';
                    errorEl.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '添加';
                }
            }

            async function showDuplicateDialog(sb, oldRecords, newRecord, newImageBlob, lastThree, onDone) {
                var isUnique = (oldRecords.length === 1);

                var overlay = document.createElement('div');
                overlay.className = 'confirm-overlay';
                overlay.style.zIndex = '10001';

                var content = document.createElement('div');
                content.className = 'confirm-dialog';
                content.style.maxWidth = '900px';
                content.style.width = '95%';

                var html = '<div class="confirm-header"><span>编号重复，请选择保留方式</span><button class="confirm-close" title="关闭">×</button></div>';
                html += '<div style="padding:20px;max-height:70vh;overflow-y:auto;">';
                html += '<p style="margin-bottom:16px;color:var(--text-secondary);font-size:0.9rem;">发现数据库中已存在该编号的记录，请选择保留哪些记录。勾选表示保留，取消勾选表示删除。</p>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">';

                oldRecords.forEach(function(rec, idx) {
                    var imgUrl = getOldImageUrl(lastThree, rec.call_sign, isUnique, rec.updated_at);
                    html += '<div style="border:1px solid var(--border-color);border-radius:12px;padding:12px;width:180px;background:var(--card-bg);" data-idx="old_' + idx + '">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
                    html += '<label style="display:flex;align-items:center;gap:6px;color:var(--text-primary);font-size:0.85rem;"><input type="checkbox" checked class="keep-checkbox" data-type="old" data-id="' + rec.id + '" data-index="' + idx + '"> 保留</label>';
                    html += '<span style="font-size:0.75rem;color:var(--text-secondary);">旧记录</span>';
                    html += '</div>';
                    html += '<img src="' + imgUrl + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;cursor:pointer;margin-bottom:8px;background:rgba(0,0,0,0.2);" class="qsl-preview-img" data-src="' + imgUrl + '" onerror="this.style.opacity=0.3;this.alt=\'图片加载失败\';">';
                    html += '<div style="font-size:0.8rem;color:var(--text-secondary);">呼号: ' + escapeHtml(rec.call_sign || '-') + '</div>';
                    html += '<div style="font-size:0.8rem;color:var(--text-secondary);">时间: ' + escapeHtml(rec.qso_time || '-') + '</div>';
                    html += '<select class="update-mode" data-index="' + idx + '" style="margin-top:8px;width:100%;padding:4px;border-radius:4px;background:var(--card-bg);color:var(--text-primary);border:1px solid var(--border-color);font-size:0.75rem;">';
                    html += '<option value="none">不更新</option><option value="all">都更新</option><option value="image">仅更新图片</option><option value="info">仅更新信息</option>';
                    html += '</select>';
                    html += '</div>';
                });

                var newImgUrl = URL.createObjectURL(newImageBlob);
                html += '<div style="border:1px solid var(--primary-color);border-radius:12px;padding:12px;width:180px;background:rgba(var(--primary-rgb),0.05);">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
                html += '<label style="display:flex;align-items:center;gap:6px;color:var(--text-primary);font-size:0.85rem;"><input type="checkbox" checked class="keep-checkbox" data-type="new"> 保留</label>';
                html += '<span style="font-size:0.75rem;color:var(--primary-color);">新记录</span>';
                html += '</div>';
                html += '<img src="' + newImgUrl + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;cursor:pointer;margin-bottom:8px;" class="qsl-preview-img" data-src="' + newImgUrl + '">';
                html += '<div style="font-size:0.8rem;color:var(--text-secondary);">呼号: ' + escapeHtml(newRecord.callSign || '-') + '</div>';
                html += '<div style="font-size:0.8rem;color:var(--text-secondary);">时间: ' + escapeHtml(newRecord.qsoTime || '-') + '</div>';
                html += '</div>';

                html += '</div></div>';
                html += '<div class="confirm-footer"><button class="confirm-btn confirm-cancel">取消</button><button class="confirm-btn confirm-ok" style="background:var(--primary-color);">确定</button></div>';

                content.innerHTML = html;
                overlay.appendChild(content);
                document.body.appendChild(overlay);

                // 图片点击放大
                content.querySelectorAll('.qsl-preview-img').forEach(function(img) {
                    img.addEventListener('click', function() { previewImage(this.dataset.src); });
                });

                // 勾选切换下拉框显示
                content.querySelectorAll('.keep-checkbox').forEach(function(cb) {
                    cb.addEventListener('change', function() {
                        if (this.dataset.type === 'old') {
                            var idx = this.dataset.index;
                            var sel = content.querySelector('.update-mode[data-index="' + idx + '"]');
                            if (sel) sel.style.display = this.checked ? 'block' : 'none';
                        }
                    });
                });

                function close(result) {
                    URL.revokeObjectURL(newImgUrl);
                    overlay.remove();
                    if (result) onDone();
                }

                content.querySelector('.confirm-close').addEventListener('click', function() { close(false); });
                content.querySelector('.confirm-cancel').addEventListener('click', function() { close(false); });
                overlay.addEventListener('click', function(e) { if (e.target === overlay) close(false); });

                content.querySelector('.confirm-ok').addEventListener('click', async function() {
                    var keepOldIds = [];
                    var updateModes = {};
                    content.querySelectorAll('.keep-checkbox[data-type="old"]:checked').forEach(function(cb) {
                        keepOldIds.push(parseInt(cb.dataset.id));
                        var sel = content.querySelector('.update-mode[data-index="' + cb.dataset.index + '"]');
                        updateModes[cb.dataset.id] = sel ? sel.value : 'none';
                    });
                    var keepNew = content.querySelector('.keep-checkbox[data-type="new"]').checked;

                    var confirmMsg = '确认执行以下操作？\n';
                    if (keepOldIds.length > 0) confirmMsg += '保留 ' + keepOldIds.length + ' 条旧记录\n';
                    if (keepNew) confirmMsg += '保留新记录\n';
                    if (keepOldIds.length === 0 && !keepNew) confirmMsg += '不保留任何记录（全部删除）\n';

                    var confirmed = await showConfirmDialog(confirmMsg, { zIndex: 10020 });
                    if (!confirmed) return;

                    var processOverlay = document.createElement('div');
                    processOverlay.className = 'confirm-overlay';
                    processOverlay.style.zIndex = '10030';
                    processOverlay.innerHTML = '<div class="confirm-dialog" style="padding:20px;text-align:center;color:var(--text-primary);min-width:340px;">' +
                        '<div id="processStep" style="margin-bottom:8px;">准备中...</div>' +
                        '<div id="processError" style="color:#ef4444;font-size:0.85rem;display:none;word-break:break-all;"></div>' +
                        '</div>';
                    document.body.appendChild(processOverlay);

                    function setStep(txt) {
                        var el = document.getElementById('processStep');
                        if (el) el.textContent = txt;
                    }

                    try {
                        var { data: { session } } = await sb.auth.getSession();
                        var token = session?.access_token;

                        // 1. 删除未保留的旧记录
                        setStep('正在删除未保留的旧记录...');
                        for (var i = 0; i < oldRecords.length; i++) {
                            var rec = oldRecords[i];
                            if (keepOldIds.indexOf(rec.id) === -1) {
                                var oldSuffix = isUnique ? '' : getCallSignSuffix(rec.call_sign);
                                var oldFilename = lastThree + oldSuffix + '.webp';

                                // 先删 GitHub 文件；若文件不存在，DELETE 也返回成功
                                var delResp = await fetch('https://pxhiobmdzntnxwpwtgpx.supabase.co/functions/v1/github-upload', {
                                    method: 'DELETE',
                                    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ filename: oldFilename })
                                });
                                if (!delResp.ok) {
                                    var delErr = await delResp.json().catch(function() { return {}; });
                                    throw new Error('删除图片 ' + oldFilename + ' 失败: ' + (delErr.error || delResp.status));
                                }

                                // 再删数据库记录
                                var delDb = await sb.from('qsl_cards').delete().eq('id', rec.id);
                                if (delDb.error) {
                                    throw new Error('删除数据库记录 id=' + rec.id + ' 失败: ' + delDb.error.message);
                                }
                            }
                        }

                        // 2. 处理新记录
                        if (keepNew) {
                            setStep('正在上传新记录...');
                            var newSuffix = '';
                            var hasNoSuffixOld = oldRecords.some(function(rec) {
                                return keepOldIds.indexOf(rec.id) !== -1 && getCallSignSuffix(rec.call_sign) === '';
                            });
                            if (hasNoSuffixOld) newSuffix = getCallSignSuffix(newRecord.callSign);
                            var newFilename = lastThree + newSuffix + '.webp';

                            var formData = new FormData();
                            formData.append('file', newImageBlob, newFilename);
                            formData.append('cardNumber', newRecord.cardNumber);
                            formData.append('filename', newFilename);

                            var uploadResp = await fetch('https://pxhiobmdzntnxwpwtgpx.supabase.co/functions/v1/github-upload', {
                                method: 'POST',
                                headers: { Authorization: 'Bearer ' + token },
                                body: formData,
                            });
                            if (!uploadResp.ok) {
                                var uploadErr = await uploadResp.json().catch(function() { return {}; });
                                throw new Error('新图片上传失败: ' + (uploadErr.error || uploadResp.status));
                            }

                            var insertResp = await sb.from('qsl_cards').insert({
                                card_number: newRecord.cardNumber,
                                qso_time: newRecord.qsoTime,
                                call_sign: newRecord.callSign,
                                card_type: newRecord.cardType,
                                card_class: newRecord.cardClass,
                                generation: newRecord.generation
                            });
                            if (insertResp.error) {
                                throw new Error('插入新记录失败: ' + insertResp.error.message);
                            }
                        }

                        // 3. 更新保留的旧记录
                        setStep('正在更新保留的旧记录...');
                        for (var j = 0; j < oldRecords.length; j++) {
                            var rec = oldRecords[j];
                            if (keepOldIds.indexOf(rec.id) !== -1) {
                                var mode = updateModes[rec.id];
                                if (mode && mode !== 'none') {
                                    var updateData = {};
                                    if (mode === 'all' || mode === 'info') {
                                        updateData.qso_time = newRecord.qsoTime;
                                        updateData.call_sign = newRecord.callSign;
                                        updateData.card_type = newRecord.cardType;
                                        updateData.card_class = newRecord.cardClass;
                                        updateData.generation = newRecord.generation;
                                    }
                                    if (mode === 'all' || mode === 'image') {
                                        var oldSuffix2 = isUnique ? '' : getCallSignSuffix(rec.call_sign);
                                        var oldFilename2 = lastThree + oldSuffix2 + '.webp';
                                        var formData2 = new FormData();
                                        formData2.append('file', newImageBlob, oldFilename2);
                                        formData2.append('cardNumber', rec.card_number);
                                        formData2.append('filename', oldFilename2);

                                        var upResp = await fetch('https://pxhiobmdzntnxwpwtgpx.supabase.co/functions/v1/github-upload', {
                                            method: 'POST',
                                            headers: { Authorization: 'Bearer ' + token },
                                            body: formData2,
                                        });
                                        if (!upResp.ok) {
                                            var upErr = await upResp.json().catch(function() { return {}; });
                                            throw new Error('更新图片 ' + oldFilename2 + ' 失败: ' + (upErr.error || upResp.status));
                                        }
                                    }
                                    if (Object.keys(updateData).length > 0) {
                                        var updateResp = await sb.from('qsl_cards').update(updateData).eq('id', rec.id);
                                        if (updateResp.error) {
                                            throw new Error('更新数据库记录 id=' + rec.id + ' 失败: ' + updateResp.error.message);
                                        }
                                    }
                                }
                            }
                        }

                        processOverlay.remove();
                        close(true);
                        loadTableData(sb, 'qsl_cards', pageState['qsl_cards']?.page || 1, 50);
                    } catch (err) {
                        var errEl = document.getElementById('processError');
                        if (errEl) {
                            errEl.style.display = 'block';
                            errEl.textContent = err.message;
                        }
                        var stepEl = document.getElementById('processStep');
                        if (stepEl) stepEl.textContent = '操作失败';
                        console.error('QSL 处理失败:', err);
                        setTimeout(function() { processOverlay.remove(); }, 5000);
                    }
                });
            }
        })();
    });
})();