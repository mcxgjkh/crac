// middleware.js
export const runtime = 'edge';  // 显式声明为 Edge Runtime

export function middleware(request) {
  // 直接返回测试页面
  return new Response(
    `<h1>✅ Edge Middleware is ACTIVE</h1>
     <p>If you see this, middleware is working!</p>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export const config = {
  matcher: ['/(.*)'],
};