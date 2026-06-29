import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Mail, Calendar, Clock, FileEdit, Sparkles, Link2, 
  Video, Users, ExternalLink, Paperclip, CornerUpLeft, Loader2, X, RefreshCw, Zap, ShieldCheck
} from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

// Parse google calendar events to internal UI structure
function parseGoogleEvent(item: any) {
  if (!item) {
    return {
      id: `temp-fallback-${Date.now()}-${Math.random()}`,
      type: 'Meeting',
      title: 'Untitled Event',
      time: 'All Day',
      duration: '24h',
      status: 'Upcoming',
      agenda: '',
      platform: 'None',
      meetingLink: '#',
      attendees: 'None',
      doc: '',
      priority: 'Medium',
      assignee: 'Unassigned',
      alertType: 'Notification Badge',
      category: 'Coding',
      topic: '',
      startDateObj: new Date(),
      endDateObj: new Date()
    };
  }

  let parsedItem = item;
  if (typeof item === 'string') {
    try {
      parsedItem = JSON.parse(item);
    } catch (e) {
      console.error("Failed to parse stringified event item:", e);
    }
  }

  const id = parsedItem.id || parsedItem.iCalUID || `temp-fallback-${Date.now()}-${Math.random()}`;
  const title = parsedItem.summary || 'Untitled Event';
  const rawDescription = parsedItem.description || '';
  
  let parsedMetadata: any = {};
  let agenda = rawDescription;
  
  if (rawDescription.includes('---\nMetadata:')) {
    const parts = rawDescription.split('---\nMetadata:');
    agenda = parts[0].trim();
    try {
      parsedMetadata = JSON.parse(parts[1].trim());
    } catch (e) {
      console.error("Failed to parse event metadata:", e);
    }
  }

  const startStr = parsedItem.start?.dateTime || parsedItem.start?.date || '';
  const endStr = parsedItem.end?.dateTime || parsedItem.end?.date || '';
  
  let time = 'All Day';
  let duration = '24h';
  
  if (startStr && endStr) {
    try {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };
      
      if (parsedItem.start?.dateTime) {
        time = `${formatTime(startDate)} - ${formatTime(endDate)}`;
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins < 60) {
          duration = `${diffMins}m`;
        } else {
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
      }
    } catch (e) {}
  }

  const type = parsedMetadata.type || (parsedItem.location || parsedItem.hangoutLink || parsedItem.attendees ? 'Meeting' : 'Reminder');
  const platform = parsedMetadata.platform || (parsedItem.hangoutLink ? 'Google Meet' : parsedItem.location ? 'Location' : 'None');
  const meetingLink = parsedMetadata.meetingLink || parsedItem.hangoutLink || parsedItem.location || '#';
  
  const attendeesList = parsedMetadata.attendees || (parsedItem.attendees ? parsedItem.attendees.map((a: any) => a.displayName || a.email.split('@')[0]).join(', ') : 'None');
  const doc = parsedMetadata.doc || '';

  const now = new Date();
  let status = 'Confirmed';
  if (endStr && new Date(endStr) < now) {
    status = 'Completed';
  } else if (parsedItem.status === 'confirmed') {
    status = 'Upcoming';
  } else {
    status = parsedItem.status || 'Upcoming';
  }

  return {
    id,
    type,
    title,
    time,
    duration,
    status,
    agenda,
    platform,
    meetingLink,
    attendees: attendeesList,
    doc,
    priority: parsedMetadata.priority || 'Medium',
    assignee: parsedMetadata.assignee || 'Unassigned',
    alertType: parsedMetadata.alertType || 'Notification Badge',
    category: parsedMetadata.category || 'Coding',
    topic: parsedMetadata.topic || agenda,
    startDateObj: startStr ? new Date(startStr) : new Date(),
    endDateObj: endStr ? new Date(endStr) : new Date()
  };
}

export const DashboardView = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ count: number; max: number; isPro: boolean } | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [stats, setStats] = useState({
    unread: 12,
    urgentEmails: 2,
    drafts: 4,
    nextEventTime: 'None',
    meetingsTotal: 0,
    meetingsLeft: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/account/connect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.approvalUrl) {
          window.open(data.approvalUrl, '_blank');
        }
        if (user) {
          await user.reload();
        }
        setApprovalRequired(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert("Failed to connect Google Account: " + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error connecting Google Account: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Modal (Popup) state
  const [selectedItem, setSelectedItem] = useState<{ type: 'email' | 'meeting', data: any } | null>(null);

  // AI Briefing State
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [aiBriefingLoading, setAiBriefingLoading] = useState(false);
  const [aiBriefingDisplayed, setAiBriefingDisplayed] = useState<string>('');
  const [aiBriefingError, setAiBriefingError] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('Gemini');
  const briefingAnimRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAiBriefing = useCallback(async (emailsData: any[], scheduleData: any[]) => {
    setAiBriefingLoading(true);
    setAiBriefing('');
    setAiBriefingDisplayed('');
    setAiBriefingError(false);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily-briefing',
          emails: emailsData.slice(0, 8).map(e => ({ from: e.from, subject: e.subject, priority: e.priority })),
          events: scheduleData.slice(0, 8).map(e => ({ title: e.title, time: e.time, duration: e.duration, status: e.status })),
        }),
      });
      const json = await res.json();
      if (json.success && json.briefing) {
        setAiBriefing(json.briefing);
        if (json.provider) {
          setAiProvider(json.provider);
        }
        setAiUsage({
          count: json.aiUsageCount || 0,
          max: json.maxFreeRequests || 5,
          isPro: json.isPro || false
        });
      } else if (json.error === 'LIMIT_REACHED') {
        setShowUpgradeModal(true);
        setAiBriefingError(true);
        setAiUsage({
          count: json.aiUsageCount || 5,
          max: json.maxFreeRequests || 5,
          isPro: json.isPro || false
        });
      } else {
        setAiBriefingError(true);
      }
    } catch (err) {
      console.error('AI briefing error:', err);
      setAiBriefingError(true);
    }
    setAiBriefingLoading(false);
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (!aiBriefing) return;
    let idx = 0;
    setAiBriefingDisplayed('');
    if (briefingAnimRef.current) clearInterval(briefingAnimRef.current);
    briefingAnimRef.current = setInterval(() => {
      idx++;
      setAiBriefingDisplayed(aiBriefing.slice(0, idx));
      if (idx >= aiBriefing.length) {
        if (briefingAnimRef.current) clearInterval(briefingAnimRef.current);
      }
    }, 12);
    return () => { if (briefingAnimRef.current) clearInterval(briefingAnimRef.current); };
  }, [aiBriefing]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setEmails([]);
      setSchedule([]);
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      // Get current date
      const baseDate = new Date();
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth() + 1;
      
      let fetchedSchedule: any[] = [];
      let calendarAuthUrl = null;
      try {
        const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          const parsedEvents = json.items.map(parseGoogleEvent);
          // Filter for current date
          fetchedSchedule = parsedEvents.filter((e: any) => {
            const eYear = e.startDateObj.getFullYear();
            const eMonth = e.startDateObj.getMonth();
            const eDate = e.startDateObj.getDate();
            return eYear === baseDate.getFullYear() && 
                   eMonth === baseDate.getMonth() && 
                   eDate === baseDate.getDate();
          });
          fetchedSchedule.sort((a, b) => a.startDateObj.getTime() - b.startDateObj.getTime());
        } else if (json.error === 'Approval Required') {
          calendarAuthUrl = true;
        }
      } catch (e) {
        console.error("Failed to fetch calendar events for dashboard:", e);
      }

      // Load or Fetch Gmail emails
      let fetchedEmails = [];
      let gmailAuthUrl = null;
      try {
        const cached = localStorage.getItem(`glideflow_inbox_cache_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            fetchedEmails = parsed.slice(0, 4);
          }
        }
      } catch (e) {}

      try {
        const res = await fetch('/api/test-gmail');
        const json = await res.json();
        if (json.success && Array.isArray(json.messages)) {
          fetchedEmails = json.messages.slice(0, 4);
          localStorage.setItem(`glideflow_inbox_cache_${user.id}`, JSON.stringify(json.messages));
        } else if (!json.success && json.error === 'Approval Required') {
          gmailAuthUrl = true;
        }
      } catch (e) {
        console.error("Failed to fetch Gmail for auth check:", e);
      }

      if (gmailAuthUrl || calendarAuthUrl) {
        setApprovalRequired(true);
      } else {
        setApprovalRequired(false);
      }

      // Fallback emails if no cache is available
      if (fetchedEmails.length === 0) {
        fetchedEmails = [
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
        ];
      }

      // Calculate stats based on fetched calendar events
      const totalMeetingsToday = fetchedSchedule.length;
      
      const nowTime = new Date().getTime();
      const meetingsLeft = fetchedSchedule.filter((e: any) => e.endDateObj.getTime() > nowTime).length;
      
      const nextUpcoming = fetchedSchedule.find((e: any) => e.startDateObj.getTime() > nowTime);
      const nextEventTime = nextUpcoming ? nextUpcoming.time.split(' - ')[0] : (totalMeetingsToday > 0 ? 'Done' : 'None');

      setStats({ 
        unread: 12, 
        urgentEmails: 2, 
        drafts: 4, 
        nextEventTime, 
        meetingsTotal: totalMeetingsToday, 
        meetingsLeft 
      });
      
      setEmails(fetchedEmails);
      setSchedule(fetchedSchedule);
      setIsLoading(false);

      // Trigger AI briefing after data is loaded if auth is cleared
      if (!gmailAuthUrl && !calendarAuthUrl) {
        fetchAiBriefing(fetchedEmails, fetchedSchedule);
      }
    };

    fetchDashboardData();
  }, [user?.id, isLoaded, fetchAiBriefing, refreshTrigger]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#a1a1aa' }}>
        <Loader2 size={40} color="#22c55e" style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
        <p>Syncing your workspace...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const getAvatarStyle = (initials: string) => {
    switch (initials) {
      case 'HC': return { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#000000' };
      case 'PG': return { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff' };
      case 'KS': return { background: 'linear-gradient(135deg, #a855f7, #7e22ce)', color: '#ffffff' };
      case 'GH': return { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000000' };
      default: return { background: 'rgba(255,255,255,0.08)', color: '#ededed' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      
      {/* 1. THE 4 STATS BOXES (Fully Restored) */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        
        {/* Box 1: Unread Emails */}
        <div className={styles.card}>
          <div style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <Mail size={14}/>
            </div>
            Unread Emails
          </div>
          <div className={styles.statValue} style={{ color: '#ededed' }}>{stats.unread}</div>
          <p className={styles.statSubtitle} style={{ color: '#ef4444' }}>{stats.urgentEmails} urgent</p>
        </div>

        {/* Box 2: Drafts Pending */}
        <div className={styles.card}>
          <div style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <FileEdit size={14}/>
            </div>
            Drafts Pending
          </div>
          <div className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.drafts}</div>
          <p className={styles.statSubtitle} style={{ color: '#a1a1aa' }}>Awaiting completion</p>
        </div>

        {/* Box 3: Next Event */}
        <div className={styles.card}>
          <div style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
              <Clock size={14}/>
            </div>
            Next Event
          </div>
          <div className={styles.statValue} style={{ color: '#22c55e', fontSize: '1.6rem' }}>{stats.nextEventTime}</div>
          <p className={styles.statSubtitle} style={{ color: '#a1a1aa' }}>Starts in 48 mins</p>
        </div>


        {/* Box 4: Meetings Today */}
        <div className={styles.card}>
          <div style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Video size={14}/>
            </div>
            Meetings Today
          </div>
          <div className={styles.statValue} style={{ color: '#3b82f6' }}>{stats.meetingsTotal}</div>
          <p className={styles.statSubtitle} style={{ color: '#a1a1aa' }}>{stats.meetingsLeft} remaining</p>
        </div>

      </div>

      {/* 2. AI OVERVIEW — Powered by Gemini/OpenRouter */}
      <div className={styles.card} style={{ 
        borderLeft: '4px solid #8b5cf6', 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(99, 102, 241, 0.04) 50%, rgba(15, 15, 15, 0.6) 100%)', 
        padding: '1.2rem 1.5rem', 
        borderColor: 'rgba(139, 92, 246, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a78bfa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#a78bfa' }}>
              <Sparkles size={14} style={{ animation: 'pulse-glow 2s infinite alternate' }} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>AI Daily Briefing</h3>
            {!approvalRequired && (
              <>
                <span style={{ fontSize: '0.65rem', background: 'rgba(139, 92, 246, 0.12)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{aiProvider}</span>
                {aiUsage && !aiUsage.isPro && (
                  <span style={{ fontSize: '0.72rem', color: '#a1a1aa', marginLeft: '12px' }}>
                    Usage: <b>{aiUsage.count}</b> / {aiUsage.max} free actions
                  </span>
                )}
              </>
            )}
          </div>
          {!approvalRequired && (
            <button
              onClick={() => fetchAiBriefing(emails, schedule)}
              disabled={aiBriefingLoading}
              style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', color: '#a78bfa', cursor: aiBriefingLoading ? 'wait' : 'pointer', padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)')}
            >
              <RefreshCw size={12} style={aiBriefingLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              {aiBriefingLoading ? 'Generating...' : 'Refresh'}
            </button>
          )}
        </div>
        {approvalRequired ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
            <p style={{ color: '#f59e0b', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              <b>Google Account Sync Required:</b> Link your Google Account to enable the AI Morning Briefing and sync your workspace emails and calendar items.
            </p>
            <div>
              <button 
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                style={{ 
                  background: '#f59e0b', 
                  color: '#000', 
                  border: 'none',
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  fontWeight: 700, 
                  cursor: isConnecting ? 'wait' : 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                {isConnecting ? 'Connecting...' : 'Connect Google Account'} <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ) : aiBriefingLoading && !aiBriefingDisplayed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '14px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.08)', animation: 'shimmer 1.5s ease-in-out infinite', width: '100%' }} />
            <div style={{ height: '14px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.08)', animation: 'shimmer 1.5s ease-in-out infinite 0.2s', width: '85%' }} />
            <div style={{ height: '14px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.08)', animation: 'shimmer 1.5s ease-in-out infinite 0.4s', width: '60%' }} />
          </div>
        ) : aiBriefingError ? (
          <p style={{ color: '#e4e4e7', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            Good afternoon! You have <b>{stats?.unread} unread emails</b>, but only {stats?.urgentEmails} need immediate attention. 
            Your next meeting starts at <b>{stats?.nextEventTime}</b>. Consider finishing your pending drafts before the call.
            <span style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', color: '#717171', fontStyle: 'italic' }}>💡 Add a Gemini or OpenRouter API key in .env.local to enable AI-powered briefings</span>
          </p>
        ) : (
          <p style={{ color: '#e4e4e7', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            {aiBriefingDisplayed}
            {aiBriefingDisplayed.length < aiBriefing.length && <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#a78bfa', marginLeft: '2px', verticalAlign: 'middle', animation: 'blink 0.8s step-end infinite' }} />}
          </p>
        )}
        <style>{`
          @keyframes pulse-glow {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6)); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          @keyframes blink {
            50% { opacity: 0; }
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* 3. DETAILED GRID: Schedule & Inbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* SCHEDULE BOX */}
        <div className={styles.card}>
           <div className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 600 }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
               <Calendar size={16}/>
             </div>
             Today's Agenda
           </div>
           <div className={styles.scrollContainer} style={{ paddingRight: '8px' }}>
              {schedule.map(s => (
                <div 
                  key={s.id} 
                  className={styles.listItem} 
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
                  onClick={() => setSelectedItem({ type: 'meeting', data: s })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                    <div>
                       <h4 style={{fontSize: '0.95rem', fontWeight: 600, color: '#ededed'}}>{s.title}</h4>
                       <p style={{fontSize: '0.8rem', color: s.status === 'Completed' ? '#717171' : s.isUrgent ? '#22c55e' : '#a1a1aa', marginTop: '2px'}}>{s.status}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{fontSize: '0.85rem', color: '#ededed', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end'}}><Clock size={14} color="#717171"/> {s.time}</div>
                       <div style={{fontSize: '0.8rem', color: '#717171', marginTop: '2px'}}>{s.duration}</div>
                    </div>
                  </div>

                  {/* Added Context: Attendees & Platform & Documents */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '60%' }}>
                      <span style={{ fontSize: '0.8rem', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.attendees}
                      </span>
                      {s.doc && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#3b82f6' }}>
                          <Link2 size={12} /> {s.doc}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        background: s.platform.includes('Zoom') ? 'rgba(59,130,246,0.12)' : s.platform.includes('Meet') ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                        color: s.platform.includes('Zoom') ? '#93c5fd' : s.platform.includes('Meet') ? '#22c55e' : '#a1a1aa',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {s.platform}
                      </span>
                      {s.status !== 'Completed' && s.meetingLink !== '#' && (
                        <a 
                          href={s.meetingLink} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '0.8rem',
                            background: '#22c55e',
                            color: '#000',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            lineHeight: 1
                          }}
                        >
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* INBOX BOX */}
        <div className={styles.card}>
           <div className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 600 }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
               <Mail size={16}/>
             </div>
             Inbox Priorities
           </div>
           <div className={styles.scrollContainer} style={{ paddingRight: '8px' }}>
             {emails.map(e => (
               <div 
                 key={e.id} 
                 className={styles.listItem} 
                 style={{ alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
                 onClick={() => setSelectedItem({ type: 'email', data: e })}
               >
                 <div style={{ 
                   width: '36px', 
                   height: '36px', 
                   borderRadius: '50%', 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   fontSize: '0.85rem', 
                   fontWeight: 600, 
                   flexShrink: 0, 
                   border: '1px solid rgba(255,255,255,0.05)',
                   ...getAvatarStyle(e.initials)
                 }}>
                   {e.initials}
                 </div>
                 <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ededed', margin: 0 }}>{e.from}</h4>
                          <span className={
                            e.priority.toLowerCase() === 'urgent' 
                              ? `${styles.labelBadge} ${styles.labelUrgent}` 
                              : e.priority.toLowerCase() === 'action' 
                              ? `${styles.labelBadge} ${styles.labelWork}` 
                              : `${styles.labelBadge} ${styles.labelPersonal}`
                          }>
                            {e.priority}
                          </span>
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
             ))}
           </div>
        </div>
      </div>

      {/* --- POPUP MODAL --- */}
      {selectedItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }} onClick={() => setSelectedItem(null)}>
          
          <div style={{
            background: '#18181b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', width: '90%', maxWidth: '600px', padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setSelectedItem(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {selectedItem.type === 'email' && (
              <div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>{selectedItem.data.subject}</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>From: <b>{selectedItem.data.from}</b> &lt;{selectedItem.data.senderEmail}&gt;</span>
                  <span>{selectedItem.data.time}</span>
                </div>
                <div style={{ color: '#ededed', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedItem.data.fullBody}
                </div>
                {selectedItem.data.hasAttachment && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ededed', fontSize: '0.85rem' }}>
                      <Paperclip size={16} color="#3b82f6" />
                      <span>{selectedItem.data.attachmentName}</span>
                    </div>
                    <button style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                      Download
                    </button>
                  </div>
                )}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><CornerUpLeft size={16}/> Reply</button>
                </div>
              </div>
            )}

            {selectedItem.type === 'meeting' && (
              <div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>{selectedItem.data.title}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {selectedItem.data.time} ({selectedItem.data.duration})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Video size={14}/> {selectedItem.data.platform}</span>
                  {selectedItem.data.doc && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}><Link2 size={14}/> {selectedItem.data.doc}</span>
                  )}
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#ededed', fontSize: '0.9rem', marginBottom: '4px' }}>Attendees:</h4>
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{selectedItem.data.attendees}</p>
                </div>

                <h4 style={{ color: '#ededed', fontSize: '0.95rem', marginBottom: '8px' }}>Agenda:</h4>
                <div style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {selectedItem.data.agenda}
                </div>
                
                {selectedItem.data.status !== 'Completed' && selectedItem.data.meetingLink !== '#' ? (
                  <a 
                    href={selectedItem.data.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '10px 20px', width: '100%', background: '#22c55e', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={16}/> Join {selectedItem.data.platform} Meeting
                  </a>
                ) : (
                  <button 
                    disabled 
                    style={{ padding: '10px 20px', width: '100%', background: 'rgba(255,255,255,0.05)', color: '#717171', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    Meeting Closed ({selectedItem.data.status})
                  </button>
                )}
              </div>
            )}
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
};