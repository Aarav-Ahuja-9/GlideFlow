'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, Paperclip, CornerUpLeft, X, Keyboard, Search, ChevronRight, Check,
  Trash2, Loader2, Bell, ExternalLink, Sparkles, Wand2, Zap, ShieldCheck, FileEdit
} from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

// DETAILED REALISTIC MOCK DATA
const INITIAL_EMAILS = [
  { 
    id: 1, from: 'Hitesh Choudhary', senderEmail: 'hitesh@chaicode.com', initials: 'HC', 
    subject: 'Cohort 3.0 Updates & WebSockets', priority: 'Urgent', time: '10m ago', 
    snippet: 'Review the new curriculum before the live class...', 
    fullBody: "Hey Aarav,\n\nThe new Next.js and Turbopack curriculum for Cohort 3.0 is live. Please review the attached syllabus and let me know if we need to adjust the WebSocket module. We have a live Q&A this weekend, so I need your feedback ASAP.\n\nBest,\nHitesh",
    hasAttachment: true, attachmentName: 'syllabus_v3.pdf', requiresReply: true 
  },
  { 
    id: 2, from: 'Piyush Garg', senderEmail: 'piyush@100xdevs.com', initials: 'PG', 
    subject: 'Next.js Deployment on AWS', priority: 'Action', time: '2h ago', 
    snippet: 'The docker configs are updated on the staging branch...', 
    fullBody: "Bro, the Docker configs are finally updated on the staging branch. I've also set up the CI/CD pipeline for the Next.js app. Can you merge the PR and check if the environment variables are passing correctly in production?\n\nCheers,\nPiyush",
    hasAttachment: false, requiresReply: true 
  },
  { 
    id: 3, from: 'Kiran (Supabase Support)', senderEmail: 'support@supabase.io', initials: 'KS', 
    subject: 'Replication Lag on AWS-Tokyo', priority: 'Urgent', time: '3h ago', 
    snippet: 'We noticed a 1.2s delay in replication nodes...', 
    fullBody: "Hello Aarav,\n\nWe noticed a minor replication lag of 1.2s on your aws-tokyo instance node. This was due to a high volume of writes during backup. We have scaled the disk IOPS to prevent this from repeating. Let us know if you experience issues.\n\nBest,\nKiran",
    hasAttachment: false, requiresReply: false 
  },
  { 
    id: 4, from: 'GitHub Notifications', senderEmail: 'noreply@github.com', initials: 'GH', 
    subject: '[Merged] Fix session cookie validation', priority: 'Updates', time: 'Yesterday', 
    snippet: 'PR #142 successfully merged into main branch...', 
    fullBody: "Aarav Dev merged 1 commit into main from patch-clerk-redirects.\n\nCommits:\n- fix: update clerk redirect url endpoints in env configurations\n\nAll status checks passed. PR is successfully merged.",
    hasAttachment: false, requiresReply: false 
  },
  { 
    id: 5, from: 'Vercel Team', senderEmail: 'deployments@vercel.com', initials: 'VC', 
    subject: 'Production build succeeded - glide-flow', priority: 'Updates', time: 'Yesterday', 
    snippet: 'Branch main is active and routing 100% of traffic...', 
    fullBody: "Project: glide-flow\nBranch: main\nCommit: 7f58a2d\nDomain: glideflow.com\n\nStatus: Ready. Your build completed in 42 seconds and is live worldwide.",
    hasAttachment: false, requiresReply: false 
  },
  { 
    id: 6, from: 'Sridhar (Designer)', senderEmail: 'sridhar@figmaflows.co', initials: 'SD', 
    subject: 'Settings Panel Mockup feedback', priority: 'Action', time: '2 days ago', 
    snippet: 'Added the light/dark mode toggles on the dashboard page mockup...', 
    fullBody: "Hey Aarav, I updated page 2 of the Figma document containing the custom toggles and the keybinding settings layout you requested. Take a look and let me know if we need changes before final Handoff.",
    hasAttachment: true, attachmentName: 'settings_ui_v2.png', requiresReply: true 
  }
];

export default function InboxView() {
  const [emails, setEmails] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('glideflow_inbox_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Failed to parse cached emails:", e);
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('glideflow_inbox_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return false;
          }
        }
      } catch (e) {}
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  // Background Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPageCount, setSyncPageCount] = useState(0);
  const MAX_SYNC_PAGES = 10;
  
  // Quick reply form state
  const [replyText, setReplyText] = useState('');
  const [sentReplies, setSentReplies] = useState<{ [key: string]: string }>({});

  // Deletion flow states
  const [deletingEmailState, setDeletingEmailState] = useState<{
    emailId: string;
    subject: string;
    status: 'confirming' | 'requesting_approval' | 'polling' | 'deleting';
    approvalUrl?: string;
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // AI Feature States
  const [aiSummaryCache, setAiSummaryCache] = useState<{ [key: string]: string }>({});
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiRepliesCache, setAiRepliesCache] = useState<{ [key: string]: { tone: string; text: string }[] }>({});
  const [aiRepliesLoading, setAiRepliesLoading] = useState(false);
  const [showAiReplies, setShowAiReplies] = useState(false);

  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ count: number; max: number; isPro: boolean } | null>(null);
  
  // AI Draft states
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const handleAiDraft = async () => {
    if (!aiDraftPrompt.trim() || !selectedEmail) return;
    setAiDraftLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'draft-email',
          prompt: aiDraftPrompt,
          subject: selectedEmail.subject,
          emailBody: selectedEmail.fullBody,
          senderName: selectedEmail.from
        }),
      });
      const json = await res.json();
      if (json.success && json.draft) {
        setReplyText(json.draft);
        setAiDraftPrompt('');
        setNotification('✨ AI draft generated successfully!');
        setTimeout(() => setNotification(null), 3000);
        
        setAiUsage({
          count: json.aiUsageCount || 0,
          max: json.maxFreeRequests || 5,
          isPro: json.isPro || false
        });
      } else if (json.error === 'LIMIT_REACHED') {
        setShowUpgradeModal(true);
        setAiUsage({
          count: json.aiUsageCount || 5,
          max: json.maxFreeRequests || 5,
          isPro: json.isPro || false
        });
      } else {
        alert('Failed to draft email: ' + (json.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error calling AI Draft Writer');
    }
    setAiDraftLoading(false);
  };

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Helper to fetch details for a single email
  const fetchEmailDetail = async (emailId: string, active: boolean) => {
    try {
      const res = await fetch(`/api/test-gmail?id=${emailId}`);
      const json = await res.json();
      if (active && json.success && json.data) {
        setEmails(prev => {
          const next = prev.map(item => 
            item.id === emailId ? { ...json.data, loading: false } : item
          );
          localStorage.setItem('glideflow_inbox_cache', JSON.stringify(next.filter(e => !e.loading)));
          return next;
        });
      } else if (active) {
        console.error(`Failed to load detail for email ${emailId}:`, json.error || 'Unknown error');
        setEmails(prev => {
          const next = prev.map(item => 
            item.id === emailId ? { 
              id: emailId, 
              loading: false, 
              from: 'Failed to Load', 
              senderEmail: '', 
              initials: '?', 
              subject: 'Failed to load message body', 
              priority: 'Updates', 
              time: 'N/A', 
              snippet: 'Could not retrieve email contents.', 
              fullBody: 'Error loading details.', 
              hasAttachment: false, 
              requiresReply: false 
            } : item
          );
          localStorage.setItem('glideflow_inbox_cache', JSON.stringify(next.filter(e => !e.loading)));
          return next;
        });
      }
    } catch (err) {
      console.error(`Error loading detail for email ${emailId}:`, err);
      if (active) {
        setEmails(prev => {
          const next = prev.map(item => 
            item.id === emailId ? { 
              id: emailId, 
              loading: false, 
              from: 'Network Error', 
              senderEmail: '', 
              initials: '!', 
              subject: 'Network failure', 
              priority: 'Updates', 
              time: 'N/A', 
              snippet: 'Error connecting to servers.', 
              fullBody: 'Network error details.', 
              hasAttachment: false, 
              requiresReply: false 
            } : item
          );
          localStorage.setItem('glideflow_inbox_cache', JSON.stringify(next.filter(e => !e.loading)));
          return next;
        });
      }
    }
  };

  useEffect(() => {
    let active = true;
    async function fetchEmails() {
      try {
        setEmails(prev => {
          if (prev.length === 0) {
            setLoading(true);
          } else {
            setIsSyncing(true);
          }
          return prev;
        });

        const res = await fetch('/api/test-gmail');
        const json = await res.json();
        if (active) {
          if (json.success && Array.isArray(json.messages)) {
            setNextPageToken(json.nextPageToken || null);
            setError(null);
            setAuthUrl(null);
            setLoading(false);
            setIsSyncing(true);
            setSyncPageCount(1);

            setEmails(prev => {
              const reconciled = json.messages.map((m: any) => {
                const existing = prev.find(e => e.id === m.id);
                if (existing && !existing.loading) {
                  return existing;
                }
                return {
                  id: m.id,
                  loading: m.loading !== undefined ? m.loading : true,
                  from: m.from || '',
                  senderEmail: m.senderEmail || '',
                  initials: m.initials || '',
                  subject: m.subject || '',
                  priority: m.priority || '',
                  time: m.time || '',
                  snippet: m.snippet || '',
                  fullBody: m.fullBody || '',
                  hasAttachment: m.hasAttachment || false,
                  attachmentName: m.attachmentName || '',
                  requiresReply: m.requiresReply || false
                };
              });

              // ❌ Removed parallel fetch block as requested by user
              /*
              setTimeout(async () => {
                const loadingItems = reconciled.filter((p: any) => p.loading);
                for (let i = 0; i < loadingItems.length; i += 6) {
                  if (!active) break;
                  const batch = loadingItems.slice(i, i + 6);
                  await Promise.all(batch.map((p: any) => fetchEmailDetail(p.id, active)));
                }
              }, 0);
              */

              return reconciled;
            });
          } else {
            if (json.error === 'Approval Required' && json.approvalUrl) {
              setAuthUrl(json.approvalUrl);
            }
            setError(json.details || json.error || 'Failed to fetch emails');
            setEmails(prev => prev.length > 0 ? prev : INITIAL_EMAILS);
            setLoading(false);
            setIsSyncing(false);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Network error');
          setEmails(prev => prev.length > 0 ? prev : INITIAL_EMAILS);
          setLoading(false);
          setIsSyncing(false);
        }
      }
    }
    fetchEmails();
    return () => {
      active = false;
    };
  }, [syncTrigger]);

  // Tab focus revalidation and background polling (every 30 seconds)
  useEffect(() => {
    const handleFocus = () => {
      setSyncTrigger(prev => prev + 1);
    };

    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      setSyncTrigger(prev => prev + 1);
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);


  const handleLoadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await fetch(`/api/test-gmail?pageToken=${nextPageToken}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.messages)) {
        setNextPageToken(json.nextPageToken || null);
        setSyncPageCount(prev => prev + 1);

        setEmails(prev => {
          const newItems = json.messages.map((m: any) => {
            return {
              id: m.id,
              loading: m.loading !== undefined ? m.loading : true,
              from: m.from || '',
              senderEmail: m.senderEmail || '',
              initials: m.initials || '',
              subject: m.subject || '',
              priority: m.priority || '',
              time: m.time || '',
              snippet: m.snippet || '',
              fullBody: m.fullBody || '',
              hasAttachment: m.hasAttachment || false,
              attachmentName: m.attachmentName || '',
              requiresReply: m.requiresReply || false
            };
          });

          return [...prev, ...newItems];
        });
      } else {
        setError(json.details || json.error || 'Failed to load more emails');
        setIsSyncing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading more emails');
      setIsSyncing(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Background Auto-Sync Trigger
  useEffect(() => {
    if (!isSyncing || !nextPageToken || loadingMore) return;

    // Check if any of the emails in our list are currently loading
    const anyLoading = emails.some(e => e.loading);
    if (anyLoading) return; // Wait until all current skeletons have loaded

    if (syncPageCount >= MAX_SYNC_PAGES) {
      setIsSyncing(false);
      return;
    }

    const timer = setTimeout(() => {
      handleLoadMore();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSyncing, nextPageToken, emails, loadingMore, syncPageCount]);

  // Filter emails based on categories & search query
  const filteredEmails = emails.filter(e => {
    if (e.loading) return true; // Keep loading placeholders visible
    
    const matchesFilter = 
      filter === 'All' || 
      (filter === 'Urgent' && e.priority === 'Urgent') ||
      (filter === 'Action' && e.priority === 'Action') ||
      (filter === 'Updates' && e.priority === 'Updates');

    const matchesSearch = 
      e.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.senderEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.snippet?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Keep focused index within bounds of filtered list
  useEffect(() => {
    if (focusedIndex >= filteredEmails.length) {
      setFocusedIndex(Math.max(0, filteredEmails.length - 1));
    }
  }, [filteredEmails.length]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in the search bar or reply editor, ignore shortcut keys
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredEmails.length - 1));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.code === 'Space') {
        e.preventDefault();
        const focusedEmail = filteredEmails[focusedIndex];
        if (focusedEmail && !focusedEmail.loading) {
          setSelectedEmail(focusedEmail);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredEmails, focusedIndex]);

  // Scroll focused list item into view if it goes offscreen
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.children[focusedIndex] as HTMLElement;
      if (activeEl) {
        const container = listContainerRef.current;
        const elemTop = activeEl.offsetTop;
        const elemBottom = elemTop + activeEl.clientHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop - 10;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight + 10;
        }
      }
    }
  }, [focusedIndex]);

  const getAvatarStyle = (initials: string) => {
    switch (initials) {
      case 'HC': return { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#000000' };
      case 'PG': return { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff' };
      case 'KS': return { background: 'linear-gradient(135deg, #a855f7, #7e22ce)', color: '#ffffff' };
      case 'GH': return { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000000' };
      case 'VC': return { background: 'linear-gradient(135deg, #ec4899, #be185d)', color: '#ffffff' };
      case 'SD': return { background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#ffffff' };
      default: return { background: 'rgba(255,255,255,0.08)', color: '#ededed' };
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return `${styles.labelBadge} ${styles.labelUrgent}`;
      case 'action':
        return `${styles.labelBadge} ${styles.labelWork}`;
      case 'updates':
        return `${styles.labelBadge} ${styles.labelPersonal}`;
      default:
        return styles.labelBadge;
    }
  };

  const handleSendReply = (emailId: number) => {
    if (!replyText.trim()) return;
    setSentReplies(prev => ({
      ...prev,
      [emailId]: replyText
    }));
    setReplyText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      
      {/* TOP BAR */}
      <div className={styles.inboxTopBar}>
        <div className={styles.inboxCategoryGroup}>
          {['All', 'Urgent', 'Action', 'Updates'].map(tab => (
            <div 
              key={tab} 
              className={`${styles.inboxTab} ${filter === tab ? styles.inboxTabActive : ''}`} 
              onClick={() => { setFilter(tab); setFocusedIndex(0); }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Dynamic Sync Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSyncing ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#3b82f6',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 500
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'inline-block',
                animation: 'pulse 1.2s infinite ease-in-out'
              }} />
              <span>Syncing 2 months ({emails.length} loaded)...</span>
            </div>
          ) : emails.length > 0 && !emails.some(e => e.loading) && !error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#22c55e',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 500
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block'
              }} />
              <span>Synced (Last 2 months)</span>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0px 10px' }}>
          <Search size={16} color="#717171" />
          <input 
            type="text" 
            placeholder="Search email threads..." 
            className={styles.inboxSearch} 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setFocusedIndex(0); }}
            style={{ border: 'none', background: 'transparent', padding: '0.4rem 0.2rem' }}
          />
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS TIP */}
      <div className={styles.inboxHelpTip}>
        <Keyboard size={14} />
        <span>Use <span className={styles.keyboardBadge}>↑</span> / <span className={styles.keyboardBadge}>↓</span> arrow keys to navigate. Press <span className={styles.keyboardBadge}>Spacebar</span> to preview focused email.</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {error && (
        <div style={{ 
          padding: '10px 14px', 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '8px', 
          color: '#f87171', 
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>Showing backup offline data. Connection warning: {error}</span>
          <button 
            onClick={() => setError(null)} 
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {authUrl && (
        <div style={{ 
          padding: '14px 18px', 
          background: 'rgba(245, 158, 11, 0.08)', 
          border: '1px solid rgba(245, 158, 11, 0.25)', 
          borderRadius: '10px', 
          color: '#f59e0b', 
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>
              <b>Google Account Sync Required:</b> GlideFlow needs access to your Gmail to fetch your messages.
            </span>
          </div>
          <a 
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              background: '#f59e0b', 
              color: '#000', 
              padding: '6px 14px', 
              borderRadius: '6px', 
              fontWeight: 700, 
              textDecoration: 'none',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Connect Gmail <ExternalLink size={12} />
          </a>
        </div>
      )}

      {notification && (
        <div style={{ 
          padding: '10px 14px', 
          background: 'rgba(34, 197, 94, 0.08)', 
          border: '1px solid rgba(34, 197, 94, 0.2)', 
          borderRadius: '8px', 
          color: '#4ade80', 
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)} 
            style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* EMAILS LIST VIEW */}
      <div 
        ref={listContainerRef}
        className={styles.scrollContainer} 
        style={{ paddingRight: '8px', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className={styles.listItem} 
              style={{ alignItems: 'flex-start', gap: '12px', opacity: 0.5, cursor: 'default' }}
            >
              {/* Skeleton Avatar */}
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.06)',
                flexShrink: 0, 
                animation: 'pulse 1.5s infinite ease-in-out'
              }} />
              {/* Skeleton Info */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                  <div style={{ width: '40px', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                </div>
                <div style={{ width: '220px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ width: '80%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
              </div>
            </div>
          ))
        ) : filteredEmails.length > 0 ? (
          filteredEmails.map((e, index) => (
            e.loading ? (
              <div 
                key={e.id} 
                className={styles.listItem} 
                style={{ alignItems: 'flex-start', gap: '12px', opacity: 0.5, cursor: 'default' }}
              >
                {/* Skeleton Avatar */}
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.06)',
                  flexShrink: 0, 
                  animation: 'pulse 1.5s infinite ease-in-out'
                }} />
                {/* Skeleton Info */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                    <div style={{ width: '40px', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                  </div>
                  <div style={{ width: '220px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                  <div style={{ width: '80%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                </div>
              </div>
            ) : (
              <div 
                key={e.id} 
                className={`${styles.listItem} ${index === focusedIndex ? styles.focusedListItem : ''}`} 
                style={{ alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
                onClick={async () => {
                  setFocusedIndex(index);
                  setSelectedEmail(e);
                  // ✅ Fetch detail strictly on click as requested
                  if (e.loading || e.from === 'Failed to Load') {
                    await fetchEmailDetail(e.id, true);
                  }
                }}
              >
                {/* Initials Avatar */}
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  flexShrink: 0, 
                  border: '1px solid rgba(255,255,255,0.05)',
                  ...getAvatarStyle(e.initials)
                }}>
                  {e.initials}
                </div>

                {/* Email Content Snippet */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ededed', margin: 0 }}>{e.from}</h4>
                        <span className={getPriorityClass(e.priority)}>{e.priority}</span>
                        {e.requiresReply && !sentReplies[e.id] && (
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Needs Action</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#717171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.senderEmail}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#717171', whiteSpace: 'nowrap' }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#ededed', fontWeight: 500 }}>{e.subject}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, margin: 0 }}>
                      {e.snippet}
                    </p>
                    {e.hasAttachment && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '3px 8px', borderRadius: '4px', flexShrink: 0 }}>
                        <Paperclip size={12} />
                        <span>{e.attachmentName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ))
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#717171' }}>
            <Mail size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.95rem' }}>No messages found in this category.</p>
          </div>
        )}

        {nextPageToken && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#ededed',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              alignSelf: 'center',
              width: '200px',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
          >
            {loadingMore ? 'Loading more...' : 'Load More Emails'}
          </button>
        )}
      </div>

      {/* QUICK PREVIEW POPUP MODAL */}
      {selectedEmail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }} onClick={() => setSelectedEmail(null)}>
          
          <div style={{
            background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', width: '90%', maxWidth: '640px', padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', position: 'relative',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={getPriorityClass(selectedEmail.priority)} style={{ marginBottom: '8px', display: 'inline-block' }}>{selectedEmail.priority}</span>
                <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>{selectedEmail.subject}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={async () => {
                    if (aiSummaryCache[selectedEmail.id]) return; // already cached
                    setAiSummaryLoading(true);
                    try {
                      const res = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'summarize', subject: selectedEmail.subject, emailBody: selectedEmail.fullBody }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        setAiSummaryCache(prev => ({ ...prev, [selectedEmail.id]: json.summary }));
                        setAiUsage({
                          count: json.aiUsageCount || 0,
                          max: json.maxFreeRequests || 5,
                          isPro: json.isPro || false
                        });
                      } else if (json.error === 'LIMIT_REACHED') {
                        setShowUpgradeModal(true);
                        setAiUsage({
                          count: json.aiUsageCount || 5,
                          max: json.maxFreeRequests || 5,
                          isPro: json.isPro || false
                        });
                      }
                    } catch (err) { console.error('AI summarize error:', err); }
                    setAiSummaryLoading(false);
                  }}
                  disabled={aiSummaryLoading}
                  style={{ background: aiSummaryCache[selectedEmail.id] ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)', border: 'none', color: '#a78bfa', cursor: aiSummaryLoading ? 'wait' : 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = aiSummaryCache[selectedEmail.id] ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)')}
                  title={aiSummaryCache[selectedEmail.id] ? 'Summary generated' : 'AI Summarize'}
                >
                  {aiSummaryLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
                </button>
                <button 
                  onClick={() => setDeletingEmailState({
                    emailId: selectedEmail.id,
                    subject: selectedEmail.subject,
                    status: 'confirming'
                  })}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#f87171', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                  title="Delete Email"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => setSelectedEmail(null)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Email Metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '0.85rem', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>From: <b style={{ color: '#fff' }}>{selectedEmail.from}</b> &lt;{selectedEmail.senderEmail}&gt;</span>
              <span>{selectedEmail.time}</span>
            </div>

            {/* AI Summary Card */}
            {(aiSummaryLoading || aiSummaryCache[selectedEmail.id]) && (
              <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '10px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', width: '100%' }}>
                  <Sparkles size={12} />
                  <span>AI Summary</span>
                  {aiUsage && !aiUsage.isPro && (
                    <span style={{ textTransform: 'none', color: '#a1a1aa', fontWeight: 500, marginLeft: 'auto', letterSpacing: 'normal' }}>
                      Usage: {aiUsage.count} / {aiUsage.max} actions
                    </span>
                  )}
                </div>
                {aiSummaryLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ height: '12px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', animation: 'shimmer 1.5s ease-in-out infinite', width: '100%' }} />
                    <div style={{ height: '12px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', animation: 'shimmer 1.5s ease-in-out infinite 0.2s', width: '75%' }} />
                  </div>
                ) : (
                  <p style={{ color: '#e4e4e7', fontSize: '0.88rem', lineHeight: '1.55', margin: 0 }}>
                    {aiSummaryCache[selectedEmail.id]}
                  </p>
                )}
                <style>{`
                  @keyframes shimmer {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                  }
                `}</style>
              </div>
            )}

            {/* Email Body */}
            <div style={{ color: '#e4e4e7', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
              {selectedEmail.fullBody}
            </div>

            {/* Attachment Downloader */}
            {selectedEmail.hasAttachment && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ededed', fontSize: '0.85rem' }}>
                  <Paperclip size={16} color="#3b82f6" />
                  <span>{selectedEmail.attachmentName}</span>
                </div>
                <button style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                  Download File
                </button>
              </div>
            )}

            {/* Inline Reply Form / Reply thread status */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
              {sentReplies[selectedEmail.id] ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                    <Check size={14} /> Reply Sent
                  </div>
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>"{sentReplies[selectedEmail.id]}"</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '2px' }}>
                    <CornerUpLeft size={14} />
                    <span>Quick response to {selectedEmail.from}:</span>
                  </div>
                  {/* AI DRAFT WRITER INPUT BAR */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', background: 'rgba(139, 92, 246, 0.04)', border: '1px dashed rgba(139, 92, 246, 0.2)', padding: '8px', borderRadius: '6px', alignItems: 'center' }}>
                    <Sparkles size={14} color="#a78bfa" />
                    <input 
                      type="text"
                      placeholder="AI Draft Prompt: e.g. accept proposal politely..."
                      className={styles.inboxSearch}
                      value={aiDraftPrompt}
                      onChange={(e) => setAiDraftPrompt(e.target.value)}
                      disabled={aiDraftLoading}
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                    />
                    <button
                      onClick={handleAiDraft}
                      disabled={aiDraftLoading || !aiDraftPrompt.trim()}
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        color: '#a78bfa',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: aiDraftLoading ? 'wait' : 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {aiDraftLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={12} />}
                      Draft
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <textarea 
                      placeholder="Write your email reply here..." 
                      className={styles.inboxSearch} 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ 
                        flex: 1, 
                        height: '36px', 
                        minHeight: '36px',
                        maxHeight: '120px',
                        resize: 'vertical',
                        padding: '8px 12px', 
                        fontFamily: 'inherit', 
                        lineHeight: '1.4', 
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)'
                      }}
                    />
                    <button 
                      onClick={async () => {
                        if (aiRepliesCache[selectedEmail.id]) {
                          setShowAiReplies(!showAiReplies);
                          return;
                        }
                        setAiRepliesLoading(true);
                        setShowAiReplies(true);
                        try {
                          const res = await fetch('/api/ai', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'smart-reply', subject: selectedEmail.subject, emailBody: selectedEmail.fullBody, senderName: selectedEmail.from }),
                          });
                          const json = await res.json();
                          if (json.success) {
                            setAiRepliesCache(prev => ({ ...prev, [selectedEmail.id]: json.replies }));
                            setAiUsage({
                              count: json.aiUsageCount || 0,
                              max: json.maxFreeRequests || 5,
                              isPro: json.isPro || false
                            });
                          } else if (json.error === 'LIMIT_REACHED') {
                            setShowUpgradeModal(true);
                            setAiUsage({
                              count: json.aiUsageCount || 5,
                              max: json.maxFreeRequests || 5,
                              isPro: json.isPro || false
                            });
                          }
                        } catch (err) { console.error('AI smart-reply error:', err); }
                        setAiRepliesLoading(false);
                      }}
                      disabled={aiRepliesLoading}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))', 
                        color: '#a78bfa', 
                        border: '1px solid rgba(139, 92, 246, 0.2)', 
                        padding: '0px 14px', 
                        borderRadius: '6px', 
                        fontWeight: 600, 
                        cursor: aiRepliesLoading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))'; }}
                      title="AI Suggest Replies"
                    >
                      {aiRepliesLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={14} />}
                      AI Suggest
                    </button>
                    <button 
                      onClick={() => handleSendReply(selectedEmail.id)}
                      style={{ 
                        background: '#22c55e', 
                        color: '#000000', 
                        border: 'none', 
                        padding: '0px 16px', 
                        borderRadius: '6px', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Send
                    </button>
                  </div>

                  {/* AI Smart Reply Suggestions */}
                  {showAiReplies && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {aiRepliesLoading ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[1, 2, 3].map(i => (
                            <div key={i} style={{ flex: 1, height: '32px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.06)', animation: `shimmer 1.5s ease-in-out infinite ${i * 0.15}s` }} />
                          ))}
                        </div>
                      ) : aiRepliesCache[selectedEmail.id] ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {aiRepliesCache[selectedEmail.id].map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => { setReplyText(reply.text); setShowAiReplies(false); }}
                              style={{
                                flex: 1,
                                minWidth: '120px',
                                padding: '8px 12px',
                                background: 'rgba(139, 92, 246, 0.06)',
                                border: '1px solid rgba(139, 92, 246, 0.12)',
                                borderRadius: '8px',
                                color: '#e4e4e7',
                                fontSize: '0.78rem',
                                lineHeight: '1.4',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.06)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.12)'; }}
                            >
                              <span style={{ color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {reply.tone}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                {reply.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC GOOGLE GMAIL DELETION MODAL */}
      {deletingEmailState && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#0a0a0a',
            width: '450px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} color="#ef4444" />
                Delete Gmail Email
              </h3>
              <button 
                type="button"
                disabled={deletingEmailState.status === 'deleting'}
                onClick={() => setDeletingEmailState(null)} 
                style={{ background: 'transparent', border: 'none', color: '#717171', cursor: deletingEmailState.status === 'deleting' ? 'not-allowed' : 'pointer', display: 'flex', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: '1.5' }}>
              {deletingEmailState.status === 'confirming' && (
                <p style={{ margin: 0 }}>
                  Are you sure you want to delete <strong style={{ color: '#fff' }}>{deletingEmailState.subject}</strong>? It will be moved to the Gmail trash bin.
                </p>
              )}

              {deletingEmailState.status === 'deleting' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#ef4444' }} />
                  <p style={{ margin: 0, textAlign: 'center' }}>Moving email to trash bin...</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
              {deletingEmailState.status === 'confirming' && (
                <>
                  <button 
                    type="button"
                    onClick={() => setDeletingEmailState(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#a1a1aa',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={async () => {
                      setDeletingEmailState((prev: any) => prev ? { ...prev, status: 'deleting' } : null);
                      try {
                        const res = await fetch(`/api/test-gmail?id=${deletingEmailState.emailId}`, {
                          method: 'DELETE'
                        });
                        const json = await res.json();
                        if (json.success) {
                          setEmails((prev: any[]) => {
                            const next = prev.filter((e: any) => e.id !== deletingEmailState.emailId);
                            localStorage.setItem('glideflow_inbox_cache', JSON.stringify(next.filter(e => !e.loading)));
                            return next;
                          });
                          setSelectedEmail(null);
                          setNotification('Email moved to trash bin.');
                          setTimeout(() => setNotification(null), 4000);
                          setDeletingEmailState(null);
                        } else {
                          alert("Failed to delete email: " + (json.details || json.error));
                          setDeletingEmailState(null);
                        }
                      } catch (err: any) {
                        console.error(err);
                        alert("Error deleting email: " + err.message);
                        setDeletingEmailState(null);
                      }
                    }}
                    style={{
                      background: '#ef4444',
                      border: 'none',
                      color: '#fff',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    Delete Email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM UPGRADE MODAL --- */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowUpgradeModal(false)}>
          
          <div style={{
            background: 'linear-gradient(180deg, #121214 0%, #0a0a0c 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px', width: '90%', maxWidth: '480px', padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.25)', position: 'relative',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setShowUpgradeModal(false)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#717171', cursor: 'pointer', display: 'flex', padding: '4px' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#a78bfa' }}>
                <Sparkles size={24} style={{ animation: 'pulse-glow 2s infinite alternate' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: 0 }}>Free Trial Limit Reached</h2>
              <p style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
                You have used your 5 free AI requests. Upgrade to <b>GlideFlow Pro</b> to unlock unlimited AI scheduling, drafting, and summaries.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ededed' }}>
                <Zap size={14} color="#22c55e" />
                <span>Unlimited Morning Briefings & Summaries</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ededed' }}>
                <Sparkles size={14} color="#22c55e" />
                <span>AI Smart Event Planner & Scheduling</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ededed' }}>
                <FileEdit size={14} color="#22c55e" />
                <span>AI Quick Response Email Draft Writer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ededed' }}>
                <ShieldCheck size={14} color="#22c55e" />
                <span>Local DB caching & priority shortcut engine</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowUpgradeModal(false);
                router.push('/checkout');
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Upgrade to Pro <Zap size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
