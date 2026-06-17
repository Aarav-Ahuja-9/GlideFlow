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

  const { user, isLoaded: isUserLoaded } = useUser();

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  
  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true); // Default to true to allow easy testing
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

    // Support any code starting with standard workspace prefixes generated in Settings
    const validPrefixes = ['FLOW', 'CODE', 'SYNC', 'ZERO', 'HYPER', 'WAVE'];
    const isValid = validPrefixes.some(prefix => code.startsWith(prefix));

    if (isValid || code === 'DEMO50') {
      setCouponApplied(true);
      setCouponError('');
    } else {
      setCouponError('Invalid promo coupon code. Try FLOW123 or DEMO50.');
      setCouponApplied(false);
    }
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
          couponApplied,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Check if we are using the simulation/sandbox mode or real Razorpay
      const useSandboxSimulation = isSandbox || orderData.isMocked;

      if (useSandboxSimulation) {
        // Simulate Sandbox Checkout
        console.log('Simulating sandbox payment transaction...');
        
        // Delay to make it feel realistic and satisfy transition requirements
        await new Promise(r => setTimeout(r, 1500));

        // 2. Call success endpoint to update Clerk user metadata
        const successRes = await fetch('/api/checkout/success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
            razorpay_signature: 'simulated_signature_hash',
            isMocked: true
          }),
        });

        const successData = await successRes.json();
        if (!successData.success) {
          throw new Error(successData.error || 'Failed to verify payment');
        }

        setReceiptDetails({
          orderId: orderData.orderId,
          paymentId: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
          amount: couponApplied ? '₹649.00' : '₹1,299.00',
          plan: 'HyperFlow Pro Plan',
          date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        });

        setIsSuccess(true);
        setIsProcessing(false);
        return;
      }

      // Live Razorpay payment execution
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK script not loaded. Please wait a second and retry.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HyperFlow Inc.',
        description: `${planParam} Plan Subscription`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setIsProcessing(true);
          try {
            const verifyRes = await fetch('/api/checkout/success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                isMocked: false,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            setReceiptDetails({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              amount: couponApplied ? '₹649.00' : '₹1,299.00',
              plan: 'HyperFlow Pro Plan',
              date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
            });

            setIsSuccess(true);
          } catch (err: any) {
            alert(`Payment success handling failed: ${err.message}`);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: '#22c55e',
        },
      };

      const rzp = new (window as any).Razorpay(options);
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
          <span>hyper-flow</span>
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
          
          <div className={styles.sandboxBanner}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Demo Sandbox Mode: </span>
              {isSandbox 
                ? 'ON. Payments will be simulated locally. You will not be charged real money.' 
                : 'OFF. Real Razorpay modal will open if valid API keys are configured.'}
            </div>
            <button 
              className={styles.sandboxToggle}
              onClick={() => setIsSandbox(!isSandbox)}
            >
              Toggle {isSandbox ? 'OFF (Live Mode)' : 'ON (Simulated Mode)'}
            </button>
          </div>

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
                  placeholder="e.g. FLOW123" 
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
                  <Check size={14} /> 50% discount successfully applied!
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
                  Pay {couponApplied ? '₹649.00' : '₹1,299.00'} with Razorpay
                </>
              )}
            </button>
            
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
            <h2 className={styles.planName}>HyperFlow Pro</h2>
            <p className={styles.planDesc}>
              A professional-grade inbox command center for high-velocity builders.
            </p>
          </div>

          <div className={styles.priceDisplay}>
            <span className={styles.priceAmount}>
              {couponApplied ? '₹649' : '₹1,299'}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ month</span>
            {couponApplied && (
              <span className={styles.priceOriginal}>₹1,299</span>
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
              <span>₹1,299.00</span>
            </div>
            {couponApplied && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                <span>Promo Discount (50%):</span>
                <span>-₹650.00</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Taxes & Fees:</span>
              <span>₹0.00</span>
            </div>
            
            <div className={styles.sectionDivider} style={{ margin: '0.5rem 0' }} />
            
            <div className={styles.summaryTotalRow}>
              <span>Total:</span>
              <span>{couponApplied ? '₹649.00' : '₹1,299.00'}</span>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.8rem', borderTop: '1px solid var(--border-glow)', background: 'var(--bg-sidebar)' }}>
        © 2026 HyperFlow Inc. Powered by Razorpay Payments.
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

