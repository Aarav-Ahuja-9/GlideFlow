import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, couponCode } = body;

    let baseAmount = plan === 'Plus' ? 2499 : 1299;
    const code = (couponCode || '').trim().toUpperCase();
    const fiftyPercentPrefixes = ['FLOW', 'CODE', 'SYNC', 'ZERO', 'HYPER', 'WAVE'];
    const couponApplied = code === 'DEMO99' || code === 'FLOW99' || code === 'DEMO50' || fiftyPercentPrefixes.some(prefix => code.startsWith(prefix));

    if (code === 'DEMO99' || code === 'FLOW99') {
      baseAmount = Math.max(1, Math.round(baseAmount * 0.01));
    } else if (code === 'DEMO50' || fiftyPercentPrefixes.some(prefix => code.startsWith(prefix))) {
      baseAmount = Math.round(baseAmount * 0.5);
    }

    const amountInPaise = baseAmount * 100;
    const currency = 'INR';

    if (amountInPaise < 100) {
      return NextResponse.json(
        { success: false, error: 'Amount must be at least ₹1.00 (100 paise).' },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials are missing in environment variables.');
      return NextResponse.json(
        { success: false, error: 'Razorpay credentials are not configured.' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        plan: plan || 'Pro',
        couponApplied: couponApplied ? 'yes' : 'no',
        couponCode: code || 'NONE',
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    const status = error?.statusCode === 401 ? 401 : 500;
    const message = error?.error?.description || error.message || 'Order creation failed.';
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
