'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, Calendar, Shield, CreditCard, Check, Sparkles, Clock, HelpCircle, 
  FileText, Download, Laptop, Smartphone, Bell, Trash2, Copy, Users, Share2 
} from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

export default function SettingsView() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [selectedPlan, setSelectedPlan] = useState('Free');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  
  // Custom states for notifications toggles
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  // Custom states for referral invite copy
  const [copied, setCopied] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    const prefixes = ['FLOW', 'CODE', 'SYNC', 'ZERO', 'HYPER', 'WAVE'];
    const randomWord = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit number
    setCouponCode(`${randomWord}${randomNum}`);
  }, []);

  // Prefill the active subscription plan from Clerk metadata
  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.plan) {
      const activePlan = (user.publicMetadata.plan as string).includes('Pro') ? 'Pro' : 'Free';
      setSelectedPlan(activePlan);
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div style={{ color: '#a1a1aa', textAlign: 'center', padding: '3rem' }}>
        Loading account details...
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === selectedPlan) return;
    
    if (planId === 'Pro') {
      // Route the user to our newly created Razorpay Checkout page
      router.push('/checkout?plan=Pro');
      return;
    }

    // Downgrading simulation
    setIsUpgrading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSelectedPlan('Free');
    setIsUpgrading(false);
    showToast(`Plan successfully set to Free Plan.`);
  };


  const copyReferral = () => {
    navigator.clipboard.writeText('https://hyperflow.com/invite?ref=aaravdev');
    setCopied(true);
    showToast('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCouponCopied(true);
    showToast(`Welcome coupon (${couponCode}) copied to clipboard!`);
    setTimeout(() => setCouponCopied(false), 2000);
  };

  const handleBackupExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      username: user?.fullName,
      email: user?.primaryEmailAddress?.emailAddress,
      plan: selectedPlan,
      exportDate: new Date().toISOString(),
      workspaceVersion: "1.0.0"
    }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "hyperflow_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Workspace backup JSON downloaded!');
  };

  const plans = [
    {
      id: 'Free',
      name: 'Free Plan',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for getting started with hyper-flow.',
      features: ['1 connected email inbox', 'Today\'s agenda calendar views', 'Keyboard shortcut guides'],
    },
    {
      id: 'Pro',
      name: 'Pro Plan',
      price: '$15',
      period: 'per month',
      desc: 'For power users who need maximum inbox velocity.',
      features: ['Unlimited connected emails', 'AI-generated email summaries', 'Priority fast sync support'],
      badge: 'Recommended',
    },
  ];

  // Calculate dynamic stats based on plan selection
  const daysRemaining = selectedPlan === 'Free' ? 'Unlimited' : '28 days';
  const renewalText = selectedPlan === 'Free' ? 'Free tier active forever' : 'Renews on July 12, 2026';
  const aiUsed = selectedPlan === 'Free' ? 18 : 45;
  const aiMax = selectedPlan === 'Free' ? 20 : 1000;
  const aiPercentage = Math.round((aiUsed / aiMax) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', paddingBottom: '3rem' }}>
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#18181b',
          border: '1px solid #22c55e',
          color: '#22c55e',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 999
        }}>
          <Check size={18} /> {toastMessage}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
        
        {/* LEFT COLUMN: Profile & Security Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Profile Card */}
          <div className={styles.card} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              
              {user?.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.fullName || 'User'} 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #22c55e' }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '2rem',
                  color: '#000'
                }}>
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {user?.fullName || 'User Profile'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '4px' }}>
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>

              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                fontSize: '0.75rem',
                padding: '4px 12px',
                borderRadius: '999px',
                fontWeight: 600,
                marginTop: '4px'
              }}>
                Active Account
              </div>
            </div>

            {/* Quick Details List */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                <Mail size={16} color="#717171" />
                <span>{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                <Calendar size={16} color="#717171" />
                <span>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                <Shield size={16} color="#717171" />
                <span>Standard Secured Access</span>
              </div>
            </div>
          </div>

          {/* Plan Quotas & AI Usage Card */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
              <Sparkles size={18} color="#22c55e" /> Plan Status & Usage
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Metric 1: Days remaining */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Billing Cycle</span>
                  <span style={{ color: '#fff' }}>{daysRemaining} left</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#717171', marginTop: '-2px', marginBottom: '6px' }}>
                  {renewalText}
                </p>
                {selectedPlan === 'Pro' && (
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '90%', background: '#22c55e', borderRadius: '3px' }}></div>
                  </div>
                )}
              </div>

              {/* Metric 2: AI Queries */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> AI Smart Queries</span>
                  <span style={{ color: '#fff' }}>{aiUsed} of {aiMax} used</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${aiPercentage}%`, 
                    background: aiPercentage > 85 ? '#ef4444' : '#22c55e', 
                    borderRadius: '3px' 
                  }}></div>
                </div>
                {selectedPlan === 'Free' && (
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '6px' }}>
                    ⚠️ You are almost out of AI smart credits. Upgrade to Pro for 1000 monthly credits!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Active Login Sessions */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
              <Shield size={18} color="#22c55e" /> Active Login Sessions
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Laptop size={20} color="#a1a1aa" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Chrome on Windows</div>
                  <div style={{ fontSize: '0.75rem', color: '#717171' }}>Delhi, India • Current active session</div>
                </div>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                <Smartphone size={20} color="#717171" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Safari on iPhone</div>
                  <div style={{ fontSize: '0.75rem', color: '#717171' }}>Logged in 2 hours ago</div>
                </div>
              </div>
            </div>
          </div>

          {/* Option B: Data Export & Privacy */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1rem' }}>
              <Trash2 size={18} color="#ef4444" /> Data & Privacy Controls
            </div>
            
            <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1.2rem', lineHeight: '1.5' }}>
              Download a backup archive of your dashboard calendar configurations, linked account settings, and workflow context.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleBackupExport}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} /> Export Data
              </button>
              <button 
                onClick={() => showToast('Delete account request submitted. Our support team will contact you.')}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Subscription Plans, Billing, and Notification Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Subscription Plans */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1.5rem' }}>
              <CreditCard size={18} color="#22c55e" /> Subscription Plan
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {plans.map((p) => {
                const isActive = selectedPlan === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleUpgrade(p.id)}
                    style={{
                      background: isActive ? 'rgba(34, 197, 94, 0.03)' : 'rgba(15, 15, 15, 0.3)',
                      border: isActive ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      cursor: p.id === selectedPlan ? 'default' : 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {p.badge && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '15px',
                        background: '#22c55e',
                        color: '#000',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {p.badge}
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{p.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '4px' }}>{p.desc}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{p.price}</span>
                        <span style={{ fontSize: '0.75rem', color: '#717171', display: 'block' }}>/{p.period}</span>
                      </div>
                    </div>

                    {isActive ? (
                      <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {p.features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                            <Check size={12} color="#22c55e" /> {f}
                          </div>
                        ))}
                        <div style={{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#22c55e',
                          fontWeight: 600
                        }}>
                          ✓ Current active plan
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        justifyContent: 'flex-end'
                      }}>
                        <button style={{
                          background: 'transparent',
                          border: '1px solid #22c55e',
                          color: '#22c55e',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                          {isUpgrading ? 'Updating...' : 'Switch Plan'}
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          {/* Option 1: Invoice & Billing History */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1rem' }}>
              <FileText size={18} color="#22c55e" /> Invoice & Payment History
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedPlan === 'Pro' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color="#717171" />
                      <div>
                        <span style={{ color: '#fff', fontWeight: 500 }}>Invoice #HF-001</span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#717171' }}>June 14, 2026 • Workflow Pro Plan</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>$15.00</span>
                      <button 
                        onClick={() => showToast('Receipt PDF download started...')}
                        style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', padding: '4px' }}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#717171', fontStyle: 'italic', padding: '4px 0' }}>
                  No payment invoices available for Free Tier.
                </div>
              )}
            </div>
          </div>

          {/* Option A: Email Notification Toggles */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
              <Bell size={18} color="#22c55e" /> Communication Preferences
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Toggle 1: Weekly digest */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Weekly Inbox Digests</div>
                  <div style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>Receive a productivity report of inbox zeros.</div>
                </div>
                <button 
                  onClick={() => { setWeeklyDigest(!weeklyDigest); showToast(`Weekly Digests ${!weeklyDigest ? 'enabled' : 'disabled'}`); }}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: weeklyDigest ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', background: weeklyDigest ? '#000' : '#a1a1aa',
                    position: 'absolute', top: '3px', left: weeklyDigest ? '19px' : '3px',
                    transition: 'all 0.2s'
                  }}></div>
                </button>
              </div>

              {/* Toggle 2: Billing alerts */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Billing & Renewal Alerts</div>
                  <div style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>Get notified 3 days before payment cycle renewals.</div>
                </div>
                <button 
                  onClick={() => { setBillingAlerts(!billingAlerts); showToast(`Billing notifications ${!billingAlerts ? 'enabled' : 'disabled'}`); }}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: billingAlerts ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', background: billingAlerts ? '#000' : '#a1a1aa',
                    position: 'absolute', top: '3px', left: billingAlerts ? '19px' : '3px',
                    transition: 'all 0.2s'
                  }}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Option C: Referrals & Team Invites */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
              <Users size={18} color="#22c55e" /> Invite Teammates
            </div>

            {/* Promo Coupon Code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                Your friend's welcome coupon code:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(34, 197, 94, 0.04)',
                  border: '1px dashed rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#22c55e',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}>
                  {couponCode || 'Generating...'}
                </div>
                <button 
                  onClick={copyCoupon}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {couponCopied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />} 
                  {couponCopied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>
                This coupon gives your friend **50% off** their first month of HyperFlow Pro.
              </p>
            </div>
          </div>

          {/* FAQ Support */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom: '1rem' }}>
              <HelpCircle size={18} color="#22c55e" /> Billing & Upgrade Support
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', lineHeight: '1.5', color: '#a1a1aa' }}>
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Can I downgrade my plan at any time?</strong>
                Yes! Switching back to the Free plan happens instantly. We do not lock you into long contracts.
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Need help?</strong>
                Feel free to email support at <a href="mailto:support@hyperflow.com" style={{ color: '#22c55e', textDecoration: 'none' }}>support@hyperflow.com</a> for fast help with subscription plans.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
