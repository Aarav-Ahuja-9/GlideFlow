import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                googleConnected: true
            }
        });

        console.log(`[API] Google integration status set to active for userId: ${userId}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to authorize Google account:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
