import { NextResponse } from 'next/server';
import https from 'https';
import { URL } from 'url';

function callMcp(mcpUrl: string, apiKey: string, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(mcpUrl);
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        };

        // 1. Establish the session with initialize POST
        const initData = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "hyperflow-backend", version: "1.0.0" }
            }
        });

        const initReq = https.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers
        }, (initRes) => {
            const sessionId = initRes.headers['mcp-session-id'];
            if (!sessionId) {
                initReq.destroy();
                return reject(new Error("Failed to retrieve mcp-session-id from response headers"));
            }

            // Keep initialization stream alive (consume chunks to prevent block)
            initRes.on('data', () => {});
            initRes.on('end', () => {});

            // 2. Immediately send the actual method POST request
            const requestData = JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method,
                params
            });

            const methodReq = https.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    ...headers,
                    'mcp-session-id': sessionId as string
                }
            }, (methodRes) => {
                let responseBody = '';
                methodRes.on('data', (chunk) => {
                    responseBody += chunk.toString();
                });

                methodRes.on('end', () => {
                    // Cleanup first connection
                    initReq.destroy();

                    if (methodRes.statusCode !== 200) {
                        return reject(new Error(`MCP method ${method} failed with status ${methodRes.statusCode}: ${responseBody}`));
                    }

                    try {
                        // Parse SSE response
                        const lines = responseBody.split('\n');
                        const dataLine = lines.find(line => line.trim().startsWith('data:'));
                        if (dataLine) {
                            const jsonStr = dataLine.slice(dataLine.indexOf('data:') + 5).trim();
                            const rpcResponse = JSON.parse(jsonStr);
                            if (rpcResponse.error) {
                                return reject(new Error(rpcResponse.error.message || JSON.stringify(rpcResponse.error)));
                            }
                            resolve(rpcResponse.result);
                        } else {
                            const rpcResponse = JSON.parse(responseBody);
                            if (rpcResponse.error) {
                                return reject(new Error(rpcResponse.error.message || JSON.stringify(rpcResponse.error)));
                            }
                            resolve(rpcResponse.result);
                        }
                    } catch (e: any) {
                        reject(new Error(`Failed to parse MCP response: ${e.message}. Raw: ${responseBody}`));
                    }
                });
            });

            methodReq.on('error', (err) => {
                initReq.destroy();
                reject(err);
            });

            methodReq.write(requestData);
            methodReq.end();
        });

        initReq.on('error', reject);
        initReq.write(initData);
        initReq.end();
    });
}

async function callMcpWithRetry(mcpUrl: string, apiKey: string, method: string, params: any, retries = 4): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await callMcp(mcpUrl, apiKey, method, params);
        } catch (e: any) {
            const isSessionError = e.message && (e.message.includes('Session not found') || e.message.includes('mcp-session-id'));
            if (isSessionError && attempt < retries) {
                console.warn(`[MCP] Session error on attempt ${attempt}/${retries}. Retrying in 200ms...`);
                await new Promise(r => setTimeout(r, 200));
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
        try {
            const date = new Date(dateHeader);
            time = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch (e) {}
    }

    const snippet = msg.snippet || '';

    // Find plain text body part recursively
    let fullBody = snippet;
    const findTextBody = (part: any): string | null => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            return part.body.data;
        }
        if (part.parts) {
            for (const subPart of part.parts) {
                const data = findTextBody(subPart);
                if (data) return data;
            }
        }
        return null;
    };

    const rawBodyData = msg.payload ? findTextBody(msg.payload) || msg.payload.body?.data : null;
    if (rawBodyData) {
        try {
            const base64 = rawBodyData.replace(/-/g, '+').replace(/_/g, '/');
            fullBody = Buffer.from(base64, 'base64').toString('utf-8');
            if (fullBody.length > 3000) {
                fullBody = fullBody.substring(0, 3000) + '\n\n... (truncated)';
            }
        } catch (e) {}
    }

    let priority = 'Updates';
    const lowerSub = subjectHeader.toLowerCase();
    const lowerSnip = snippet.toLowerCase();
    if (lowerSub.includes('urgent') || lowerSnip.includes('urgent') || lowerSub.includes('alert')) {
        priority = 'Urgent';
    } else if (lowerSub.includes('action') || lowerSnip.includes('action') || lowerSub.includes('todo') || lowerSub.includes('pr')) {
        priority = 'Action';
    }

    return {
        id: msg.id,
        from: fromName,
        senderEmail: senderEmail,
        initials: initials,
        subject: subjectHeader,
        priority: priority,
        time: time,
        snippet: snippet,
        fullBody: fullBody,
        hasAttachment: false,
        attachmentName: '',
        requiresReply: false
    };
}

export async function GET(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Corsair API Key is not set in environment variables.' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const mcpUrl = 'https://api.corsair.dev/mcp/93fa7425b1a34ddc82d3d5128c1bf167?tenantId=aarav_dev';

        if (id) {
            // 1. Fetch details of a single message ID
            const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
            console.log(`Calling MCP run_script to fetch details for message ${cleanId}...`);
            const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
                name: "run_script",
                arguments: {
                    code: `
                    const detail = await corsair.gmail.api.messages.get({ userId: "me", id: "${cleanId}" });
                    return detail;
                    `
                }
            });

            const textResult = result.content?.[0]?.text;
            if (textResult) {
                try {
                    const parsedDetail = JSON.parse(textResult);
                    const parsedEmail = parseGmailMessage(parsedDetail);
                    return NextResponse.json({
                        success: true,
                        data: parsedEmail
                    });
                } catch (e) {
                    console.error(`Failed to parse inner JSON-RPC detail response for ${cleanId}:`, e);
                }
            }
            return NextResponse.json({ success: false, error: 'Failed to retrieve details for email.' }, { status: 500 });
        } else {
            // 2. Fetch list of messages
            const pageToken = searchParams.get('pageToken') || null;
            const cleanPageToken = pageToken ? pageToken.replace(/[^a-zA-Z0-9_-]/g, '') : null;

            // Calculate date for 2 months ago dynamically (Gmail format: YYYY/MM/DD)
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            const yyyy = twoMonthsAgo.getFullYear();
            const mm = String(twoMonthsAgo.getMonth() + 1).padStart(2, '0');
            const dd = String(twoMonthsAgo.getDate()).padStart(2, '0');
            const dateQuery = `after:${yyyy}/${mm}/${dd}`;

            console.log(`Calling MCP run_script to list Gmail messages (pageToken: ${cleanPageToken}, q: ${dateQuery})...`);
            const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
                name: "run_script",
                arguments: {
                    code: `
                    const listResult = await corsair.gmail.api.messages.list({ 
                        userId: "me", 
                        maxResults: 8, 
                        q: "${dateQuery}",
                        ${cleanPageToken ? `pageToken: "${cleanPageToken}"` : ''} 
                    });
                    return listResult;
                    `
                }
            });

            const textResult = result.content?.[0]?.text;
            let messagesList = [];
            let nextPageToken = null;
            if (textResult) {
                try {
                    const parsedResult = JSON.parse(textResult);
                    messagesList = parsedResult.messages || [];
                    nextPageToken = parsedResult.nextPageToken || null;
                } catch (e) {
                    console.error("Failed to parse inner JSON-RPC list response:", e);
                }
            }

            return NextResponse.json({ 
                success: true, 
                messages: messagesList,
                nextPageToken: nextPageToken
            });
        }

    } catch (error: any) {
        console.error("MCP Execution Error:", error);
        return NextResponse.json({ 
            success: false,
            error: "Fetch Fail", 
            details: error.message 
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Corsair API Key is not set.' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing required message id parameter.' },
                { status: 400 }
            );
        }

        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
        const mcpUrl = 'https://api.corsair.dev/mcp/93fa7425b1a34ddc82d3d5128c1bf167?tenantId=aarav_dev';

        console.log(`Trashing Gmail message: ${cleanId} ...`);

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: {
                code: `
                const trashRes = await corsair.gmail.api.messages.trash({
                    userId: "me",
                    id: "${cleanId}"
                });
                return trashRes || { success: true };
                `
            }
        });

        if (result.isError) {
            const errorText = result.content?.[0]?.text || "Unknown MCP DELETE Error";
            throw new Error(errorText);
        }

        return NextResponse.json({
            success: true
        });

    } catch (error: any) {
        console.error("Gmail DELETE Error:", error);
        
        const isApprovalError = error.message && error.message.includes('Approval required');
        let approvalUrl = null;
        if (isApprovalError) {
            const match = error.message.match(/https:\/\/app\.corsair\.dev\/approve\/[^\s]+/);
            if (match) {
                approvalUrl = match[0];
            }
        }

        return NextResponse.json({
            success: false,
            error: isApprovalError ? "Approval Required" : "Delete Fail",
            approvalUrl,
            details: error.message
        }, { status: isApprovalError ? 403 : 500 });
    }
}