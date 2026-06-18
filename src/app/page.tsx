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
    a: "No, GlideFlow is fully functional with a mouse. We optimize every interaction with optional keyboard shortcuts so advanced users can work even faster, but standard mouse clicks work perfectly." 
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
    'Type key shortcuts or click button grids to initiate cache sync...',
  ]);

  // Dynamic Theme Synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.animateVisible);
          }
        });
      },
      { threshold: 0.08 } // Trigger when 8% of the section is visible
    );

    const sections = document.querySelectorAll(`.${styles.animateOnScroll}`);
    sections.forEach((sec) => observer.observe(sec));

    return () => {
      sections.forEach((sec) => observer.unobserve(sec));
    };
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const triggerSandboxKey = (key: string) => {
    setActiveKey(key);
    
    let message = '';
    if (key === 'c') {
      message = '> [CACHE RUNTIME] Executed "C" - Compose modal mapped. Render time: 1.2ms.';
    } else if (key === 'j') {
      message = '> [CACHE RUNTIME] Executed "J" - Cursor advanced down priority index. Sync ok.';
    } else if (key === 'k') {
      message = '> [CACHE RUNTIME] Executed "K" - Cursor advanced up priority index. Sync ok.';
    }

    setSandboxHistory(prev => {
      const next = [...prev, message];
      if (next.length > 5) next.shift(); // Keep logs clean
      return next;
    });

    // Clear active key outline shortly after press
    setTimeout(() => setActiveKey(null), 250);
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
        triggerSandboxKey(key);
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
      <div className={styles.glowBlob3} />
      
      {/* Sticky Glassmorphic Navbar */}
      <div className={styles.navbarContainer}>
        <nav className={styles.navbar}>
          <div className={styles.logo} style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <BrainCircuit width="22" height="22" color="#06b6d4" />
            glide-flow //
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
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
                    Light
                  </button>
                  <button 
                    className={`${styles.modeBtn} ${isDarkMode ? styles.modeBtnActive : ''}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDarkMode(true); 
                      setThemeOpen(false);
                    }}
                  >
                    Dark
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
                    onClick={() => router.push('/dashboard')}
                  >
                    Dashboard
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
      <main className={`${styles.hero} ${styles.animateOnScroll}`}>
        <div className={styles.pill}>GlideFlow v2.0 • Cybernetic Email Sync</div>
        <h1 className={styles.headline}>The fastest email client.<br />Optimized for developers.</h1>
        <p className={styles.subHeadline}>Pre-fetch sync operations, schedule meetings, and automate sorting filters with absolute ease. Use terminal-grade hotkeys or clean mouse clicks.</p>
        
        <div className={styles.ctaContainer}>
          <input type="email" placeholder="ENTER WORK EMAIL ADDR..." className={styles.emailInput} />
          {isLoaded && isSignedIn ? (
             <button className={styles.ctaBtn} onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
          ) : (
             <button className={styles.ctaBtn} onClick={() => router.push('/sign-up')}>GET STARTED</button>
          )}
        </div>

        {/* Browser App Preview Mockup */}
        <div className={styles.appPreview}>
          <div className={styles.appHeader}>
            <div className={styles.dot} style={{ background: '#ff5f56' }}></div>
            <div className={styles.dot} style={{ background: '#ffbd2e' }}></div>
            <div className={styles.dot} style={{ background: '#27c93f' }}></div>
            <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 'auto', marginRight: 'auto', fontFamily: 'monospace', letterSpacing: '0.5px' }}>// COMMAND_CENTER_SHELL // app.glideflow.com/dashboard</span>
          </div>
          
          <div className={styles.mockApp}>
            {/* Sidebar mockup */}
            <aside className={styles.mockSidebar}>
              <div className={styles.logo} style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}><BrainCircuit size={15} color="#06b6d4" /> GLIDEFLOW v2</div>
              <nav className={styles.mockNavList}>
                <div className={`${styles.mockNavItem} ${styles.mockNavItemActive}`}><Mail size={12} /> Priority Index</div>
                <div className={styles.mockNavItem}><Calendar size={12} /> Sync Agenda</div>
                <div className={styles.mockNavItem}><Clock size={12} /> Active Cache</div>
                <div className={styles.mockNavItem}><Settings size={12} /> Config Registry</div>
              </nav>
            </aside>
            
            {/* Dashboard area mockup */}
            <main className={styles.mockMain}>
              <div className={styles.mockTitleBar}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'monospace' }}>DATABASE CONTROL PANEL</h3>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>[SYS_SYNC: SUCCESS] Cache sync active</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>
                    ● SYNCHRONIZED
                  </span>
                </div>
              </div>

              {/* Stats Mock */}
              <div className={styles.mockStatsGrid}>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>URGENT ITEMS</div>
                  <div className={styles.mockStatNum} style={{ color: '#d946ef' }}>3</div>
                </div>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>UNCOMMITTED DRAFTS</div>
                  <div className={styles.mockStatNum} style={{ color: '#06b6d4' }}>4</div>
                </div>
                <div className={styles.mockStatCard}>
                  <div className={styles.mockStatLabel}>SYNC CYCLE TIME</div>
                  <div className={styles.mockStatNum} style={{ color: '#34d399' }}>0.4s</div>
                </div>
              </div>

              <div className={styles.mockContentGrid}>
                {/* AI Briefing Panel Mock */}
                <div className={styles.mockPanel} style={{ borderLeft: '3px solid #d946ef', background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.04) 0%, rgba(6, 6, 12, 0.8) 100%)' }}>
                  <div className={styles.mockPanelTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d946ef' }}>
                    <Sparkles size={12} /> AI WORKFLOW BRIEF
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4, fontFamily: 'monospace' }}>
                    &gt; CACHE PRE-FETCH COMPLETE.<br />
                    &gt; 3 High-priority threads detected.<br />
                    &gt; Sync cycle loop running optimally.
                  </p>
                </div>

                {/* Inbox mockup */}
                <div className={styles.mockPanel}>
                  <div className={styles.mockPanelTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={12} color="#06b6d4" /> priority queue
                  </div>
                  <div className={styles.mockRow}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Hitesh Choudhary</div>
                      <div style={{ color: '#64748b', fontSize: '0.6rem' }}>Curriculum design updates</div>
                    </div>
                    <span className={styles.mockBadge} style={{ background: 'rgba(217, 70, 239, 0.08)', color: '#fca5a5', border: '1px solid rgba(217,70,239,0.2)' }}>Urgent</span>
                  </div>
                  <div className={styles.mockRow}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Piyush Garg</div>
                      <div style={{ color: '#64748b', fontSize: '0.6rem' }}>Next.js docker configurations</div>
                    </div>
                    <span className={styles.mockBadge} style={{ background: 'rgba(6, 182, 212, 0.08)', color: '#93c5fd', border: '1px solid rgba(6,182,212,0.2)' }}>Action</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </main>

      {/* Integrations Banner */}
      <section className={`${styles.integrations} ${styles.animateOnScroll}`}>
        <h3 className={styles.integrationsTitle}>// CORE API SYNCS INTEGRATED</h3>
        <div className={styles.integrationIcons}>
          <span className={styles.cascadeItem}>Gmail API</span>
          <span className={styles.cascadeItem}>Outlook REST</span>
          <span className={styles.cascadeItem}>CalDAV Sync</span>
          <span className={styles.cascadeItem}>Google Meet</span>
          <span className={styles.cascadeItem}>Zoom API</span>
        </div>
      </section>

      {/* Interactive Keyboard Shortcuts Sandbox */}
      <section id="playground" className={`${styles.sandboxSection} ${styles.animateOnScroll}`}>
        <div className={styles.pill}>interactive terminal</div>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Zero-Lag Keyboard Routing</h2>
        <p style={{ fontSize: '1rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
          Test the cache commands below. Click the holographic buttons directly or type the keys inside the viewport to see execution loops.
        </p>

        <div className={styles.sandboxGrid}>
          {/* Key Cards */}
          <div className={styles.sandboxDetails}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 800, letterSpacing: '1.5px', fontFamily: 'monospace' }}>
              // DEVICEMAP: KEYBOARD SHORTCUTS
            </span>
            <h3 className={styles.sandboxHeading}>Command Bindings</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Trigger caching structures instantly. Bypass slow client-to-server load queues using single-stroke commands.
            </p>
            
            <div className={styles.sandboxKeysRow}>
              <div 
                className={`${styles.keyCard} ${activeKey === 'c' ? styles.keyCardActive : ''} ${styles.cascadeItem}`}
                onClick={() => triggerSandboxKey('c')}
              >
                <span className={styles.keyChar}>C</span>
                <span className={styles.keyLabel}>COMPOSE</span>
              </div>
              <div 
                className={`${styles.keyCard} ${activeKey === 'j' ? styles.keyCardActive : ''} ${styles.cascadeItem}`}
                onClick={() => triggerSandboxKey('j')}
              >
                <span className={styles.keyChar}>J</span>
                <span className={styles.keyLabel}>NEXT ITEM</span>
              </div>
              <div 
                className={`${styles.keyCard} ${activeKey === 'k' ? styles.keyCardActive : ''} ${styles.cascadeItem}`}
                onClick={() => triggerSandboxKey('k')}
              >
                <span className={styles.keyChar}>K</span>
                <span className={styles.keyLabel}>PREV ITEM</span>
              </div>
            </div>
          </div>

          {/* Simulated Terminal Console */}
          <div className={styles.sandboxConsole}>
            <div className={styles.consoleHeader}>
              <span>// GLIDEFLOW-CACHE-SHELL</span>
              <span style={{ color: '#06b6d4' }}>● RUNTIME STATUS: ONLINE</span>
            </div>
            
            <div className={styles.consoleLines}>
              {sandboxHistory.map((line, idx) => (
                <div key={idx} className={styles.consoleLine}>
                  <span className={styles.consolePrompt}>$</span>
                  <span className={styles.consoleOutput}>{line}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.65rem', color: '#475569', borderTop: '1px solid rgba(6,182,212,0.15)', paddingTop: '8px', fontFamily: 'monospace' }}>
              INPUT MONITOR: DETECTING WINDOW KEYEVENTS [C, J, K]
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Pricing Section */}
      <section id="pricing" className={`${styles.pricingSection} ${styles.animateOnScroll}`}>
        <div className={styles.pill}>billing center</div>
        <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Subscription Registries</h2>
        <p style={{ fontSize: '1rem', color: '#94a3b8', maxWidth: '560px', margin: '0 auto' }}>
          Select your workflow scale below. Transactions are processed securely via Razorpay gateway nodes.
        </p>

        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={`${styles.pricingCard} ${styles.cascadeItem}`}>
            <div>
              <h3 className={styles.planTitle}>Free Shell</h3>
              <p className={styles.planDesc}>Basic shortcuts and single account synchronization.</p>
              
              <div className={styles.planPrice}>
                <span className={styles.planCost}>₹0</span>
                <span className={styles.planPeriod}>/ FOREVER</span>
              </div>
              
              <div className={styles.pricingFeatures}>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> 1 synced email inbox</div>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> Cache sync frequency: 15m</div>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> Basic hotkeys setup</div>
              </div>
            </div>
            
            <button 
              className={styles.pricingBtn}
              onClick={() => {
                if (isLoaded && isSignedIn) router.push('/dashboard');
                else router.push('/sign-up');
              }}
            >
              INITIALIZE SHELL
            </button>
          </div>

          {/* Pro Tier (Razorpay Integrated) */}
          <div className={`${styles.pricingCard} ${styles.pricingCardActive} ${styles.cascadeItem}`}>
            <span className={styles.pricingBadge}>RECOMMENDED PRESAL</span>
            
            <div>
              <h3 className={styles.planTitle} style={{ color: '#d946ef' }}>Pro Center</h3>
              <p className={styles.planDesc}>Infinite cached databases and AI-context engine mapping.</p>
              
              <div className={styles.planPrice}>
                <span className={styles.planCost}>₹1,299</span>
                <span className={styles.planPeriod}>/ MONTH (approx. $15)</span>
              </div>
              
              <div className={styles.pricingFeatures}>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> Unlimited connected inboxes</div>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> AI daily logs summary (Gemini)</div>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> High-speed cache pre-fetching</div>
                <div className={styles.pricingFeature}><Check size={14} color="#06b6d4" /> Smart automation scripts</div>
              </div>
            </div>
            
            <button 
              className={`${styles.pricingBtn} ${styles.pricingBtnActive}`}
              onClick={() => {
                if (isLoaded && isSignedIn) router.push('/checkout?plan=Pro');
                else router.push('/sign-in?redirect=/checkout?plan=Pro');
              }}
            >
              UPGRADE SECURELY <ArrowRight size={14} style={{ marginLeft: '4px', display: 'inline' }} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={`${styles.features} ${styles.animateOnScroll}`}>
        <h2 className={styles.sectionTitle}>engineered for performance</h2>
        <div className={styles.featuresGrid}>
          <div className={`${styles.featureCard} ${styles.cascadeItem}`}>
            <div className={styles.featureIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"></path></svg></div>
            <h3 className={styles.featureTitle}>HYBRID INTERFACES</h3>
            <p className={styles.featureDesc}>Click elements, scroll grids, or fly through lists using optimized keyboard navigation shortcuts.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cascadeItem}`}>
            <div className={styles.featureIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            <h3 className={styles.featureTitle}>ZERO-LAG CACHING</h3>
            <p className={styles.featureDesc}>Database layers are mirrored to local cache, loading indexes instantly without browser loaders spinning.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cascadeItem}`}>
            <div className={styles.featureIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <h3 className={styles.featureTitle}>DUAL COMMAND BOARDS</h3>
            <p className={styles.featureDesc}>Your mail threads and daily agenda calendars are synchronized on a side-by-side cockpit layout.</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className={`${styles.howItWorks} ${styles.animateOnScroll}`}>
        <h2 className={styles.sectionTitle}>three-step deployment</h2>
        <div className={styles.stepsGrid}>
          <div className={`${styles.stepCard} ${styles.cascadeItem}`}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.stepTitle}>link token</h3>
            <p className={styles.stepDesc}>Securely sync Google/Outlook nodes with OAuth permissions to mirror inbox metadata.</p>
          </div>
          <div className={`${styles.stepCard} ${styles.cascadeItem}`}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.stepTitle}>sync cache</h3>
            <p className={styles.stepDesc}>Our pre-fetch routine compiles threads and calendar objects to local index storage.</p>
          </div>
          <div className={`${styles.stepCard} ${styles.cascadeItem}`}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.stepTitle}>execute actions</h3>
            <p className={styles.stepDesc}>Navigate commands, search caches, and process messages without leaving the home screen.</p>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className={`${styles.testimonial} ${styles.animateOnScroll}`}>
        <div className={styles.quote}>
          "GlideFlow cuts out the clutter. The hotkeys combined with instant local pre-fetching makes searching through 6 months of archive emails take milliseconds. Incredible."
        </div>
        <div className={styles.author}>// HACKATHON BETA LOGS: ENG NODE</div>
        <div className={styles.authorRole}>System Architect</div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={`${styles.faqSection} ${styles.animateOnScroll}`}>
        <h2 className={styles.faqHeading}>technical questions</h2>
        <div className={styles.faqGrid}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className={`${styles.faqCard} ${styles.cascadeItem}`}>
                <div 
                  className={styles.faqQWrapper} 
                  onClick={() => toggleFaq(index)}
                >
                  <div className={styles.faqQ}>{faq.q}</div>
                  <div className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <BrainCircuit width="18" height="18" color="#06b6d4" />
            glide-flow //
          </div>
          <p className={styles.footerDesc}>
            Deploying high-performance keyboard cockpits and cached workspaces for busy operators.
          </p>
        </div>
        
        <div>
          <h4 className={styles.footerTitle}>node-registry</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Features</span>
            <span className={styles.footerLink}>Integrations</span>
            <span className={styles.footerLink}>Changelog</span>
            <span className={styles.footerLink}>Pricing</span>
          </div>
        </div>

        <div>
          <h4 className={styles.footerTitle}>documents</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Documentation</span>
            <span className={styles.footerLink}>API Reference</span>
            <span className={styles.footerLink}>Community</span>
            <span className={styles.footerLink}>Blog</span>
          </div>
        </div>

        <div>
          <h4 className={styles.footerTitle}>legal</h4>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>Privacy Policy</span>
            <span className={styles.footerLink}>Terms of Service</span>
            <span className={styles.footerLink}>Contact</span>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 GLIDEFLOW OPERATING SYSTEM CORP. ALL PORT TERMINALS SYNCED.
        </div>
      </footer>

    </div>
  );
}
