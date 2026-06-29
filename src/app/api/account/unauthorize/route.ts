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
        const user = await client.users.getUser(userId);
        const currentVersion = (user.publicMetadata?.googleConnectionVersion as number) || 1;

        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                googleConnected: false,
                googleConnectionVersion: currentVersion + 1
            }
        });

        console.log(`[API] Google integration un-authorized and version bumped to ${currentVersion + 1} for userId: ${userId}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to unauthorize Google account:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
