// middleware.js
export function middleware(request) {
  // 直接拦截所有请求，返回一个显眼的测试页面
  return new Response(
    `<h1>Middleware is working!</h1><p>If you see this, middleware is active.</p>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
}