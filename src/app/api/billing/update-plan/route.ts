import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !['free', 'pro', 'plus'].includes(plan.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan option. Plan must be free, pro, or plus.' },
        { status: 400 }
      );
    }

    const planLower = plan.toLowerCase() as 'free' | 'pro' | 'plus';
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ success: false, error: 'User email not found in Clerk.' }, { status: 400 });
    }

    // 1. Sync / Update User Plan in Prisma Database
    await prisma.user.upsert({
      where: { email },
      update: { plan: planLower },
      create: {
        id: userId,
        email,
        name: clerkUser.fullName || clerkUser.firstName || email.split('@')[0],
        plan: planLower,
      },
    });

    // 2. Sync / Update publicMetadata in Clerk
    const displayPlan = planLower === 'pro' ? 'Pro Plan' : planLower === 'plus' ? 'Plus Plan' : 'Free Plan';
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: displayPlan,
      },
    });

    return NextResponse.json({ success: true, plan: displayPlan });
  } catch (error: any) {
    console.error('Failed to update plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plan.', details: error.message },
      { status: 500 }
    );
  }
}
