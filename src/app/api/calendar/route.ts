import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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
        const text = await initResponse.text();
        if (text.includes("Approval required") || text.includes("approve")) {
            throw new Error(`Approval required. Click here to approve: ${text}`);
        }
        throw new Error(`Failed to retrieve mcp-session-id from response headers. Status: ${initResponse.status}. Response: ${text}`);
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
            } catch (e) { }
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
            if (rpcResponse.error) throw new Error(rpcResponse.error.message || "RPC error");
            return rpcResponse.result;
        } catch (e: any) {
            if (e.message && e.message !== "Parse Fail") throw e;
            throw new Error("Parse Fail");
        }
    } finally {
        streamActive = false;
        if (reader) reader.cancel().catch(() => { });
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
        if (!apiKey) return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');

        const now = new Date();
        const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
        const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

        const timeMin = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

        const { userId } = await auth();
        const user = await currentUser();
        if (!userId) return NextResponse.json({ success: false }, { status: 401 });

        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const googleConnected = user?.publicMetadata?.googleConnected === true;
        const version = user?.publicMetadata?.googleConnectionVersion || 1;
        if (!googleConnected) {
            return NextResponse.json({ 
                success: false, 
                error: "Approval Required"
            }, { status: 403 });
        }

        const rawEmail = user?.primaryEmailAddress?.emailAddress || userId;
        const tenantId = encodeURIComponent(`${rawEmail}_v${version}`);
        console.log(`[API] Calendar GET - userId: "${userId}", email: "${user?.primaryEmailAddress?.emailAddress}", tenantId: "${tenantId}"`);
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
            try { items = JSON.parse(textResult).items || []; } catch { }
        }
        return NextResponse.json({ success: true, year, month, items });
    } catch (error: any) {
        const isApprovalError = error.message && (error.message.includes('Approval required') || error.message.includes('approve'));
        return NextResponse.json({ 
            success: false, 
            error: isApprovalError ? "Approval Required" : error.message
        }, { status: isApprovalError ? 403 : 500 });
    }
}

export async function POST(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });
        const body = await request.json();
        const { event } = body;
        const { userId } = await auth();
        const user = await currentUser();
        if (!event || !userId) return NextResponse.json({ success: false }, { status: 400 });

        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const googleConnected = user?.publicMetadata?.googleConnected === true;
        const version = user?.publicMetadata?.googleConnectionVersion || 1;
        if (!googleConnected) {
            return NextResponse.json({ 
                success: false, 
                error: "Approval Required"
            }, { status: 403 });
        }

        const rawEmail = user?.primaryEmailAddress?.emailAddress || userId;
        const tenantId = encodeURIComponent(`${rawEmail}_v${version}`);
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: { code: `return await corsair.googlecalendar.api.events.create({ calendarId: "primary", event: ${JSON.stringify(event)} });` }
        });

        const textResult = result.content?.[0]?.text;
        if (result.isError) {
            console.error("MCP returned isError=true:", textResult);
            return NextResponse.json({ success: false, error: textResult }, { status: 500 });
        }
        return NextResponse.json({ success: true, event: textResult ? JSON.parse(textResult) : null });
    } catch (error: any) {
        console.error("Calendar POST Error:", error);
        const isApprovalError = error.message && (error.message.includes('Approval required') || error.message.includes('approve'));
        return NextResponse.json({ 
            success: false, 
            error: isApprovalError ? "Approval Required" : error.message
        }, { status: isApprovalError ? 403 : 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { userId } = await auth();
        const user = await currentUser();
        if (!id || !userId) return NextResponse.json({ success: false }, { status: 400 });

        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const googleConnected = user?.publicMetadata?.googleConnected === true;
        if (!googleConnected) {
            return NextResponse.json({ success: false, error: "Google connection un-authorized by user settings" }, { status: 403 });
        }
        const version = user?.publicMetadata?.googleConnectionVersion || 1;
        const rawEmail = user?.primaryEmailAddress?.emailAddress || userId;
        const tenantId = encodeURIComponent(`${rawEmail}_v${version}`);
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        console.log(`[API] Calendar DELETE event request - id: "${id}", tenantId: "${tenantId}"`);

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: { code: `await corsair.googlecalendar.api.events.delete({ calendarId: "primary", id: "${id.replace(/[^a-zA-Z0-9_-]/g, '')}" }); return { success: true };` }
        });
        if (result.isError) {
            const errMsg = result.content?.[0]?.text || "Unknown deletion error";
            console.error("Calendar DELETE MCP returned error:", errMsg);
            return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Calendar DELETE Error:", error);
        const isApprovalError = error.message && (error.message.includes('Approval required') || error.message.includes('approve'));
        return NextResponse.json({ 
            success: false, 
            error: isApprovalError ? "Approval Required" : error.message
        }, { status: isApprovalError ? 403 : 500 });
    }
}