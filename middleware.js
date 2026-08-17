// middleware.js
export const runtime = 'edge';
import { isbot } from 'isbot';

// 把你 403.html 的全部内容（包括样式和 HTML 结构）复制到下面的模板字符串中
const FORBIDDEN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 - Forbidden</title>
    <style>
        @font-face {
            font-family: "font";
            src:url("font.woff2") format("woff2");
            font-weight: normal;
            font-style: normal;
        }

        body,
        html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            background-color: #0060ff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            /* 强制使用黑体 */
            font-family: "SimHei", "STHeiti", "Heiti SC", "Microsoft YaHei", sans-serif;
        }

        /* 主提示语容器 */
        .message-container {
            text-align: center;
            margin-top: -8vh;
            /* 向上微调，留出下方落款空间 */
            width: 100%;
        }

        .main-text,
        .sub-text {
            display: block;
            /* 保持较大的字号 */
            font-size: 5.2vw;
            font-weight: normal;
            /* 调小字间距，从 0.15em 降至 0.05em */
            letter-spacing: 0.05em;
            line-height: 1.4;
            margin-bottom: 2vh;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            /* 轻微投影增加立体感 */
        }

        .text403 {
            font-family: "font";
            display: block;
            /* 保持较大的字号 */
            font-size: 3vw;
            font-weight: normal;
            /* 调小字间距，从 0.15em 降至 0.05em */
            letter-spacing: 0.15em;
            line-height: 1.4;
            margin-bottom: 2vh;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            /* 轻微投影增加立体感 */
        }

        .error {
            color: #ff3737;
            text-shadow: 
                0 0 8px rgba(255, 0, 0, 0.6),
                0 0 16px rgba(255, 0, 0, 0.5);  /* 轻微光晕 */
        }

        /* 右下角落款容器 */
        .footer {
            position: absolute;
            bottom: 15vh;
            right: 10vw;
            /* 固定宽度以实现对齐参照 */
            width: 28vw;
        }

        .footer-text {
            display: block;
            font-size: 1.6vw;
            line-height: 1.8;
            /* 关键：强制两端对齐 */
            text-align: justify;
            text-align-last: justify;
            -moz-text-align-last: justify;
        }

        /* 移动端适配 */
        @media (max-width: 768px) {

            .main-text,
            .sub-text {
                font-size: 32px;
                letter-spacing: 0.02em;
            }

            .footer {
                width: 240px;
                bottom: 10vh;
                right: 5vw;
            }

            .footer-text {
                font-size: 14px;
            }
        }
    </style>
</head>

<body>

    <div class="message-container">
        <div class="text403">
            <span class="error">Error </span>
            <span class="error">403</span>
        </div>
        <div class="main-text">此计算机因违规外联已被阻断</div>
        <div class="sub-text">请等待安全部门与你联系</div>
    </div>

    <div class="footer">
        <div class="footer-text">中央保密委员会办公室</div>
        <div class="footer-text">中央密码工作领导小组办公室</div>
    </div>

</body>

</html>`;

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // 使用 isbot 检测爬虫
  if (isbot(userAgent)) {
    // 返回 403 状态码和自定义 HTML
    return new Response(FORBIDDEN_HTML, {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // 可选：阻止搜索引擎索引这个错误页
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 正常用户继续访问（什么也不返回，或者返回 undefined）
  // 对于静态站点，直接 return; 即可
}

// 可选配置：匹配哪些路径（默认所有路径）
export const config = {
  matcher: [
    // 匹配所有路径，排除静态资源（图片、CSS、JS 等）
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};