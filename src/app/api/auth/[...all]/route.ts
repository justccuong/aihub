import { createAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

async function handleAuth(request: NextRequest) {
    try {
        const auth = await createAuth();
        return auth.handler(request);
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return handleAuth(request);
}

export async function POST(request: NextRequest) {
    return handleAuth(request);
}
