import { NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        if (!userId || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key missing' }, { status: 500 });
        }

        const integrationId = process.env.CORSAIR_INTEGRATION_ID || "93fa7425b1a34ddc82d3d5128c1bf167";
        const version = user?.publicMetadata?.googleConnectionVersion || 1;
        const email = user?.primaryEmailAddress?.emailAddress || userId;
        const tenantId = encodeURIComponent(`${email}_v${version}`);
        const mcpUrl = `https://api.corsair.dev/mcp/${integrationId}?tenantId=${tenantId}`;

        console.log(`[API] On-demand connect requested for tenantId: ${tenantId}`);

        // Establish the session with initialize POST to get the approval URL
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
            cache: 'no-store'
        });

        const client = await clerkClient();
        const sessionId = initResponse.headers.get('mcp-session-id');
        if (sessionId) {
            // Already connected/authorized!
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    googleConnected: true
                }
            });
            return NextResponse.json({ success: true, alreadyConnected: true });
        }

        const text = await initResponse.text();
        if (text.includes("Approval required") || text.includes("approve")) {
            // Extract the URL
            const match = text.match(/https:\/\/app\.corsair\.dev\/approve\/[^\s]+/);
            const approvalUrl = match ? match[0] : null;
            if (approvalUrl) {
                await client.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        googleConnected: true
                    }
                });
                return NextResponse.json({ success: true, approvalUrl });
            }
        }

        return NextResponse.json({ success: false, error: `Failed to initiate connection: ${text}` }, { status: 400 });
    } catch (error: any) {
        console.error("Connect route error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
