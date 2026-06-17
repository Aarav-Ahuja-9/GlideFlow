// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs'; 
import { 
  BrainCircuit, Zap, Check, Sparkles, Mail, Calendar, 
  Settings, Search, Terminal, ArrowRight, Clock, Users 
} from 'lucide-react';
import styles from './landing.module.css';

const FAQS = [
  { 
    q: "Do I have to use the keyboard for everything?", 
    a: "No, HyperFlow is fully functional with a mouse. We optimize every interaction with optional keyboard shortcuts so advanced users can work even faster, but standard mouse clicks work perfectly." 
  },
  { 
    q: "Is my email data secure?", 
    a: "Absolutely. We use secure OAuth integrations (Google/Microsoft) and our database is strictly encrypted. We do not sell or read your email content." 
  },
  { 
    q: "Can I connect multiple email accounts?", 
    a: "During our beta phase, we support syncing one primary account. Multi-account unified inbox is our next major feature on the roadmap." 
  }
];

const THEMES = ['Classic', 'Professional', 'Terminal', 'VS Code'];

export default function LandingPage() {
  const router = useRouter(); 
  const { isLoaded, isSignedIn } = useAuth(); 

  const [themeOpen, setThemeOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('Professional');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Keyboard Shortcuts Sandbox State
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sandboxHistory, setSandboxHistory] = useState<string[]>([
    'Type key shortcuts to test local database speed...',
  ]);

  // Dynamic Theme Synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Keyboard listener for Interactive Sandbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside forms
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'c' || key === 'j' || key === 'k') {
        e.preventDefault();
        setActiveKey(key);
        
        let message = '';
        if (key === 'c') {
          message = '> [Workspace] Pressed "C" - Compose overlay opened. Draft emails in milliseconds.';
        } else if (key === 'j') {
          message = '> [Workspace] Pressed "J" - Highlight moved down. Scan items instantaneously.';
        } else if (key === 'k') {
          message = '> [Workspace] Pressed "K" - Highlight moved up. Scan items instantaneously.';
        }

        setSandboxHistory(prev => {
          const next = [...prev, message];
          if (next.length > 5) next.shift(); // Keep logs clean
          return next;
        });

        // Clear active key outline shortly after press
        setTimeout(() => setActiveKey(null), 250);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.wrapper}>
      {/* Visual background glows */}
      <div className={styles.glowBlob1} />
      <div className={styles.glowBlob2} />
      
      {/* Sticky Glassmorphic Navbar */}
      <div className={styles.navbarContainer}>
        <nav className={styles.navbar}>
          <div className={styles.logo} style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <BrainCircuit width="24" height="24" color="#22c55e" />
            hyper-flow
          </div>
          
          <div className={styles.navLinks}>
            <span className={styles.navLink} onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>Benefits</span>
            <span className={styles.navLink} onClick={() => {
              const el = document.getElementById('playground');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>Interactive Sandbox</span>
            <span className={styles.navLink} onClick={() => {
              const el = document.getElementById('pricing');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>Plans & Pricing</span>
            <span className={styles.navLink} onClick={() => {
              const el = document.getElementById('faq');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>FAQ</span>
          </div>

          <div className={styles.navActions}>
            {/* Advanced Theme Selector Dropdown */}
            <div className={styles.themeWrapper}>
              <button 
                className={styles.themeBtn} 
                onClick={(e) => {
                  e.preventDefault(); 
                  setThemeOpen((prev) => !prev);
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                  {currentTheme}
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              
              <div className={`${styles.dropdownMenu} ${themeOpen ? styles.dropdownMenuOpen : ''}`}>
                <div className={styles.dropdownLabel}>UI Themes</div>
                {THEMES.map((theme) => (
                  <button 
                    key={theme} 
                    className={`${styles.themeOption} ${currentTheme === theme ? styles.themeOptionActive : ''}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentTheme(theme); 
                      setThemeOpen(false);
                    }}
                  >
                    {theme}
                    {currentTheme === theme && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </button>
                ))}
                
                <div className={styles.dropdownDivider}></div>
                <div className={styles.dropdownLabel}>Mode</div>
                
                <div className={styles.modeToggleGroup}>
                  <button 
                    className={`${styles.modeBtn} ${!isDarkMode ? styles.modeBtnActive : ''}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDarkMode(false); 
                      setThemeOpen(false);
                    }}
                  >
                    ☀️ Light
                  </button>
                  <button 
                    className={`${styles.modeBtn} ${isDarkMode ? styles.modeBtnActive : ''}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDarkMode(true); 
                      setThemeOpen(false);
                    }}
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Clerk User Navigation Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isLoaded && isSignedIn ? (
                <>
                  <button 
                    className={styles.navBtn} 
                    style={{ backgroundColor: '#22c55e', color: 'black' }}
                    onClick={() => router.push('/dashboard')}
                  >
                    Go to Dashboard
                  </button>
                  <UserButton />
                </>
              ) : (
                <>
                  <button className={styles.loginBtn} onClick={() => router.push('/sign-in')}>Login</button>
                  <button className={styles.navBtn} onClick={() => router.push('/sign-up')}>Sign Up</button>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.pill}>HyperFlow v1.0 • Stress-Free Email Workspaces</div>
        <h1 className={styles.headline}>The fastest email client. <br /> Built for busy professionals.</h1>
        <p className={styles.subHeadline}>Clear your inbox, schedule meetings, and draft messages in seconds. Use standard mouse clicks or quick hotkeys—whichever feels natural.</p>
        
        <div className={styles.ctaContainer}>
          <input type="email" placeholder="Enter your work email address" className={styles.emailInput} />
          {isLoaded && isSignedIn ? (
             <button className={styles.ctaBtn} onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
          ) : (
             <button className={styles.ctaBtn} onClick={() => router.push('/sign-up')}>Get Started Free</button>
          )}
        </div>

        {/* Browser App Preview Mockup */}
        <div className={styles.appPreview}>
          <div className={styles.appHeader}>
            <div className={styles.dot} style={{ background: '#ef4444' }}></div>
            <div className={styles.dot} style={{ background: '#f59e0b' }}></div>
            <div className={styles.dot} style={{ background: '#22c55e' }}></div>
            <span style={{ fontSize: '0.7rem', color: '#717171', marginLeft: 'auto', marginRight: 'auto', fontFamily: 'monospace' }}>app.hyperflow.com/dashboard</span>
          </div>
          
          <div className={styles.mockApp}>
            {/* Sidebar mockup */}
            <aside className={styles.mockSidebar}>
              <div className={styles.logo} style={{ fontSize: '0.95rem' }}><BrainCircuit size={18} color="#22c55e" /> HYPER-FLOW</div>
              <nav className={styles.mockNavList}>
                <div className={`${styles.mockNavItem} ${styles.mockNavItemActive}`}><Mail size={14} /> Inbox Priorities</div>
                <div className={styles.mockNavItem}><Calendar size={14} /> Today's Agenda</div>
                <div className={styles.mockNavItem}><Clock size={14} /> Active Tasks</div>
                <div className={styles.mockNavItem}><Settings size={14} /> Configurations</div>
              </nav>
            </aside>
            
            {/* Dashboard area mockup */}
            <main className={styles.mockMain}>
              <div className={styles.mockTitleBar}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Workspace Command Center</h3>
                  <span style={{ fontSize: '0.7rem', color: '#717171' }}>Pre-fetched database sync active</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.15)' }}>
                    ● Synced
                  </span>
                </div>
              </div>

              {/* Stats Mock */}
              <div className={styles.mockStatsGrid}>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>Unread Priorities</div>
                  <div className={styles.mockStatNum} style={{ color: '#ef4444' }}>3</div>
                </div>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>Pending Drafts</div>
                  <div className={styles.mockStatNum} style={{ color: '#f59e0b' }}>4</div>
                </div>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>Next Briefing</div>
                  <div className={styles.mockStatNum} style={{ color: '#22c55e' }}>10m</div>
                </div>
              </div>

              <div className={styles.mockContentGrid}>
                {/* AI Briefing Panel Mock */}
                <div className={styles.mockPanel} style={{ borderLeft: '3px solid #8b5cf6', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(15, 15, 18, 0.6) 100%)' }}>
                  <div className={styles.mockPanelTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa' }}>
                    <Sparkles size={12} /> AI Daily Briefing
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                    Good afternoon! You have 3 urgent emails needing immediate attention. Next sync cycle initiates in 4 mins.
                  </p>
                </div>

                {/* Inbox mockup */}
                <div className={styles.mockPanel}>
                  <div className={styles.mockPanelTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={12} color="#22c55e" /> Priority Threads
                  </div>
                  <div className={styles.mockRow}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Hitesh Choudhary</div>
                      <div style={{ color: '#717171', fontSize: '0.65rem' }}>Curriculum design updates</div>
                    </div>
                    <span className={styles.mockBadge} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>Urgent</span>
                  </div>
                  <div className={styles.mockRow}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Piyush Garg</div>
                      <div style={{ color: '#717171', fontSize: '0.65rem' }}>Next.js docker configurations</div>
                    </div>
                    <span className={styles.mockBadge} style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}>Action</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </main>

      {/* Integrations Banner */}
      <section className={styles.integrations}>
        <h3 className={styles.integrationsTitle}>Works seamlessly with your existing stack</h3>
        <div className={styles.integrationIcons}>
          <span>Gmail</span>
          <span>Outlook</span>
          <span>Apple Calendar</span>
          <span>Google Meet</span>
          <span>Zoom</span>
        </div>
      </section>

      {/* Interactive Keyboard Shortcuts Sandbox */}
      <section id="playground" className={styles.sandboxSection}>
        <div className={styles.pill}>Interactive Sandbox</div>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Test Inbox Control Shortcuts</h2>
        <p style={{ fontSize: '1rem', color: '#a1a1aa', maxWidth: '600px', margin: '0 auto' }}>
          HyperFlow runs on lightning-fast local cache triggers. Tap these keys on your keyboard now to test the shortcut workspace experience!
        </p>

        <div className={styles.sandboxGrid}>
          {/* Key Cards */}
          <div className={styles.sandboxDetails}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#22c55e', fontWeight: 700, letterSpacing: '1px' }}>
              Dynamic Key Triggers
            </span>
            <h3 className={styles.sandboxHeading}>Mouse & Keyboards Combined</h3>
            <p style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: 1.5 }}>
              By binding priority operations to optional single-key shortcuts, HyperFlow lets you respond to tasks without searching through nested folders.
            </p>
            
            <div className={styles.sandboxKeysRow}>
              <div className={`${styles.keyCard} ${activeKey === 'c' ? styles.keyCardActive : ''}`}>
                <span className={styles.keyChar}>C</span>
                <span className={styles.keyLabel}>Compose</span>
              </div>
              <div className={`${styles.keyCard} ${activeKey === 'j' ? styles.keyCardActive : ''}`}>
                <span className={styles.keyChar}>J</span>
                <span className={styles.keyLabel}>Next Item</span>
              </div>
              <div className={`${styles.keyCard} ${activeKey === 'k' ? styles.keyCardActive : ''}`}>
                <span className={styles.keyChar}>K</span>
                <span className={styles.keyLabel}>Prev Item</span>
              </div>
            </div>
          </div>

          {/* Simulated Terminal Console */}
          <div className={styles.sandboxConsole}>
            <div className={styles.consoleHeader}>
              <span>inbox-cache-terminal</span>
              <span style={{ color: '#22c55e' }}>● active</span>
            </div>
            
            <div className={styles.consoleLines}>
              {sandboxHistory.map((line, idx) => (
                <div key={idx} className={styles.consoleLine}>
                  <span className={styles.consolePrompt}>$</span>
                  <span className={styles.consoleOutput}>{line}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.75rem', color: '#717171', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
              Tip: Press C, J, or K keys inside browser window
            </div>
          </div>
        </div>
      </section>

      {/* Visual Subscription Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pill}>Subscription Pricing</div>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Clear, Friendly Pricing Tiers</h2>
        <p style={{ fontSize: '1rem', color: '#a1a1aa', maxWidth: '560px', margin: '0 auto' }}>
          Select the subscription tier that matches your workflow needs. Upgrade securely via Razorpay.
        </p>

        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.pricingCard}>
            <div>
              <h3 className={styles.planTitle}>Free Plan</h3>
              <p className={styles.planDesc}>Perfect for getting started with fast email navigation.</p>
              
              <div className={styles.planPrice}>
                <span className={styles.planCost}>₹0</span>
                <span className={styles.planPeriod}>/ forever</span>
              </div>
              
              <div className={styles.pricingFeatures}>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> 1 synced email inbox account</div>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> Today's Agenda calendar views</div>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> Interactive shortcuts guide</div>
              </div>
            </div>
            
            <button 
              className={styles.pricingBtn}
              onClick={() => {
                if (isLoaded && isSignedIn) router.push('/dashboard');
                else router.push('/sign-up');
              }}
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Razorpay Integrated) */}
          <div className={`${styles.pricingCard} ${styles.pricingCardActive}`}>
            <span className={styles.pricingBadge}>Recommended</span>
            
            <div>
              <h3 className={styles.planTitle} style={{ color: '#22c55e' }}>Pro Plan</h3>
              <p className={styles.planDesc}>For power users who need complete workspace sync capabilities.</p>
              
              <div className={styles.planPrice}>
                <span className={styles.planCost}>₹1,299</span>
                <span className={styles.planPeriod}>/ month (approx. $15)</span>
              </div>
              
              <div className={styles.pricingFeatures}>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> Unlimited connected email inboxes</div>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> AI Daily Briefings (Gemini context)</div>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> High-speed server synchronization</div>
                <div className={styles.pricingFeature}><Check size={14} color="#22c55e" /> Custom automation rules engine</div>
              </div>
            </div>
            
            <button 
              className={`${styles.pricingBtn} ${styles.pricingBtnActive}`}
              onClick={() => {
                if (isLoaded && isSignedIn) router.push('/checkout?plan=Pro');
                else router.push('/sign-in?redirect=/checkout?plan=Pro');
              }}
            >
              Upgrade via Razorpay <ArrowRight size={14} style={{ marginLeft: '4px', display: 'inline' }} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Built for uncompromised productivity</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"></path></svg></div>
            <h3 className={styles.featureTitle}>Mouse or Keyboard</h3>
            <p className={styles.featureDesc}>Click through items with ease, or fly through them with keyboard hotkeys. Choose what fits your speed.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            <h3 className={styles.featureTitle}>Zero-Wait Cache</h3>
            <p className={styles.featureDesc}>Local pre-fetch sync saves incoming emails and calendar details. Stop waiting for pages to spin.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <h3 className={styles.featureTitle}>Side-by-Side Panel</h3>
            <p className={styles.featureDesc}>Your inbox priorities and calendar exist on a single dashboard layout. Stop swapping browser tabs.</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>Get to Inbox Zero in 3 steps</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Connect Account</h3>
            <p className={styles.stepDesc}>Securely sync your Google or Outlook account. We pull your data into our high-speed local cache.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Learn the Shortcuts</h3>
            <p className={styles.stepDesc}>Follow our quick 2-minute onboarding to master the essential keyboard binds.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Enter the Flow</h3>
            <p className={styles.stepDesc}>Experience what it feels like when your software moves as fast as you think.</p>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className={styles.testimonial}>
        <div className={styles.quote}>
          "I used to dread checking my email. With HyperFlow, I clear out 50+ emails and schedule my day in under 3 minutes. It's dangerously fast."
        </div>
        <div className={styles.author}>Anonymous Alpha Tester</div>
        <div className={styles.authorRole}>Software Engineer</div>
      </section>

      {/* FAQ Section with Accordion Logic */}
      <section id="faq" className={styles.faqSection}>
        <h2 className={styles.faqHeading}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className={styles.faqCard}>
                <div 
                  className={styles.faqQWrapper} 
                  onClick={() => toggleFaq(index)}
                >
                  <div className={styles.faqQ}>{faq.q}</div>
                  <div className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                </div>
                <div className={`${styles.faqAWrapper} ${isOpen ? styles.faqAWrapperOpen : ''}`}>
                  <div className={styles.faqAInner}>
                    <div className={styles.faqA}>{faq.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.logo}>
            <BrainCircuit width="20" height="20" color="#22c55e" />
            hyper-flow
          </div>
          <p className={styles.footerDesc}>
            Redefining productivity for developers and professionals with high-performance, keyboard-driven workflows.
          </p>
        </div>
        
        <div>
          <h4 className={styles.footerTitle}>Product</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Features</span>
            <span className={styles.footerLink}>Integrations</span>
            <span className={styles.footerLink}>Changelog</span>
            <span className={styles.footerLink}>Pricing</span>
          </div>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Resources</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Documentation</span>
            <span className={styles.footerLink}>API Reference</span>
            <span className={styles.footerLink}>Community</span>
            <span className={styles.footerLink}>Blog</span>
          </div>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Legal</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Privacy Policy</span>
            <span className={styles.footerLink}>Terms of Service</span>
            <span className={styles.footerLink}>Contact</span>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 HyperFlow Inc. Built for the Hackathon.
        </div>
      </footer>

    </div>
  );
}
