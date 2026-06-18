'use client';

import { useState } from 'react';
import { 
  Sliders, Keyboard, Check, Trash2, Plus, 
  CheckCircle, Play, Sparkles
} from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

// Initial dummy data for rules & keybinds
const INITIAL_RULES = [
  { id: 1, event: 'On Urgent Email', condition: 'Contains "bug" or "crash"', action: 'Mark as Urgent Priority' },
  { id: 2, event: 'On Daily Agenda', condition: 'Before 9:00 AM', action: 'Generate AI morning briefing' },
  { id: 3, event: 'On GitHub Notification', condition: 'PR merged into main', action: 'Move task to QA verification' }
];

const INITIAL_KEYBINDS = [
  { id: 'inbox', action: 'Go to Inbox', sequence: 'G then I' },
  { id: 'calendar', action: 'Go to Calendar', sequence: 'G then C' },
  { id: 'compose', action: 'Open Compose Modal', sequence: 'C' },
  { id: 'search', action: 'Focus Search Bar', sequence: '/' },
  { id: 'shortcuts', action: 'Show Shortcut Helper', sequence: '?' },
  { id: 'archive', action: 'Archive Email Thread', sequence: 'E' }
];

export default function WorkspaceSettingsView() {
  const [activeTab, setActiveTab] = useState<'preferences' | 'automation' | 'keybinds'>('preferences');
  const [toast, setToast] = useState('');
  
  // Preferences State
  const [theme, setTheme] = useState<'dark' | 'cyberpunk' | 'nord' | 'obsidian'>('dark');
  const [accent, setAccent] = useState<'green' | 'blue' | 'purple' | 'orange'>('green');
  const [refreshRate, setRefreshRate] = useState('5m');
  const [vimMode, setVimMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  // Automation State
  const [rules, setRules] = useState(INITIAL_RULES);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleEvent, setNewRuleEvent] = useState('On Urgent Email');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('Mark as Urgent Priority');
  const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'direct' | 'bullets'>('professional');
  const [autoArchiveDays, setAutoArchiveDays] = useState(14);

  // Keyboard Shortcuts State
  const [keybinds, setKeybinds] = useState(INITIAL_KEYBINDS);
  const [editingKeybindId, setEditingKeybindId] = useState<string | null>(null);
  const [tempKeybindVal, setTempKeybindVal] = useState('');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Automation Rule Actions
  const handleCreateRule = () => {
    if (!newRuleCondition.trim()) {
      triggerToast('Please write a trigger condition pattern');
      return;
    }
    const newRule = {
      id: Date.now(),
      event: newRuleEvent,
      condition: newRuleCondition,
      action: newRuleAction
    };
    setRules([...rules, newRule]);
    setShowRuleModal(false);
    setNewRuleCondition('');
    triggerToast('Automated workflow rule successfully added');
  };

  const handleDeleteRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
    triggerToast('Workflow rule deleted.');
  };

  // Keybind Config Actions
  const handleStartEditKeybind = (id: string, currentVal: string) => {
    setEditingKeybindId(id);
    setTempKeybindVal(currentVal);
  };

  const handleSaveKeybind = (id: string) => {
    if (!tempKeybindVal.trim()) return;
    setKeybinds(keybinds.map(k => k.id === id ? { ...k, sequence: tempKeybindVal } : k));
    setEditingKeybindId(null);
    triggerToast('Keyboard shortcut updated');
  };

  const handleResetKeybinds = () => {
    setKeybinds(INITIAL_KEYBINDS);
    triggerToast('All shortcuts restored to defaults');
  };

  // Custom accent theme styling
  const getAccentColor = () => {
    switch (accent) {
      case 'blue': return '#3b82f6';
      case 'purple': return '#a855f7';
      case 'orange': return '#f97316';
      default: return '#22c55e'; // Green
    }
  };

  const getAccentBg = () => {
    switch (accent) {
      case 'blue': return 'rgba(59, 130, 246, 0.1)';
      case 'purple': return 'rgba(168, 85, 247, 0.1)';
      case 'orange': return 'rgba(249, 115, 22, 0.1)';
      default: return 'rgba(34, 197, 94, 0.1)';
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, gap: '2rem', height: 'calc(100vh - 200px)', minHeight: '520px', paddingBottom: '2rem' }}>
      
      {/* Toast Alert Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          backgroundColor: '#18181b', border: `1px solid ${getAccentColor()}`,
          color: getAccentColor(), padding: '1rem 1.5rem', borderRadius: '8px',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 999
        }}>
          <CheckCircle size={18} /> {toast}
        </div>
      )}

      {/* LEFT COLUMN: Section tabs Selector */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '1.2rem', flexShrink: 0 }}>
        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#717171', letterSpacing: '1px', fontWeight: 700, paddingLeft: '8px', marginBottom: '8px' }}>
          Settings Navigation
        </h4>
        
        <button 
          onClick={() => setActiveTab('preferences')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, textAlign: 'left',
            background: activeTab === 'preferences' ? getAccentBg() : 'transparent',
            color: activeTab === 'preferences' ? getAccentColor() : '#a1a1aa',
            borderLeft: activeTab === 'preferences' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Sliders size={16} /> Preferences
        </button>

        <button 
          onClick={() => setActiveTab('automation')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, textAlign: 'left',
            background: activeTab === 'automation' ? getAccentBg() : 'transparent',
            color: activeTab === 'automation' ? getAccentColor() : '#a1a1aa',
            borderLeft: activeTab === 'automation' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Play size={16} /> Rules & Automation
        </button>

        <button 
          onClick={() => setActiveTab('keybinds')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, textAlign: 'left',
            background: activeTab === 'keybinds' ? getAccentBg() : 'transparent',
            color: activeTab === 'keybinds' ? getAccentColor() : '#a1a1aa',
            borderLeft: activeTab === 'keybinds' ? `3px solid ${getAccentColor()}` : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Keyboard size={16} /> Keyboard Bindings
        </button>
      </div>

      {/* RIGHT COLUMN: Settings content area */}
      <div className={styles.scrollContainer} style={{ flex: 1, maxHeight: '100%', paddingRight: '12px' }}>
        
        {/* ==================== PREFERENCES TAB ==================== */}
        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Visual Accent Color selector */}
            <div className={styles.card}>
              <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
                Theme Highlight Accent
              </div>
              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '1rem' }}>
                Customize the default indicator accent theme color of the GlideFlow application workflow dashboard.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { name: 'Hyper Green', val: 'green', code: '#22c55e' },
                  { name: 'Electric Blue', val: 'blue', code: '#3b82f6' },
                  { name: 'Neon Purple', val: 'purple', code: '#a855f7' },
                  { name: 'Vibrant Orange', val: 'orange', code: '#f97316' }
                ].map(col => (
                  <div 
                    key={col.val}
                    onClick={() => { setAccent(col.val as any); triggerToast(`Accent set to ${col.name}!`); }}
                    style={{
                      flex: 1, minWidth: '130px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: accent === col.val ? `1px solid ${col.code}` : '1px solid rgba(255,255,255,0.06)',
                      background: accent === col.val ? `${col.code}11` : 'rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: col.code, boxShadow: `0 0 8px ${col.code}` }}></span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: accent === col.val ? '#fff' : '#a1a1aa' }}>{col.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Theme Selection */}
            <div className={styles.card}>
              <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
                Appearance Theme
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { id: 'dark', name: 'Hyper Dark (Default)', desc: 'Standard deep dark canvas optimized for low eye strain.' },
                  { id: 'cyberpunk', name: 'Cyberpunk Cyber', desc: 'Neon highlights with synthetic grid backgrounds.' },
                  { id: 'nord', name: 'Nordic Frost', desc: 'Slightly colder, grayish-blue aesthetic for focus.' },
                  { id: 'obsidian', name: 'Obsidian Night', desc: 'Pure midnight black styling for OLED screens.' }
                ].map(th => (
                  <div 
                    key={th.id}
                    onClick={() => { setTheme(th.id as any); triggerToast(`Theme updated to ${th.name}!`); }}
                    style={{
                      padding: '1.2rem', borderRadius: '10px', cursor: 'pointer',
                      border: theme === th.id ? `1px solid ${getAccentColor()}` : '1px solid rgba(255, 255, 255, 0.05)',
                      background: theme === th.id ? getAccentBg() : 'rgba(0,0,0,0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <h5 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, margin: 0 }}>{th.name}</h5>
                    <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px', lineHeight: '1.4' }}>{th.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* App General Configurations */}
            <div className={styles.card}>
              <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
                System Configuration
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Field 1: Refresh Sync Interval */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Sync Refresh Cycle</div>
                    <div style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>How frequently GlideFlow updates inbox databases.</div>
                  </div>
                  <select 
                    value={refreshRate}
                    onChange={(e) => { setRefreshRate(e.target.value); triggerToast(`Sync interval set to ${e.target.value}`); }}
                    style={{
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', outline: 'none'
                    }}
                  >
                    <option value="1m">Every 1 minute (Fast)</option>
                    <option value="5m">Every 5 minutes (Standard)</option>
                    <option value="15m">Every 15 minutes (Eco)</option>
                    <option value="manual">Manual Pull Only</option>
                  </select>
                </div>

                {/* Field 2: Vim Mode Toggles */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Vim Keyboard Bindings</div>
                    <div style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>Use traditional Vim keybindings (`h`/`j`/`k`/`l`) for navigation.</div>
                  </div>
                  <button 
                    onClick={() => { setVimMode(!vimMode); triggerToast(`Vim mode navigation ${!vimMode ? 'enabled' : 'disabled'}`); }}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      background: vimMode ? getAccentColor() : 'rgba(255,255,255,0.08)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', background: vimMode ? '#000' : '#a1a1aa',
                      position: 'absolute', top: '3px', left: vimMode ? '19px' : '3px',
                      transition: 'all 0.2s'
                    }}></div>
                  </button>
                </div>

                {/* Field 3: Sound Cue Effects */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Audio Cues & Sound FX</div>
                    <div style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px' }}>Play subtle micro-sounds on task completions and alerts.</div>
                  </div>
                  <button 
                    onClick={() => { setSoundEffects(!soundEffects); triggerToast(`Sound effects ${!soundEffects ? 'enabled' : 'disabled'}`); }}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      background: soundEffects ? getAccentColor() : 'rgba(255,255,255,0.08)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', background: soundEffects ? '#000' : '#a1a1aa',
                      position: 'absolute', top: '3px', left: soundEffects ? '19px' : '3px',
                      transition: 'all 0.2s'
                    }}></div>
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ==================== RULES & AUTOMATION TAB ==================== */}
        {activeTab === 'automation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* AI Assistant Configs */}
            <div className={styles.card}>
              <div className={styles.cardTitle} style={{ marginBottom: '1.2rem' }}>
                AI Assistant Customizations
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Writing Tone Selection */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '8px' }}>
                    AI Automated Reply Tone
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { val: 'professional', label: 'Professional' },
                      { val: 'casual', label: 'Casual' },
                      { val: 'direct', label: 'Direct' },
                      { val: 'bullets', label: 'Bullet Points' }
                    ].map(t => (
                      <button
                        key={t.val}
                        onClick={() => { setAiTone(t.val as any); triggerToast(`AI writing tone changed to ${t.label}`); }}
                        style={{
                          background: aiTone === t.val ? getAccentBg() : 'rgba(0,0,0,0.2)',
                          border: aiTone === t.val ? `1px solid ${getAccentColor()}` : '1px solid rgba(255,255,255,0.06)',
                          color: aiTone === t.val ? '#fff' : '#a1a1aa',
                          padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Archive Time */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'block' }}>Auto-Archive Inactive Emails</span>
                    <span style={{ fontSize: '0.75rem', color: '#717171', marginTop: '2px', display: 'block' }}>
                      Automatically archive email threads that have remained inactive.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number"
                      value={autoArchiveDays}
                      onChange={(e) => setAutoArchiveDays(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '60px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.8rem', textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>days</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Custom Rules Engine Builder */}
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div className={styles.cardTitle}>
                  Workflow Rules Engine
                </div>
                <button 
                  onClick={() => setShowRuleModal(true)}
                  style={{
                    background: getAccentColor(), color: '#000', border: 'none', padding: '6px 12px',
                    borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Plus size={14} /> Create Rule
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '1.2rem', lineHeight: '1.4' }}>
                Build event-driven rules to trigger actions inside task workflows when certain conditions are met.
              </p>

              {/* Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rules.map(rule => (
                  <div 
                    key={rule.id}
                    style={{
                      padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: getAccentColor() }}>IF</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{rule.event}</span>
                        <span style={{ color: '#717171' }}>({rule.condition})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#a1a1aa' }}>THEN</span>
                        <span style={{ color: '#ededed' }}>{rule.action}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{
                        background: 'transparent', border: 'none', color: '#717171',
                        cursor: 'pointer', padding: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#717171'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==================== KEYBOARD BINDINGS TAB ==================== */}
        {activeTab === 'keybinds' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className={styles.cardTitle}>
                  Interactive Keyboard Shortcuts
                </div>
                <button 
                  onClick={handleResetKeybinds}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Restore Defaults
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '1.2rem', lineHeight: '1.4' }}>
                Modify keyboard hotkeys to fly through page navigation, thread previews, and email drafting without touching your mouse.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {keybinds.map(kb => {
                  const isEditing = editingKeybindId === kb.id;
                  return (
                    <div 
                      key={kb.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{kb.action}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              type="text"
                              value={tempKeybindVal}
                              onChange={(e) => setTempKeybindVal(e.target.value)}
                              placeholder="e.g. G then A"
                              style={{
                                padding: '4px 8px', borderRadius: '4px', background: '#000',
                                border: `1px solid ${getAccentColor()}`, color: '#fff', fontSize: '0.8rem',
                                width: '110px', textAlign: 'center'
                              }}
                            />
                            <button 
                              onClick={() => handleSaveKeybind(kb.id)}
                              style={{
                                background: getAccentColor(), color: '#000', border: 'none',
                                padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem',
                                fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <code style={{
                              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                              color: getAccentColor(), borderRadius: '6px', padding: '4px 10px',
                              fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold'
                            }}>
                              {kb.sequence}
                            </code>
                            <button 
                              onClick={() => handleStartEditKeybind(kb.id, kb.sequence)}
                              style={{
                                background: 'transparent', border: 'none', color: '#717171',
                                fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#717171'}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ==================== MODALS ==================== */}

      {/* Automation Rule Modal */}
      {showRuleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900
        }} onClick={() => setShowRuleModal(false)}>
          
          <div style={{
            background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', width: '90%', maxWidth: '440px', padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', position: 'relative',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }} onClick={(e) => e.stopPropagation()}>
            
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700, margin: 0 }}>Build Custom Rule</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>IF: Event Trigger</label>
                <select 
                  value={newRuleEvent}
                  onChange={(e) => setNewRuleEvent(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none'
                  }}
                >
                  <option value="On Urgent Email">On Urgent Email</option>
                  <option value="On Daily Agenda">On Daily Agenda</option>
                  <option value="On GitHub PR Merge">On GitHub Notification</option>
                  <option value="On Database replication failure">On Database Replication</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Condition Pattern</label>
                <input 
                  type="text"
                  value={newRuleCondition}
                  onChange={(e) => setNewRuleCondition(e.target.value)}
                  placeholder="e.g. Contains 'bug' or 'crash'"
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>THEN: Execute Action</label>
                <select 
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none'
                  }}
                >
                  <option value="Mark as Urgent Priority">Mark as Urgent Priority</option>
                  <option value="Generate AI morning briefing">Generate AI morning briefing</option>
                  <option value="Move task to QA verification">Move task to QA verification</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  onClick={() => setShowRuleModal(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateRule}
                  style={{ background: getAccentColor(), color: '#000', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Activate Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
