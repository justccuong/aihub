import { NextRequest, NextResponse } from 'next/server'

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
    // Check the origin from the request
    const origin = request.headers.get('origin') ?? ''
    const originAllowed = isAllowedOrigin(origin)

    // Handle preflighted requests
    const isPreflight = request.method === 'OPTIONS'

    if (isPreflight) {
        const preflightHeaders = {
            ...(originAllowed && { 'Access-Control-Allow-Origin': origin }),
            ...corsOptions,
        }
        return NextResponse.json({}, { headers: preflightHeaders })
    }

    // Handle simple requests
    const response = NextResponse.next()

    if (originAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin)
    }

    Object.entries(corsOptions).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
}

export const config = {
    matcher: '/api/:path*',
}
