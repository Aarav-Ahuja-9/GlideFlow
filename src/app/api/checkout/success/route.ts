import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      isMocked 
    } = body;

    if (isMocked) {
      // Sandbox bypass for testing
      const { userId } = await auth();
      console.log(`[Checkout Success] Simulated success. Updating metadata for user: ${userId || 'guest'}`);
      
      if (userId) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            plan: 'Pro Plan'
          }
        });
      }

      return NextResponse.json({ success: true, plan: 'Pro Plan', simulated: true });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Live Razorpay Signature Verification
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !keySecret) {
      return NextResponse.json(
        { success: false, error: 'Missing payment signature verification parameters' },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('[Checkout Success] Invalid Razorpay signature verification failed.');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature verification failed.' },
        { status: 400 }
      );
    }

    // Signature verified! Update User Plan metadata in Clerk database
    console.log(`[Checkout Success] Verified Razorpay order: ${razorpay_order_id}. Updating user: ${userId}`);
    
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: 'Pro Plan'
      }
    });

    return NextResponse.json({ success: true, plan: 'Pro Plan', simulated: false });

  } catch (error: any) {
    console.error('[Checkout Success] Metadata update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Payment completion process failed', details: error.message },
      { status: 500 }
    );
  }
}
