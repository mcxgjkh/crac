(function() {
    var SUPABASE_URL = 'https://pxhiobmdzntnxwpwtgpx.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_06fy5uemh4fJnAQXIsIXdQ_79UMtlC_';
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    var themeSwitch = document.querySelector('.theme-switch__checkbox');
    var btnSearch = document.getElementById('btnSearch');
    var btnReset = document.getElementById('btnReset');
    var resultsHeader = document.getElementById('resultsHeader');
    var resultsCount = document.getElementById('resultsCount');
    var resultsContainer = document.getElementById('resultsContainer');
    var noResult = document.getElementById('noResult');
    var initialHint = document.getElementById('initialHint');
    var searchCardNumber = document.getElementById('searchCardNumber');
    var searchQsoTime = document.getElementById('searchQsoTime');
    var searchCallSign = document.getElementById('searchCallSign');

    function switchToDarkTheme() {
        document.body.classList.add('dark-theme');
        window.dispatchEvent(new CustomEvent('theme-changed'));
    }

    function switchToLightTheme() {
        document.body.classList.remove('dark-theme');
        window.dispatchEvent(new CustomEvent('theme-changed'));
    }

    themeSwitch.addEventListener('change', function() {
        if (this.checked) { switchToDarkTheme(); }
        else { switchToLightTheme(); }
    });

    [searchCardNumber, searchQsoTime, searchCallSign].forEach(function(el) {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') btnSearch.click();
        });
    });

    btnReset.addEventListener('click', function() {
        searchCardNumber.value = '';
        searchQsoTime.value = '';
        searchCallSign.value = '';
        resultsContainer.innerHTML = '';
        resultsHeader.style.display = 'none';
        noResult.style.display = 'none';
        initialHint.style.display = 'block';
    });

    function formatQsoTime(raw) {
        if (!raw || raw === 'None') return '—';
        var s = String(raw);
        if (s.length === 12 && /^\d{12}$/.test(s)) {
            return s.substring(0, 4) + '年' + s.substring(4, 6) + '月' + s.substring(6, 8) + '日' +
                   s.substring(8, 10) + '时' + s.substring(10, 12) + '分';
        }
        if (s.length === 8 && /^\d{8}$/.test(s)) {
            return s.substring(0, 4) + '年' + s.substring(4, 6) + '月' + s.substring(6, 8) + '日';
        }
        return s;
    }

    function getCardNumberSuffix(cardNumber) {
        var s = String(cardNumber);
        var len = s.length;
        if (len === 10) return s;
        if (len === 11) return s.substring(9, 11);
        if (len >= 12) return s.substring(len - 3);
        return s;
    }

    function getCallSignSuffix(callSign) {
        if (!callSign || callSign === 'None') return '';
        var s = String(callSign);
        if (s.length >= 6) return s.substring(3, 6);
        if (s.length === 5) return s.substring(3, 5);
        return '';
    }

    function buildImagePath(cardNumber, callSign, allRows) {
        var cnPrefix = getCardNumberSuffix(cardNumber);
        var samePrefixRows = allRows.filter(function(r) {
            return getCardNumberSuffix(r.card_number) === cnPrefix;
        });
        if (samePrefixRows.length > 1) {
            var csSuffix = getCallSignSuffix(callSign);
            if (csSuffix) return cnPrefix + csSuffix;
        }
        return cnPrefix;
    }

    function checkImageExists(url, callback) {
        var img = new Image();
        img.onload = function() { callback(true); };
        img.onerror = function() { callback(false); };
        img.src = url;
    }

    function formatField(val) {
        if (val === null || val === undefined || val === 'None') return '—';
        return val;
    }

    btnSearch.addEventListener('click', async function() {
        var cn = searchCardNumber.value.trim();
        var qt = searchQsoTime.value.trim();
        var cs = searchCallSign.value.trim();

        if (!cn && !qt && !cs) {
            initialHint.style.display = 'block';
            resultsContainer.innerHTML = '';
            resultsHeader.style.display = 'none';
            noResult.style.display = 'none';
            return;
        }

        btnSearch.disabled = true;
        btnSearch.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>查询中...';

        var allRows = [];
        var seen = {};

        async function queryAndMerge(field, value) {
            if (!value) return;
            var r = await sb.from('qsl_cards').select('*').ilike(field, '%' + value + '%');
            if (r.data) {
                r.data.forEach(function(row) {
                    if (!seen[row.id]) {
                        seen[row.id] = true;
                        allRows.push(row);
                    }
                });
            }
        }

        await Promise.all([
            queryAndMerge('card_number', cn),
            queryAndMerge('qso_time', qt),
            queryAndMerge('call_sign', cs)
        ]);

        btnSearch.disabled = false;
        btnSearch.innerHTML = '<i class="fas fa-search me-1"></i> 搜索';

        if (allRows.length === 0) {
            resultsContainer.innerHTML = '';
            resultsHeader.style.display = 'none';
            noResult.style.display = 'block';
            initialHint.style.display = 'none';
            return;
        }

        noResult.style.display = 'none';
        initialHint.style.display = 'none';
        resultsHeader.style.display = 'flex';
        resultsCount.textContent = '共 ' + allRows.length + ' 条记录';

        var html = '';
        allRows.forEach(function(row, idx) {
            var imgPath = buildImagePath(row.card_number, row.call_sign, allRows);
            var imgUrl = '../images/QSL/webp/' + imgPath + '.webp';
            var displayCardNumber = formatField(row.card_number);
            var displayQsoTime = formatQsoTime(row.qso_time);
            var displayCallSign = formatField(row.call_sign);
            var displayCardType = formatField(row.card_type);
            var displayCardClass = formatField(row.card_class);
            var displayGeneration = formatField(row.generation);

            html += '<div class="qsl-result-card">';
            html += '<div class="qsl-result-index">#' + (idx + 1) + '</div>';
            html += '<div class="qsl-result-info">';
            html += '<div class="qsl-field"><span class="qsl-field-label">卡片编号</span><span class="qsl-field-value">' + displayCardNumber + '</span></div>';
            html += '<div class="qsl-field"><span class="qsl-field-label">通联时间</span><span class="qsl-field-value time">' + displayQsoTime + '</span></div>';
            html += '<div class="qsl-field"><span class="qsl-field-label">呼号</span><span class="qsl-field-value callsign">' + displayCallSign + '</span></div>';
            html += '<div class="qsl-field"><span class="qsl-field-label">卡片类型</span><span class="qsl-field-value">' + displayCardType + '</span></div>';
            html += '<div class="qsl-field"><span class="qsl-field-label">级别</span><span class="qsl-field-value">' + displayCardClass + '</span></div>';
            html += '<div class="qsl-field"><span class="qsl-field-label">代数</span><span class="qsl-field-value">' + displayGeneration + '</span></div>';
            html += '</div>';
            html += '<a class="btn-view" data-img="' + imgUrl + '" data-cn="' + displayCardNumber + '" data-cs="' + displayCallSign + '"><i class="fas fa-image me-1"></i>查看</a>';
            html += '</div>';
        });

        resultsContainer.innerHTML = html;

        resultsContainer.querySelectorAll('.btn-view').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var imgUrl = this.getAttribute('data-img');
                var cn = this.getAttribute('data-cn');
                var cs = this.getAttribute('data-cs');
                openImageModal(imgUrl, cn, cs);
            });
        });
    });

    var imageModal = document.getElementById('imageModal');
    var modalImgWrap = document.getElementById('modalImgWrap');
    var modalImg = document.getElementById('modalImg');
    var modalLoading = document.getElementById('modalLoading');
    var modalError = document.getElementById('modalError');
    var modalErrorText = document.getElementById('modalErrorText');
    var modalClose = document.getElementById('modalClose');
    var zoomLabel = document.getElementById('zoomLabel');

    var currentScale = 1;

    function openImageModal(url, cardNumber, callSign) {
        currentScale = 1;
        modalImg.style.display = 'none';
        modalError.style.display = 'none';
        modalLoading.style.display = 'block';
        modalImg.style.transform = 'scale(1)';
        zoomLabel.textContent = '100%';
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        checkImageExists(url, function(exists) {
            modalLoading.style.display = 'none';
            if (exists) {
                modalImg.src = url;
                modalImg.style.display = 'block';
            } else {
                modalError.style.display = 'block';
                modalErrorText.textContent = '暂时缺失该卡片数据（' + cardNumber + (callSign !== '—' ? ' ' + callSign : '') + '）';
            }
        });
    }

    function closeImageModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
        modalImg.src = '';
        modalImg.style.display = 'none';
        currentScale = 1;
    }

    modalClose.addEventListener('click', closeImageModal);

    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) closeImageModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && imageModal.classList.contains('active')) {
            closeImageModal();
        }
    });

    function updateZoom() {
        modalImg.style.transform = 'scale(' + currentScale + ')';
        zoomLabel.textContent = Math.round(currentScale * 100) + '%';
    }

    document.getElementById('zoomInBtn').addEventListener('click', function() {
        if (currentScale < 5) {
            currentScale += 0.25;
            updateZoom();
        }
    });

    document.getElementById('zoomOutBtn').addEventListener('click', function() {
        if (currentScale > 0.25) {
            currentScale -= 0.25;
            updateZoom();
        }
    });

    document.getElementById('zoomResetBtn').addEventListener('click', function() {
        currentScale = 1;
        updateZoom();
    });

    modalImgWrap.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (e.deltaY < 0 && currentScale < 5) {
            currentScale += 0.1;
        } else if (e.deltaY > 0 && currentScale > 0.2) {
            currentScale -= 0.1;
        }
        currentScale = Math.round(currentScale * 100) / 100;
        updateZoom();
    });

    var isDragging = false;
    var startX, startY, scrollLeft, scrollTop;

    modalImgWrap.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = modalImgWrap.scrollLeft;
        scrollTop = modalImgWrap.scrollTop;
    });

    window.addEventListener('mouseup', function() {
        isDragging = false;
    });

    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        modalImgWrap.scrollLeft = scrollLeft + (startX - e.clientX);
        modalImgWrap.scrollTop = scrollTop + (startY - e.clientY);
    });

    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        themeSwitch.checked = true;
        switchToDarkTheme();
    }
})();