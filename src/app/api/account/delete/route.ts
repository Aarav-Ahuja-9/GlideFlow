import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE() {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const email = user?.primaryEmailAddress?.emailAddress;
        
        // Delete all events, settings, and User from database if present
        if (email) {
            console.log(`[API] Deleting account data for email: ${email}`);
            
            // Delete settings and events associated with this user
            const dbUser = await prisma.user.findUnique({
                where: { email }
            });
            
            if (dbUser) {
                // Delete user settings
                await prisma.settings.deleteMany({
                    where: { userId: dbUser.id }
                });
                
                // Delete user events
                await prisma.event.deleteMany({
                    where: { userId: dbUser.id }
                });
                
                // Delete emails where user is sender or receiver
                await prisma.email.deleteMany({
                    where: {
                        OR: [
                            { senderId: dbUser.id },
                            { receiverId: dbUser.id }
                        ]
                    }
                });
                
                // Delete user record itself
                await prisma.user.delete({
                    where: { id: dbUser.id }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete account:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
