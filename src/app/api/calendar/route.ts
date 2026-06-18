import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { URL } from 'url';

export const dynamic = 'force-dynamic';

async function callMcp(mcpUrl: string, apiKey: string, method: string, params: any): Promise<any> {
    const initResponse = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "glideflow-backend", version: "1.0.0" }
            }
        }),
        cache: 'no-store',
        keepalive: true
    });

    const sessionId = initResponse.headers.get('mcp-session-id');
    if (!sessionId) {
        throw new Error("Failed to retrieve mcp-session-id from response headers");
    }

    const reader = initResponse.body?.getReader();
    let streamActive = true;
    if (reader) {
        (async () => {
            try {
                while (streamActive) {
                    const { done } = await reader.read();
                    if (done) break;
                }
            } catch (e) {}
        })();
    }

    try {
        const methodResponse = await fetch(mcpUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'mcp-session-id': sessionId
            },
            body: JSON.stringify({ jsonrpc: "2.0", id: 2, method, params }),
            cache: 'no-store'
        });

        const responseText = await methodResponse.text();
        if (!methodResponse.ok) throw new Error("MCP Fail");

        try {
            const lines = responseText.split('\n');
            const dataLine = lines.find(line => line.trim().startsWith('data:'));
            let rpcResponse;
            if (dataLine) {
                rpcResponse = JSON.parse(dataLine.slice(dataLine.indexOf('data:') + 5).trim());
            } else {
                rpcResponse = JSON.parse(responseText);
            }
            if (rpcResponse.error) throw new Error("RPC error");
            return rpcResponse.result;
        } catch (e: any) {
            throw new Error("Parse Fail");
        }
    } finally {
        streamActive = false;
        if (reader) reader.cancel().catch(() => {});
    }
}

async function callMcpWithRetry(mcpUrl: string, apiKey: string, method: string, params: any, retries = 5): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await callMcp(mcpUrl, apiKey, method, params);
        } catch (e: any) {
            const isSessionError = e.message && (e.message.includes('Session not found') || e.message.includes('mcp-session-id'));
            if (isSessionError && attempt < retries) {
                // Fixed: Added Jitter (Random delay between 300ms and 700ms) to break collision loop
                const backoffDelay = Math.floor(Math.random() * 400) + 300;
                console.warn(`[MCP] Calendar Session collision. Retrying randomly in ${backoffDelay}ms...`);
                await new Promise(r => setTimeout(r, backoffDelay));
                continue;
            }
            throw e;
        }
    }
}

export async function GET(request: Request) {
    // 🔥 ANTI-COLLISION STAGGER: Wait 800ms before starting to let Mail route initialize cleanly first
    await new Promise(r => setTimeout(r, 800));

    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');

        const now = new Date();
        const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
        const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

        const timeMin = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

        const { userId } = await auth();
        if (!userId) return NextResponse.json({ success: false }, { status: 401 });
        
        const tenantId = encodeURIComponent(userId);
        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        console.log(`Fetching calendar events dynamically...`);
        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: {
                code: `
                const calendarEvents = await corsair.googlecalendar.api.events.getMany({
                    calendarId: "primary",
                    timeMin: "${timeMin}",
                    timeMax: "${timeMax}",
                    singleEvents: true,
                    maxResults: 50
                });
                return calendarEvents;
                `
            }
        });

        const textResult = result.content?.[0]?.text;
        let items = [];
        if (textResult) {
            try { items = JSON.parse(textResult).items || []; } catch {}
        }
        return NextResponse.json({ success: true, year, month, items });
    } catch (error: any) {
        return NextResponse.json({ success: false, details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        const body = await request.json();
        const { event } = body;
        const { userId } = await auth();
        if (!event || !userId) return NextResponse.json({ success: false }, { status: 400 });
        
        const tenantId = encodeURIComponent(userId);
        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: { code: `return await corsair.googlecalendar.api.events.create({ calendarId: "primary", event: ${JSON.stringify(event)} });` }
        });

        const textResult = result.content?.[0]?.text;
        return NextResponse.json({ success: true, event: textResult ? JSON.parse(textResult) : null });
    } catch (error: any) {
        return NextResponse.json({ success: false, details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { userId } = await auth();
        if (!id || !userId) return NextResponse.json({ success: false }, { status: 400 });
        
        const tenantId = encodeURIComponent(userId);
        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: { code: `await corsair.googlecalendar.api.events.delete({ calendarId: "primary", eventId: "${id.replace(/[^a-zA-Z0-9_-]/g, '')}" }); return { success: true };` }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, details: error.message }, { status: 500 });
    }
}