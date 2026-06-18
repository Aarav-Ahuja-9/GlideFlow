import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification parameters.' },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('[Checkout Success] Razorpay secret is not configured.');
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: Razorpay secret missing.' },
        { status: 500 }
      );
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('[Checkout Success] Invalid Razorpay signature verification failed.');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature.' },
        { status: 400 }
      );
    }

    console.log(`[Checkout Success] Verified Razorpay order: ${razorpay_order_id}. Updating user: ${userId} to plan: ${plan}`);

    const planName = plan || 'Pro';
    const clerkPlanValue = planName.toLowerCase() === 'plus' ? 'Plus Plan' : planName.toLowerCase() === 'pro' ? 'Pro Plan' : 'Free Plan';
    const dbPlanValue = planName.toLowerCase() as 'free' | 'pro' | 'plus';

    const client = await clerkClient();
    
    // 1. Update Clerk user metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: clerkPlanValue,
      },
    });

    // 2. Sync to Database
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    
    if (email) {
      await prisma.user.upsert({
        where: { email },
        update: { plan: dbPlanValue },
        create: {
          id: userId,
          email,
          name: clerkUser.fullName || clerkUser.firstName || email.split('@')[0],
          plan: dbPlanValue,
        },
      });
    }

    return NextResponse.json({ success: true, plan: clerkPlanValue });
  } catch (error: any) {
    console.error('[Checkout Success] Metadata update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Payment completion process failed', details: error.message },
      { status: 500 }
    );
  }
}
