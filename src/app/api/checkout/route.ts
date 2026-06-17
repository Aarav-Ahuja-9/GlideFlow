import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, couponApplied } = body;

    // Standard pricing configuration
    // Pro Plan: $15.00 / month approx ₹1,299. Using INR for native Razorpay compatibility.
    let baseAmount = 1299; // in rupees
    if (couponApplied) {
      baseAmount = Math.round(baseAmount * 0.5); // 50% discount
    }

    const amountInPaise = baseAmount * 100; // Razorpay expects amount in smallest subunit (paise)
    const currency = 'INR';

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if test keys are present and not dummy placeholders
    const areKeysValid = keyId && keySecret && !keyId.includes('dummy') && !keyId.includes('YOUR_');

    if (!areKeysValid) {
      // Return a simulated mock order for seamless local sandbox testing
      console.log('Using simulated mockup Razorpay Order due to dummy credentials in environment.');
      return NextResponse.json({
        success: true,
        orderId: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        amount: amountInPaise,
        currency,
        keyId: keyId || 'rzp_test_HyperFlowDemo2026',
        isMocked: true,
      });
    }

    // Call real Razorpay API
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          plan,
          couponApplied: couponApplied ? 'yes' : 'no',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay API error: ${errorText}`);
    }

    const order = await response.json();

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      isMocked: false,
    });

  } catch (error: any) {
    console.error('Create Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Order Creation Fail', details: error.message },
      { status: 500 }
    );
  }
}
