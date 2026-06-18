'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Script from 'next/script';
import { 
  ArrowLeft, BrainCircuit, ShieldCheck, Zap, 
  HelpCircle, CreditCard, Sparkles, Loader2, Check 
} from 'lucide-react';
import styles from './checkout.module.css';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'Pro';
  const basePrice = planParam === 'Plus' ? 2499 : 1299;

  const { user, isLoaded: isUserLoaded } = useUser();

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  
  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);

  // Prefill user details from Clerk context
  useEffect(() => {
    if (isUserLoaded && user) {
      setName(user.fullName || '');
      setEmail(user.primaryEmailAddress?.emailAddress || '');
    }
  }, [isUserLoaded, user]);

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = coupon.trim().toUpperCase();
    if (!code) return;

    const fiftyPercentPrefixes = ['FLOW', 'CODE', 'SYNC', 'ZERO', 'HYPER', 'WAVE'];

    if (code === 'DEMO99' || code === 'FLOW99') {
      setDiscountPercent(99);
      setCouponApplied(true);
      setCouponCode(code);
      setCouponError('');
      return;
    }

    if (code === 'DEMO50' || fiftyPercentPrefixes.some(prefix => code.startsWith(prefix))) {
      setDiscountPercent(50);
      setCouponApplied(true);
      setCouponCode(code);
      setCouponError('');
      return;
    }

    setCouponError('Invalid promo coupon code. Try FLOW123, DEMO50, FLOW99, or DEMO99.');
    setCouponApplied(false);
    setCouponCode('');
    setDiscountPercent(0);
  };

  const handlePayment = async () => {
    if (!email.trim() || !name.trim()) {
      alert('Please fill in your name and email address to continue.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order on server
      const orderRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planParam,
          couponCode: couponApplied ? couponCode : '',
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK script not loaded. Please wait a second and retry.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GlideFlow Inc.',
        description: `${planParam} Plan Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: '#22c55e',
        },
        handler: async function (response: any) {
          setIsProcessing(true);
          setCheckoutError('');
          try {
            const verifyRes = await fetch('/api/checkout/success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planParam,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            setReceiptDetails({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              amount: `₹${Math.max(1, Math.round(basePrice * (100 - discountPercent) / 100)).toLocaleString()}.00`,
              plan: `GlideFlow ${planParam} Plan`,
              date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
            });

            setIsSuccess(true);
          } catch (err: any) {
            setCheckoutError(err?.message || 'Payment verification failed.');
            console.error('Payment verification failure', err);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setCheckoutError('Payment was cancelled. Please try again if you still want to subscribe.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setIsProcessing(false);
        setCheckoutError('Payment failed. Please check your details or try a different card.');
        console.error('Razorpay payment failed', response);
      });

      rzp.open();
      setIsProcessing(false);

    } catch (error: any) {
      console.error('Payment Error:', error);
      alert(`Payment failed to initialize: ${error.message}`);
      setIsProcessing(false);
    }
  };

  if (isSuccess && receiptDetails) {
    return (
      <div className={styles.wrapper}>
        <main className={styles.successWrapper}>
          <div className={styles.successIcon}>
            <Check size={36} />
          </div>
          <h1 className={styles.successTitle}>Payment Successful!</h1>
          <p className={styles.successDesc}>
            Congratulations! Your workspace has been upgraded to the <b>Pro Plan</b>. 
            All keyboard shortcuts and AI features are now fully unlocked.
          </p>

          <div className={styles.receiptCard}>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Subscription:</span>
              <span className={styles.receiptValue}>{receiptDetails.plan}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Amount Paid:</span>
              <span className={styles.receiptValue}>{receiptDetails.amount}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Payment ID:</span>
              <span className={styles.receiptValue} style={{ fontFamily: 'monospace' }}>{receiptDetails.paymentId}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Order ID:</span>
              <span className={styles.receiptValue} style={{ fontFamily: 'monospace' }}>{receiptDetails.orderId}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Transaction Date:</span>
              <span className={styles.receiptValue}>{receiptDetails.date}</span>
            </div>
          </div>

          <button 
            className={styles.dashboardBtn}
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard <Zap size={16} />
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Dynamic Razorpay Script Loader */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        strategy="lazyOnload"
      />

      <header className={styles.navbar}>
        <div className={styles.logo} onClick={() => router.push('/')}>
          <BrainCircuit color="#22c55e" size={24} />
          <span>glide-flow</span>
        </div>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          <ArrowLeft size={16} /> Return to Settings
        </button>
      </header>

      <main className={styles.container}>
        {/* Left Column: Form Info */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <CreditCard size={20} color="#22c55e" /> Billing & Checkout Details
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Billing Name</label>
              <input 
                type="text" 
                placeholder="Aarav Dev" 
                className={styles.input} 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <input 
                type="email" 
                placeholder="aarav@gmail.com" 
                className={styles.input} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number (Optional)</label>
              <input 
                type="tel" 
                placeholder="+91 98765 43210" 
                className={styles.input} 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Promo Discount Coupon</label>
              <div className={styles.couponWrapper}>
                <input 
                  type="text" 
                  placeholder="e.g. FLOW123 or DEMO99" 
                  className={`${styles.input} ${styles.couponInput}`} 
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  disabled={couponApplied}
                />
                <button 
                  className={styles.couponBtn}
                  onClick={handleApplyCoupon}
                  disabled={couponApplied || !coupon.trim()}
                >
                  Apply
                </button>
              </div>
              {couponApplied && (
                <div className={styles.couponSuccess}>
                  <Check size={14} /> {discountPercent}% discount successfully applied for {couponCode}!
                </div>
              )}
              {couponError && (
                <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.25rem' }}>
                  {couponError}
                </div>
              )}
            </div>

            <div className={styles.sectionDivider} />

            <button 
              className={styles.payBtn}
              onClick={handlePayment}
              disabled={isProcessing || !isUserLoaded}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing Checkout...
                </>
              ) : (
                <>
                  Pay ₹{Math.max(1, Math.round(basePrice * (100 - discountPercent) / 100)).toLocaleString()}.00 with Razorpay
                </>
              )}
            </button>

            {checkoutError && (
              <div style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '0.75rem', textAlign: 'center' }}>
                {checkoutError}
              </div>
            )}
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '1rem' }}>
              Secured SSL encryption. By upgrading, you agree to our Terms and Privacy policies.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className={styles.card} style={{ borderLeft: '4px solid var(--accent-green)' }}>
          <div className={styles.summaryHeader}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: 700, letterSpacing: '1px' }}>
              Selected Plan
            </span>
            <h2 className={styles.planName}>GlideFlow {planParam}</h2>
            <p className={styles.planDesc}>
              {planParam === 'Plus' 
                ? 'Team-grade inbox command center with custom rules and direct collaboration.' 
                : 'A professional-grade inbox command center for high-velocity builders.'}
            </p>
          </div>

          <div className={styles.priceDisplay}>
            <span className={styles.priceAmount}>
              {`₹${Math.max(1, Math.round(basePrice * (100 - discountPercent) / 100)).toLocaleString()}`}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ month</span>
            {couponApplied && (
              <span className={styles.priceOriginal}>₹{basePrice.toLocaleString()}</span>
            )}
          </div>

          <div className={styles.sectionDivider} />

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <Zap size={14} color="#22c55e" />
              <span>Unlimited synced email accounts</span>
            </div>
            <div className={styles.featureItem}>
              <Sparkles size={14} color="#22c55e" />
              <span>AI-generated morning briefings (Gemini)</span>
            </div>
            <div className={styles.featureItem}>
              <ShieldCheck size={14} color="#22c55e" />
              <span>Real-time local DB caching & fast searches</span>
            </div>
            <div className={styles.featureItem}>
              <Zap size={14} color="#22c55e" />
              <span>Priority keyboard-shortcut integrations</span>
            </div>
          </div>

          <div className={styles.sectionDivider} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>₹{basePrice.toLocaleString()}.00</span>
            </div>
            {couponApplied && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                <span>Promo Discount ({discountPercent}%):</span>
                <span>-₹{Math.max(1, Math.round(basePrice * discountPercent / 100)).toLocaleString()}.00</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Taxes & Fees:</span>
              <span>₹0.00</span>
            </div>
            
            <div className={styles.sectionDivider} style={{ margin: '0.5rem 0' }} />
            
            <div className={styles.summaryTotalRow}>
              <span>Total:</span>
              <span>{`₹${Math.max(1, Math.round(basePrice * (100 - discountPercent) / 100)).toLocaleString()}.00`}</span>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.8rem', borderTop: '1px solid var(--border-glow)', background: 'var(--bg-sidebar)' }}>
        © 2026 GlideFlow Inc. Powered by Razorpay Payments.
      </footer>
      
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030303', color: '#a1a1aa', gap: '16px' }}>
        <Loader2 size={40} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'sans-serif', fontSize: '0.95rem' }}>Loading checkout center...</p>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

