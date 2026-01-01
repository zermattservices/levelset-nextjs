import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  
  // Only apply to roadmap.levelset.io subdomain
  if (host === 'roadmap.levelset.io' || host.startsWith('roadmap.levelset.io:')) {
    const pathname = url.pathname;
    
    // Don't rewrite static files, API routes, or already rewritten paths
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.') // Static files like favicon.ico, images, etc.
    ) {
      return NextResponse.next();
    }
    
    // Skip if already in /roadmap/ path (internal routing)
    if (pathname.startsWith('/roadmap/')) {
      return NextResponse.next();
    }
    
    // Route mapping for roadmap subdomain:
    // / or /features → /roadmap (features list)
    // /roadmap → /roadmap/board (roadmap board)
    // /[id] → /roadmap/[id] (feature detail)
    if (pathname === '/' || pathname === '/features') {
      url.pathname = '/roadmap';
      return NextResponse.rewrite(url);
    }
    
    if (pathname === '/roadmap') {
      url.pathname = '/roadmap/board';
      return NextResponse.rewrite(url);
    }
    
    // All other paths get prefixed with /roadmap
    url.pathname = `/roadmap${pathname}`;
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
