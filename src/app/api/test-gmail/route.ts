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
        if (!methodResponse.ok) throw new Error(`MCP Method Fail: ${responseText}`);

        try {
            const lines = responseText.split('\n');
            const dataLine = lines.find(line => line.trim().startsWith('data:'));
            let rpcResponse;
            if (dataLine) {
                rpcResponse = JSON.parse(dataLine.slice(dataLine.indexOf('data:') + 5).trim());
            } else {
                rpcResponse = JSON.parse(responseText);
            }
            if (rpcResponse.error) throw new Error(rpcResponse.error.message);
            return rpcResponse.result;
        } catch (e: any) {
            throw new Error(`Parse Fail: ${e.message}`);
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
                // Fixed: Added Jitter (Random delay between 300ms and 700ms) to break the collision loop
                const backoffDelay = Math.floor(Math.random() * 400) + 300;
                console.warn(`[MCP] Mail Session collision. Retrying randomly in ${backoffDelay}ms...`);
                await new Promise(r => setTimeout(r, backoffDelay));
                continue;
            }
            throw e;
        }
    }
}

function parseGmailMessage(msg: any) {
    const headers = msg.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

    let fromName = fromHeader;
    let senderEmail = fromHeader;
    const emailMatch = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
    if (emailMatch) {
        fromName = emailMatch[1].replace(/['"]/g, '').trim() || emailMatch[2];
        senderEmail = emailMatch[2];
    }

    const initials = fromName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'UN';
    let time = 'Recent';
    if (dateHeader) {
        try { time = new Date(dateHeader).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch {}
    }

    return {
        id: msg.id,
        from: fromName,
        senderEmail: senderEmail,
        initials: initials,
        subject: subjectHeader,
        priority: subjectHeader.toLowerCase().includes('urgent') ? 'Urgent' : 'Updates',
        time: time,
        snippet: msg.snippet || '',
        fullBody: msg.snippet || '',
        hasAttachment: false,
        attachmentName: '',
        requiresReply: false
    };
}

export async function GET(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        
        const tenantId = encodeURIComponent(userId);
        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        if (id) {
            const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
            const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
                name: "run_script",
                arguments: { code: `return await corsair.gmail.api.messages.get({ userId: "me", id: "${cleanId}" });` }
            });
            const textResult = result.content?.[0]?.text;
            if (!textResult) throw new Error("No payload");
            return NextResponse.json({ success: true, data: parseGmailMessage(JSON.parse(textResult)) });
        } else {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const dateQuery = `after:${threeMonthsAgo.getFullYear()}/${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}/${String(threeMonthsAgo.getDate()).padStart(2, '0')}`;

            const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
                name: "run_script",
                arguments: {
                    code: `
                    const listResult = await corsair.gmail.api.messages.list({ userId: "me", maxResults: 10, q: "${dateQuery}" });
                    const messages = listResult.messages || [];
                    const detailResults = await Promise.allSettled(messages.map(m => corsair.gmail.api.messages.get({ userId: "me", id: m.id })));
                    const details = detailResults.filter(r => r.status === 'fulfilled').map(r => r.value);
                    return { details };
                    `
                }
            });

            const textResult = result.content?.[0]?.text;
            let messagesList = [];
            if (textResult) {
                messagesList = (JSON.parse(textResult).details || []).map((d: any) => {
                    try { return { ...parseGmailMessage(d), loading: false }; } catch { return null; }
                }).filter(Boolean);
            }
            return NextResponse.json({ success: true, messages: messagesList });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { userId } = await auth();
        if (!id || !userId) return NextResponse.json({ success: false }, { status: 400 });
        
        const tenantId = encodeURIComponent(userId);
        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: { code: `return await corsair.gmail.api.messages.trash({ userId: "me", id: "${id.replace(/[^a-zA-Z0-9_-]/g, '')}" });` }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, details: error.message }, { status: 500 });
    }
}