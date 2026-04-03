import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const i18nMiddleware = createMiddleware(routing);

const allowedOriginPatterns = [
    // Allow localhost with any port
    /^https?:\/\/localhost(:\d+)?$/,
    // Allow same subdomain (e.g., *.jsclub.dev)
    /^https?:\/\/([a-z0-9-]+\.)*jsclub\.dev$/,
]

const corsOptions = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
}

function isAllowedOrigin(origin: string): boolean {
    return allowedOriginPatterns.some(pattern => pattern.test(origin))
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Handle API routes with CORS
    if (pathname.startsWith('/api')) {
        const origin = request.headers.get('origin') ?? ''
        const originAllowed = isAllowedOrigin(origin)

        // Handle preflighted requests
        if (request.method === 'OPTIONS') {
            const preflightHeaders = {
                ...(originAllowed && { 'Access-Control-Allow-Origin': origin }),
                ...corsOptions,
            }
            return NextResponse.json({}, { headers: preflightHeaders })
        }

        const response = NextResponse.next()
        if (originAllowed) {
            response.headers.set('Access-Control-Allow-Origin', origin)
        }

        Object.entries(corsOptions).forEach(([key, value]) => {
            response.headers.set(key, value)
        })

        return response
    }

    // 2. Handle Internationalization for all other routes
    return i18nMiddleware(request);
}

export const config = {
    matcher: [
        // API routes - needed for CORS handling
        '/api/:path*',

        // Enable a redirect to a matching locale at the root
        '/',

        // Set a cookie to remember the previous locale
        '/(vi|en)/:path*',

        // Enable redirects for all pages without a locale prefix
        // (excluding _next, api, and public files with extensions)
        '/((?!api|_next|_vercel|.*\\..*).*)',
    ]
}
