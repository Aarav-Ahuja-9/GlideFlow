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

        // 1. Establish session with initialize POST
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

            // Keep init stream alive
            initRes.on('data', () => {});
            initRes.on('end', () => {});

            // 2. Immediately send the actual method POST
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
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month'); // 1-indexed (e.g. 6 for June)

        const now = new Date();
        const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
        const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

        // Calculate timeMin and timeMax in ISO format
        const timeMin = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        // Set to last day of target month (date index 0 of next month is the last day of target month)
        const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

        const mcpUrl = 'https://api.corsair.dev/mcp/93fa7425b1a34ddc82d3d5128c1bf167?tenantId=aarav_dev';

        console.log(`Fetching calendar events from ${timeMin} to ${timeMax} ...`);
        
        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: {
                code: `
                const calendarEvents = await corsair.googlecalendar.api.events.getMany({
                    calendarId: "primary",
                    timeMin: "${timeMin}",
                    timeMax: "${timeMax}",
                    singleEvents: true,
                    maxResults: 150
                });
                return calendarEvents;
                `
            }
        });

        if (result.isError) {
            const errorText = result.content?.[0]?.text || "Unknown MCP GET Error";
            throw new Error(errorText);
        }

        const textResult = result.content?.[0]?.text;
        let items = [];
        if (textResult) {
            try {
                const parsedResult = JSON.parse(textResult);
                items = parsedResult.items || [];
            } catch (e) {
                console.error("Failed to parse calendar getMany JSON:", e);
            }
        }

        return NextResponse.json({
            success: true,
            year,
            month,
            items
        });

    } catch (error: any) {
        console.error("Calendar Sync GET Error:", error);
        return NextResponse.json({
            success: false,
            error: "Fetch Fail",
            details: error.message
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Corsair API Key is not set.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { event } = body;

        if (!event || !event.summary || !event.start || !event.end) {
            return NextResponse.json(
                { success: false, error: 'Missing required event fields (summary, start, end).' },
                { status: 400 }
            );
        }

        const mcpUrl = 'https://api.corsair.dev/mcp/93fa7425b1a34ddc82d3d5128c1bf167?tenantId=aarav_dev';

        console.log(`Creating calendar event: ${event.summary} ...`);

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: {
                code: `
                const newEvent = await corsair.googlecalendar.api.events.create({
                    calendarId: "primary",
                    event: ${JSON.stringify(event)}
                });
                return newEvent;
                `
            }
        });

        if (result.isError) {
            const errorText = result.content?.[0]?.text || "Unknown MCP POST Error";
            throw new Error(errorText);
        }

        const textResult = result.content?.[0]?.text;
        let createdEvent = null;
        if (textResult) {
            try {
                createdEvent = JSON.parse(textResult);
            } catch (e) {
                console.error("Failed to parse calendar create JSON:", e);
            }
        }

        return NextResponse.json({
            success: true,
            event: createdEvent
        });

    } catch (error: any) {
        console.error("Calendar Sync POST Error:", error);
        return NextResponse.json({
            success: false,
            error: "Create Fail",
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
                { success: false, error: 'Missing required event id parameter.' },
                { status: 400 }
            );
        }

        const mcpUrl = 'https://api.corsair.dev/mcp/93fa7425b1a34ddc82d3d5128c1bf167?tenantId=aarav_dev';

        console.log(`Deleting calendar event: ${id} ...`);

        const result = await callMcpWithRetry(mcpUrl, apiKey, "tools/call", {
            name: "run_script",
            arguments: {
                code: `
                await corsair.googlecalendar.api.events.delete({
                    calendarId: "primary",
                    id: "${id}"
                });
                return { success: true };
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
        console.error("Calendar Sync DELETE Error:", error);
        
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
