"use client"

import React, { useState } from 'react';
import './landing.css'; 

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="landing-wrapper">
      
      {/* STATIC BACKGROUND AMBIENT GLOWS */}
      <div className="bg-light-orb orb-left" />
      <div className="bg-light-orb orb-right" />
      <div className="bg-light-orb orb-center" />

      {/* ==========================================
          SECTION 1: HERO COCKPIT
         ========================================== */}
      <section className="section-block">
        <div className="layout-hero hero-wrapper">
          <div className="badge-pill glass-card">
            <span className="badge-dot" />
            The Future of Serverless Orchestration
          </div>

          <h1 className="main-headline">
            Your workspace, unified. <br />Communication meets AI.
          </h1>

          <p className="main-desc">
            Eliminate digital fragmentation. Streamline live Gmail communication feeds and Google Calendar timelines into a high-fidelity, frosted cockpit powered by dynamic workflows.
          </p>

          <div className="action-trigger-group">
            <button className="ux-btn-primary">Launch Application →</button>
            <button className="ux-btn-secondary glass-card">Watch Technical Pitch</button>
          </div>

          <div className="app-frame-wrapper glass-card">
            <div className="app-frame-layout">
              <div style={{ width: '25%', borderRight: '1px solid rgba(255,255,255,0.03)', paddingRight: '16px' }}>
                <div style={{ height: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '14px' }} />
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', marginBottom: '8px', width: '85%' }} />
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', width: '65%' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '25%' }} />
                  <div style={{ color: '#6366f1', fontSize: '10px', background: 'rgba(99,102,241,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Premium Secured</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 2: ECOSYSTEM TRUST NODES
         ========================================== */}
      <section className="section-block" style={{ padding: '30px 24px' }}>
        <div className="layout-hero trust-wrapper">
          <p className="trust-caption">Integrations Core Ecosystem</p>
          <div className="trust-row-items">
            {['Google Gmail', 'Google Calendar', 'Clerk Auth', 'Corsair MCP', 'Razorpay API'].map((tech) => (
              <div key={tech} className="trust-node-badge glass-card">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 3: THE CORE BENTO GRID
         ========================================== */}
      <section className="section-block">
        <div className="layout-bento">
          <div className="module-center-header">
            <h2 className="section-title">Engineered to optimize your data flow.</h2>
            <p className="main-desc" style={{ margin: '0 auto' }}>Four custom micro-modules built perfectly to handle high-frequency communication protocols.</p>
          </div>

          <div className="module-grid-engine">
            <div className="module-block-card extended-span glass-card">
              <div className="module-index">01</div>
              <h3>Omni-Channel Real-Time Feed</h3>
              <p>Consolidate dirty asynchronous multi-account mail chains into clean sanitized JSON state models. Instant background thread reading with automated caching systems.</p>
            </div>

            <div className="module-block-card glass-card">
              <div className="module-index">02</div>
              <h3>Automated CRUD Orchestration</h3>
              <p>Full calendar lifecycles. Generate, query, patch or delete database events on primary schedules with zero timezone overlap glitches.</p>
            </div>

            <div className="module-block-card glass-card">
              <div className="module-index">03</div>
              <h3>Secure Tenant Architecture</h3>
              <p>Clerk multi-token separation. Hard-encrypted endpoints protect private sessions ensuring absolutely zero data cross-talk.</p>
            </div>

            <div className="module-block-card extended-span glass-card">
              <div className="module-index">04</div>
              <h3>Context-Aware Core AI Triage</h3>
              <p>Parse incoming text payloads through LLMs to instantly distill summaries and prioritize actions. Smart-replies generate in one click matching conversational intents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 4: AI TRANSFORMATION WORKFLOW
         ========================================== */}
      <section className="section-block">
        <div className="layout-workflow pipe-integration-flex">
          <div>
            <div className="meta-tag">Autonomous Pipelines</div>
            <h2 className="section-title">Transform raw logs into structured execution blocks.</h2>
            <p className="main-desc" style={{ textAlign: 'left', maxWidth: '100%', marginBottom: '20px' }}>
              GlideFlow maps your communication environment dynamically. When a chaotic message enters the inbox, our underlying MCP logic maps its intent parameters, cross-checks calendar tokens, and generates optimized workflows without human context switching.
            </p>
            <div className="flow-step-stack">
              {['Extract raw string payloads from stream endpoints.', 'Process structural evaluation via sandboxed script compiling.', 'Compile live calendar updates to Google Core servers.'].map((step, idx) => (
                <div key={idx} className="flow-step-row">
                  <span className="flow-step-num">{idx + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="visual-data-terminal glass-card">
            <div className="terminal-input-segment">
              <span style={{ color: '#fbbf24' }}>⚡ INBOUND_STREAM:</span> "Hey Aarav, can we reschedule our code cleanup call to next Tuesday at 4 PM IST?"
            </div>
            <div className="pipe-arrow">↓ AI ENGINE PROCESSING ↓</div>
            <div className="terminal-output-segment">
              <span style={{ color: '#818cf8' }}>✅ INTENT_MAPPED:</span> Create Google Calendar Event <br />
              <span style={{ color: '#818cf8' }}>📅 DATE_BOUNDS:</span> 2026-06-23T10:30:00Z <br />
              <span style={{ color: '#818cf8' }}>🛡️ TOKEN_SYNC:</span> Success (Isolated Session Active)
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 5: ARCHITECTURAL METRICS
         ========================================== */}
      <section className="section-block" style={{ padding: '60px 24px' }}>
        <div className="layout-metrics telemetry-row-grid">
          {[
            { value: '< 150ms', label: 'Average Processing Latency', sub: 'Optimized serverless streams' },
            { value: '0.00%', label: 'Session Collision Rate', sub: 'Anti-collision jitter active' },
            { value: '15 Mins', label: 'Standard Integration Setup', sub: '1-click secure authorization' },
            { value: '99.99%', label: 'Uptime Reliability Guarantee', sub: 'Decentralized cloud network' }
          ].map((metric, i) => (
            <div key={i} className="telemetry-node glass-card">
              <div className="telemetry-metric">{metric.value}</div>
              <div className="telemetry-label">{metric.label}</div>
              <div className="telemetry-desc">{metric.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================
          SECTION 6: MONETIZATION GRID
         ========================================== */}
      <section className="section-block">
        <div className="layout-pricing">
          <div className="module-center-header">
            <div className="meta-tag">Flexible Plans</div>
            <h2 className="section-title">Lock in your subscription tier.</h2>
            <p className="main-desc" style={{ margin: '0 auto' }}>Seamless checkout gateways powered directly by active Razorpay interfaces.</p>
          </div>

          <div className="monetization-layout-grid">
            <div className="pricing-frosted-card glass-card">
              <div>
                <h4>Standard Sandbox</h4>
                <div className="rate-block">₹0 <span>/ forever</span></div>
                <ul className="pricing-feature-checklist">
                  <li>Max 15 list results per view</li>
                  <li>Basic email header parsing</li>
                  <li>Standard Google Calendar CRUD actions</li>
                  <li className="locked-feature">High-token AI orchestration</li>
                </ul>
              </div>
              <button className="tier-action-button btn-tier-standard">Access Basic Sandbox</button>
            </div>

            <div className="pricing-frosted-card premium-glow-tier glass-card">
              <div>
                <h4 style={{ color: '#f4f4f5' }}>Developer Core Premium</h4>
                <div className="rate-block">₹499 <span>/ month</span></div>
                <ul className="pricing-feature-checklist" style={{ color: '#e4e4e7' }}>
                  <li>Infinite feed data rendering models</li>
                  <li>Advanced multi-account workspace layers</li>
                  <li>High-frequency autonomous AI triage processing</li>
                  <li>Live priority support endpoints</li>
                </ul>
              </div>
              <button className="tier-action-button btn-tier-premium">Upgrade with Razorpay →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          NEW SECTION: AUTHORIZATION GUIDE
         ========================================== */}
      <section className="section-block" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="layout-auth-guide">
          
          <div className="module-center-header">
            <div className="meta-tag">1-Click Integration</div>
            <h2 className="section-title">How Authorization Works</h2>
            <p className="main-desc" style={{ margin: '0 auto', fontSize: '14.5px' }}>
              You do not need to create any new accounts! Link your existing active Google profile securely in under 30 seconds.
            </p>
          </div>
2
          <div className="auth-split-grid">
            
            {/* Left Column: Privacy & Safety Rules */}
            <div className="security-trust-card glass-card">
              <h3>Privacy & Guardrails</h3>
              
              <div className="trust-item-row">
                <div className="trust-item-title">Clerk vs. Google</div>
                <div className="trust-item-desc">When you logged into GlideFlow, you used Clerk to sign in. This created your core profile base.</div>
              </div>

              <div className="trust-item-row">
                <div className="trust-item-title">Accessing Your Mail</div>
                <div className="trust-item-desc">Because emails are strictly private, Google blocks all access until you explicitly grant permission.</div>
              </div>

              <div className="trust-item-row">
                <div className="trust-item-title">No Password Sharing</div>
                <div className="trust-item-desc">You are authentication-routing directly through Google servers. GlideFlow never sees or stores your password.</div>
              </div>
            </div>

            {/* Right Column: Steps Timeline */}
            <div className="timeline-stepper">
              
              <div className="stepper-row-card glass-card">
                <div className="stepper-badge-idx">1</div>
                <div className="stepper-content-text">
                  Click <strong>Connect Google Account</strong> on your primary dashboard router.
                </div>
              </div>

              <div className="stepper-row-card glass-card">
                <div className="stepper-badge-idx">2</div>
                <div className="stepper-content-text">
                  Select your existing Gmail workspace identity from the official login prompt screen.
                </div>
              </div>

              {/* Highlighted Google Sandbox Warning Alert Step */}
              <div className="stepper-row-card glass-card sandbox-alert-box">
                <div className="stepper-badge-idx">3</div>
                <div className="stepper-content-text">
                  <strong>Google Sandbox Alert:</strong> Since we are in development, click <strong>Advanced</strong> on the bottom left, then select <strong>Go to Corsair (unsafe)</strong> to safely proceed.
                </div>
              </div>

              <div className="stepper-row-card glass-card">
                <div className="stepper-badge-idx">4</div>
                <div className="stepper-content-text">
                  Click <strong>Allow</strong> on the final screen, refresh your dashboard, and watch your feed populate instantly!
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ==========================================
          SECTION 7: CONTEXTUAL ACCORDION (FAQ)
         ========================================== */}
      <section className="section-block">
        <div className="layout-faq">
          <div className="module-center-header">
            <h2 className="section-title" style={{ fontSize: '30px' }}>Frequently Asked Concepts</h2>
            <p className="main-desc" style={{ margin: '0 auto', fontSize: '14px' }}>Deep technical questions answered transparently.</p>
          </div>

          <div className="faq-accordion-container">
            {[
              { q: "How does GlideFlow handle Google API concurrency lag?", a: "We utilize an optimized staggered client loop alongside randomized backoff jitter structures in our repository handlers. This delays concurrent operations by a few milliseconds to ensure absolute structural sync without token exhaustion errors." },
              { q: "Is my personal email data secure within the multi-tenant setup?", a: "Yes. GlideFlow utilizes decentralized Clerk user metadata identifiers. This isolates each tenant's context parameters strictly, ensuring zero cross-talk or server-side cache exposure." },
              { q: "What happens if a Google API verification error shows up?", a: "Since the OAuth client credentials exist inside a production sandbox environment, simply click 'Advanced' -> 'Go to [App Name] (unsafe)' on the Google OAuth consent interface to safely connect your live profile." }
            ].map((item, index) => (
              <div key={index} className="faq-row-item glass-card">
                <button 
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="faq-row-toggle"
                >
                  <span>{item.q}</span>
                  <span className="faq-row-status-icon">{activeFaq === index ? '▲' : '▼'}</span>
                </button>
                {activeFaq === index && (
                  <div className="faq-row-content-panel">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}