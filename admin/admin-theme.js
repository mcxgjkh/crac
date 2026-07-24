// admin-theme.js – 主题色、布局切换、暗色模式
(function() {
    // ---- 预设颜色 ----
    var presetColors = [
        '#3986FF', '#2563EB', '#6169FF', '#8076C3',
        '#1BA784', '#316C72', '#FF6B35', '#0099FF',
        '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
    ];

    // ---- 布局定义 ----
    var layouts = [
        { id: 'dual', label: '臻享双栏', desc: '品牌展示 + 登录表单', icon: 'fa-columns' },
        { id: 'glass', label: '动感玻璃', desc: '光斑动效与仪表盘装饰', icon: 'fa-glass-whiskey' },
        { id: 'slide', label: '滑动登录', desc: '登录 / 注册滑动切换', icon: 'fa-arrows-alt-h' },
        { id: 'bubble', label: '气泡简约', desc: '气泡背景轻量卡片', icon: 'fa-circle' },
        { id: 'immersive', label: '分屏沉浸', desc: '大屏分栏沉浸布局', icon: 'fa-arrows-alt' },
        { id: 'classic', label: '经典点阵', desc: '蓝图网格 + 终端登录面板', icon: 'fa-th' }
    ];

    var container = document.getElementById('loginContainer');
    var htmlEl = document.documentElement;
    var currentLayout = 'dual';
    var currentTheme = 'dark'; // 'dark' or 'light'

    // ---- 初始化颜色网格 ----
    var grid = document.getElementById('themeColorsGrid');
    presetColors.forEach(function(color) {
        var swatch = document.createElement('button');
        swatch.className = 'theme-swatch';
        swatch.style.setProperty('--swatch-color', color);
        swatch.dataset.color = color;
        swatch.addEventListener('click', function() {
            setThemeColor(color);
        });
        grid.appendChild(swatch);
    });

    // 自定义颜色
    var customPicker = document.getElementById('customColorPicker');
    var customHex = document.getElementById('customHexDisplay');
    customPicker.addEventListener('input', function() {
        var color = this.value;
        customHex.textContent = color.toUpperCase();
        setThemeColor(color);
    });

    // ---- 设置主题色 ----
    function setThemeColor(color) {
        // 更新 CSS 变量
        var rgb = hexToRgb(color);
        document.documentElement.style.setProperty('--primary-color', color);
        document.documentElement.style.setProperty('--primary-rgb', rgb.join(','));
        // 高亮选中的预设
        document.querySelectorAll('.theme-swatch').forEach(function(el) {
            el.classList.toggle('active', el.dataset.color === color);
        });
        customPicker.value = color;
        customHex.textContent = color.toUpperCase();
        // 预览条
        var preview = document.getElementById('themeColorPreview');
        if (preview) preview.style.background = color;
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)] : [57,134,255];
    }

    // ---- 初始化布局 ----
    var layoutGrid = document.getElementById('layoutGrid');
    layouts.forEach(function(layout) {
        var card = document.createElement('button');
        card.className = 'layout-card' + (layout.id === currentLayout ? ' active' : '');
        card.dataset.layout = layout.id;
        card.innerHTML = '<div class="layout-preview ' + layout.id + '"><div class="brand-block"></div><div class="form-block"></div></div><span class="layout-label">' + layout.label + '</span><span class="layout-desc">' + layout.desc + '</span>';
        card.addEventListener('click', function() {
            setLayout(layout.id);
        });
        layoutGrid.appendChild(card);
    });

    // ---- 切换布局 ----
    function setLayout(id) {
        currentLayout = id;
        container.dataset.layout = id;
        document.querySelectorAll('.layout-card').forEach(function(el) {
            el.classList.toggle('active', el.dataset.layout === id);
        });
        // 同时更新 body 类以便特定样式
        document.body.className = document.body.className.replace(/layout-\w+/g, '').trim();
        document.body.classList.add('layout-' + id);
        // 触发重新计算动画等
    }

    // ---- 暗色切换 ----
    var modeTrigger = document.getElementById('themeModeTrigger');
    var modeIcon = document.getElementById('themeModeIcon');
    modeTrigger.addEventListener('click', function() {
        var isDark = htmlEl.classList.toggle('dark');
        currentTheme = isDark ? 'dark' : 'light';
        modeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        container.dataset.theme = currentTheme;
        // 同时更新 login-container 类
        document.body.classList.toggle('dark-theme', isDark);
    });

    // ---- 工具栏弹出 ----
    var colorPopover = document.getElementById('themeColorPopover');
    var layoutPopover = document.getElementById('layoutPopover');
    document.getElementById('themeColorTrigger').addEventListener('click', function(e) {
        e.stopPropagation();
        colorPopover.classList.toggle('show');
        layoutPopover.classList.remove('show');
    });
    document.getElementById('layoutTrigger').addEventListener('click', function(e) {
        e.stopPropagation();
        layoutPopover.classList.toggle('show');
        colorPopover.classList.remove('show');
    });
    document.addEventListener('click', function() {
        colorPopover.classList.remove('show');
        layoutPopover.classList.remove('show');
    });
    // 阻止点击内部冒泡关闭
    [colorPopover, layoutPopover].forEach(function(el) {
        el.addEventListener('click', function(e) { e.stopPropagation(); });
    });

    // ---- 设置默认颜色 ----
    setThemeColor('#3986FF');
    setLayout('dual');
    // 默认暗色
    htmlEl.classList.add('dark');
    document.body.classList.add('dark-theme');

    // 暴露方法供其它模块使用
    window.__theme = {
        setColor: setThemeColor,
        setLayout: setLayout,
        toggleTheme: function() { modeTrigger.click(); }
    };
})();