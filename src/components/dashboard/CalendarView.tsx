'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Clock, Video, Users, Link2, ExternalLink, Plus, CheckCircle2, Bell, Zap, ChevronLeft, ChevronRight, CheckSquare, List, Loader2, Trash2, X, Sparkles, ShieldCheck, FileEdit
} from 'lucide-react';
import styles from '@/app/dashboard/dashboard.module.css';

// Base date centering: June 16, 2026 to align with mock, or rolling
const BASE_DATE = new Date(2026, 5, 16);

// Helper to generate the rolling 7 months
const getMonthsRange = (baseDate: Date) => {
  const months = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    months.push(monthName);
  }
  return months;
};

const MONTHS = getMonthsRange(BASE_DATE);

// Helper to generate week days for a month containing a specific date or mid-month (15th)
function getWeekDaysForMonth(monthStr: string, baseDate: Date) {
  const [monthName, yearStr] = monthStr.split(' ');
  const year = parseInt(yearStr);
  const month = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
  
  // If target is current month and year of baseDate, align with baseDate's week, else use week containing the 15th
  let targetDate: Date;
  if (year === baseDate.getFullYear() && month === baseDate.getMonth()) {
    targetDate = new Date(baseDate);
  } else {
    targetDate = new Date(year, month, 15);
  }
  
  const dayOfWeek = targetDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + mondayOffset);
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const name = day.toLocaleString('en-US', { weekday: 'long' });
    const dateLabel = day.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const dateNum = day.getDate();
    weekDays.push({ name, date: dateLabel, dateNum });
  }
  return weekDays;
}

// Helper to generate grid cells for the Monthly Grid view
function getMonthGridCells(monthStr: string) {
  const [monthName, yearStr] = monthStr.split(' ');
  const year = parseInt(yearStr);
  const month = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayIndex = firstDayOfMonth.getDay(); // 0 is Sun, 1 is Mon...
  const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // slots to skip
  
  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ dateNum: 0, dayName: '', isEmpty: true });
  }
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    const dayName = day.toLocaleString('en-US', { weekday: 'long' });
    cells.push({ dateNum: d, dayName, isEmpty: false });
  }
  return cells;
}

// Parse google calendar events to internal UI structure
function parseGoogleEvent(item: any) {
  const id = item.id;
  const title = item.summary || 'Untitled Event';
  const rawDescription = item.description || '';
  
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

  const startStr = item.start?.dateTime || item.start?.date || '';
  const endStr = item.end?.dateTime || item.end?.date || '';
  
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
      
      if (item.start?.dateTime) {
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

  const type = parsedMetadata.type || (item.location || item.hangoutLink || item.attendees ? 'Meeting' : 'Reminder');
  const platform = parsedMetadata.platform || (item.hangoutLink ? 'Google Meet' : item.location ? 'Location' : 'None');
  const meetingLink = parsedMetadata.meetingLink || item.hangoutLink || item.location || '#';
  
  const attendeesList = parsedMetadata.attendees || (item.attendees ? item.attendees.map((a: any) => a.displayName || a.email.split('@')[0]).join(', ') : 'None');
  const doc = parsedMetadata.doc || '';

  return {
    id,
    type,
    title,
    time,
    duration,
    status: item.status === 'confirmed' ? 'Confirmed' : item.status || 'Upcoming',
    agenda,
    platform,
    meetingLink,
    attendees: attendeesList,
    doc,
    // Task-specific
    priority: parsedMetadata.priority || 'Medium',
    assignee: parsedMetadata.assignee || 'Unassigned',
    // Reminder-specific
    alertType: parsedMetadata.alertType || 'Notification Badge',
    // Focus Block specific
    category: parsedMetadata.category || 'Coding',
    topic: parsedMetadata.topic || agenda,
    startDateObj: startStr ? new Date(startStr) : new Date(),
    endDateObj: endStr ? new Date(endStr) : new Date()
  };
}

function parseTimeString(timeStr: string) {
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM|am|pm)?$/);
  if (!match) return { hours: 9, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm) {
    const isPm = ampm.toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  }
  return { hours, minutes };
}

// Generate the initial mock events as seeded list
const getInitialMockEventsList = () => {
  const list: any[] = [];
  const mockData = {
    'May 2026': {
      'Monday': [
        { 
          id: 101, type: 'Meeting', title: 'Client Pitch Deck Draft Review', time: '2:00 PM - 2:30 PM', duration: '30m', 
          platform: 'Google Meet', doc: 'Pitch Deck PDF', attendees: 'Aarav, Clients', status: 'Completed',
          agenda: "Early preview of GlideFlow proposal deck slides.", meetingLink: "https://meet.google.com/abc-xyz-def",
          dayNum: 11
        }
      ],
      'Wednesday': [
        { 
          id: 102, type: 'Task', title: 'Merge PR #88 cookies configuration', time: '11:00 AM', duration: '15m',
          priority: 'High', assignee: 'Piyush Garg', status: 'Completed', agenda: "Resolved clerk routing endpoints configs.",
          dayNum: 13
        }
      ]
    },
    'June 2026': {
      'Monday': [
        { 
          id: 201, type: 'Meeting', title: 'Code Review Session', time: '11:00 AM - 11:30 AM', duration: '30m', 
          platform: 'Slack Call', doc: 'Auth PR', attendees: 'Aarav, Piyush', status: 'Completed',
          agenda: "Review Aarav's Clerk authentication implementation PR and compile changes.", meetingLink: "#",
          dayNum: 15
        },
        { 
          id: 202, type: 'Meeting', title: 'Engineering Sync', time: '2:00 PM - 3:00 PM', duration: '1h', 
          platform: 'Zoom', doc: 'Sprint Docs', attendees: 'Hitesh, Piyush, Kiran, +2', status: 'Upcoming',
          agenda: "1. Discuss Vercel build times.\n2. Review pending PRs.\n3. Finalize Dashboard UI.", meetingLink: "https://zoom.us/j/123456789",
          dayNum: 15
        }
      ],
      'Tuesday': [
        { 
          id: 203, type: 'Meeting', title: 'Product Brainstorming', time: '10:00 AM - 11:00 AM', duration: '1h', 
          platform: 'Google Meet', doc: 'Roadmap docs', attendees: 'Hitesh, Aarav, Design team', status: 'Upcoming',
          agenda: "Discussing next milestones, feature releases for Q3, and feedback loops.", meetingLink: "https://meet.google.com/abc-xyz-def",
          dayNum: 16
        }
      ],
      'Wednesday': [
        { 
          id: 204, type: 'Meeting', title: 'Client Standup', time: '4:30 PM - 5:00 PM', duration: '30m', 
          platform: 'Google Meet', doc: 'Pitch Deck', attendees: 'Design team, Client', status: 'Upcoming',
          agenda: "Weekly sync with the UI/UX client to discuss the new dashboard mockups and color themes.", meetingLink: "https://meet.google.com/abc-xyz-def",
          dayNum: 17
        },
        { 
          id: 205, type: 'Meeting', title: '1-on-1 with Designer', time: '5:30 PM - 6:00 PM', duration: '30m', 
          platform: 'Google Meet', doc: 'Figma Link', attendees: 'Aarav, Designer', status: 'Upcoming',
          agenda: "Discuss layout changes on settings/preferences panel.", meetingLink: "https://meet.google.com/xyz",
          dayNum: 17
        }
      ],
      'Thursday': [
        { 
          id: 206, type: 'Focus Time', title: 'Deep Work: Replicate Lag Fixes', time: '1:00 PM - 3:00 PM', duration: '2h',
          category: 'Coding', topic: 'Scalability optimization on Supabase aws-tokyo instance node lag.', status: 'Upcoming',
          dayNum: 18
        }
      ],
      'Friday': [
        { 
          id: 207, type: 'Reminder', title: 'Renew Vercel subscription plan', time: '9:00 AM', duration: '5m',
          alertType: 'Alert Window', notificationTone: 'Default System', status: 'Upcoming',
          dayNum: 19
        }
      ]
    },
    'July 2026': {
      'Monday': [
        {
          id: 301, type: 'Focus Time', title: 'Design Handoff Assets compilation', time: '10:00 AM - 12:00 PM', duration: '2h',
          category: 'Design Review', topic: 'Compiling Figma frames to code components.', status: 'Upcoming',
          dayNum: 13
        }
      ]
    }
  };

  Object.entries(mockData).forEach(([monthStr, days]) => {
    const [monthName, yearStr] = monthStr.split(' ');
    const year = parseInt(yearStr, 10);
    const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
    
    Object.entries(days).forEach(([dayName, eventsArray]) => {
      eventsArray.forEach((ev: any) => {
        const startDetails = parseTimeString(ev.time.split(' - ')[0] || ev.time);
        const endDetails = ev.time.includes(' - ') ? parseTimeString(ev.time.split(' - ')[1]) : { hours: startDetails.hours + 1, minutes: startDetails.minutes };
        
        const startDateObj = new Date(year, monthIndex, ev.dayNum, startDetails.hours, startDetails.minutes);
        const endDateObj = new Date(year, monthIndex, ev.dayNum, endDetails.hours, endDetails.minutes);
        
        list.push({
          ...ev,
          startDateObj,
          endDateObj
        });
      });
    });
  });

  return list;
};

export default function CalendarView() {
  const router = useRouter();
  const [viewType, setViewType] = useState<'Week' | 'Month' | 'List'>('Week');
  
  // AI scheduling states
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ count: number; max: number; isPro: boolean } | null>(null);
  
  const [monthIndex, setMonthIndex] = useState(3); // Center index is June 2026
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  // Flat events state seeded from LocalStorage or mock data
  const [events, setEvents] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('glideflow_calendar_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((e: any) => ({
              ...e,
              startDateObj: new Date(e.startDateObj),
              endDateObj: e.endDateObj ? new Date(e.endDateObj) : new Date(e.startDateObj)
            }));
          }
        }
      } catch (e) {
        console.error("Failed to load calendar cache:", e);
      }
    }
    return getInitialMockEventsList();
  });

  // Sync statuses
  const [syncStatus, setSyncStatus] = useState<string>('Initializing...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedMonths, setSyncedMonths] = useState<Set<string>>(new Set());
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Form scheduling state
  const [eventType, setEventType] = useState('Meeting');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [agenda, setAgenda] = useState('');

  // Meeting states
  const [platform, setPlatform] = useState('Zoom');
  const [meetingLink, setMeetingLink] = useState('https://zoom.us/j/123456');
  const [attendees, setAttendees] = useState('');
  const [doc, setDoc] = useState('');

  // Task states
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');

  // Reminder states
  const [alertType, setAlertType] = useState('Notification Badge');

  // Focus block states
  const [focusCategory, setFocusCategory] = useState('Coding');
  const [focusTopic, setFocusTopic] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const handleAiSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'parse-event', text: aiInput }),
      });
      const json = await res.json();
      if (json.success && json.event) {
        const ev = json.event;
        if (ev.title) setTitle(ev.title);
        if (ev.eventType) setEventType(ev.eventType);
        if (ev.startTime) setStartTime(ev.startTime);
        if (ev.endTime) setEndTime(ev.endTime);
        if (ev.agenda) setAgenda(ev.agenda);
        if (ev.platform) setPlatform(ev.platform);
        if (ev.meetingLink) setMeetingLink(ev.meetingLink);
        if (ev.attendees) setAttendees(ev.attendees);
        if (ev.doc) setDoc(ev.doc);
        if (ev.priority) setTaskPriority(ev.priority);
        if (ev.assignee) setTaskAssignee(ev.assignee);
        if (ev.alertType) setAlertType(ev.alertType);
        if (ev.focusCategory) setFocusCategory(ev.focusCategory);
        if (ev.focusTopic) setFocusTopic(ev.focusTopic);
        
        setAiInput('');
        setNotification('✨ AI parsed event successfully! Review details below.');
        setTimeout(() => setNotification(null), 4000);
        
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
        alert('Failed to parse input: ' + (json.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing AI schedule input');
    }
    setAiLoading(false);
  };

  // Custom Google Calendar delete approval/polling modal state
  const [deletingEventState, setDeletingEventState] = useState<{
    eventId: string;
    title: string;
    status: 'confirming' | 'requesting_approval' | 'polling' | 'deleting';
    approvalUrl?: string;
  } | null>(null);

  const activeMonth = MONTHS[monthIndex];
  const daysInActiveMonth = getWeekDaysForMonth(activeMonth, BASE_DATE);
  const monthCells = getMonthGridCells(activeMonth);

  // Sync offsets sequence: 0 (June 2026), -1 (May), 1 (July), -2 (April), 2 (August), -3 (March), 3 (September)
  const syncOffsets = [0, -1, 1, -2, 2, -3, 3];

  // Write changes to localStorage cache
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('glideflow_calendar_cache', JSON.stringify(events));
    }
  }, [events]);

  const loadMonthData = async (offset: number) => {
    const d = new Date(BASE_DATE.getFullYear(), BASE_DATE.getMonth() + offset, 1);
    const year = d.getFullYear();
    const monthVal = d.getMonth() + 1; // 1-indexed
    const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    setSyncStatus(`Syncing ${monthName}...`);

    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${monthVal}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        const parsedEvents = json.items.map(parseGoogleEvent);
        setEvents(prev => {
          const otherEvents = prev.filter((e: any) => !parsedEvents.some((pe: any) => pe.id === e.id));
          return [...otherEvents, ...parsedEvents];
        });
        setSyncedMonths(prev => {
          const next = new Set(prev);
          next.add(monthName);
          return next;
        });
        setAuthUrl(null);
      } else {
        if (json.error === 'Approval Required' && json.approvalUrl) {
          setAuthUrl(json.approvalUrl);
        }
      }
    } catch (e: any) {
      console.error(`Error loading events for ${monthName}:`, e);
    }
  };

  const reloadMonth = async (monthStr: string) => {
    const [monthName, yearStr] = monthStr.split(' ');
    const year = parseInt(yearStr, 10);
    const monthVal = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth() + 1;

    setSyncStatus(`Refreshing ${monthStr}...`);
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${monthVal}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        const parsedEvents = json.items.map(parseGoogleEvent);
        setEvents(prev => {
          const otherMonths = prev.filter((e: any) => {
            const eYear = e.startDateObj.getFullYear();
            const eMonth = e.startDateObj.getMonth() + 1;
            return !(eYear === year && eMonth === monthVal);
          });
          return [...otherMonths, ...parsedEvents];
        });
        setAuthUrl(null);
      } else {
        if (json.error === 'Approval Required' && json.approvalUrl) {
          setAuthUrl(json.approvalUrl);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setSyncStatus('Synced');
  };

  // Initial Sync Sequence
  useEffect(() => {
    const syncSequence = async () => {
      setIsSyncing(true);
      for (const offset of syncOffsets) {
        await loadMonthData(offset);
      }
      setSyncStatus('Synced');
      setIsSyncing(false);
    };
    syncSequence();
  }, []);

  // Polling (every 30s) and Window Focus Revalidation
  useEffect(() => {
    const handleFocus = () => {
      reloadMonth(activeMonth);
    };

    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      reloadMonth(activeMonth);
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [activeMonth]);

  // Polling hook to automatically check Google Calendar delete approval status
  useEffect(() => {
    if (!deletingEventState || deletingEventState.status !== 'polling' || !deletingEventState.eventId) return;

    let intervalId: any;
    const eventId = deletingEventState.eventId;

    const pollDelete = async () => {
      try {
        const res = await fetch(`/api/calendar?id=${eventId}`, {
          method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
          // Success! Remove event from local state
          setEvents((prev: any[]) => prev.filter((e: any) => e.id !== eventId));
          setNotification('Event deleted successfully!');
          setTimeout(() => setNotification(null), 3000);
          setDeletingEventState(null); // Close modal
        } else if (json.error === 'Approval Required') {
          // Keep polling, do not update URL in state to prevent resetting user browser focus
        } else {
          // Other error, alert and close modal
          alert("Failed to delete event: " + json.error);
          setDeletingEventState(null);
        }
      } catch (err: any) {
        console.error("Error polling delete:", err);
      }
    };

    // Poll every 2 seconds
    intervalId = setInterval(pollDelete, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [deletingEventState?.status, deletingEventState?.eventId]);

  const handlePrevMonth = () => {
    setMonthIndex(prev => Math.max(0, prev - 1));
    setSelectedDay('Monday');
  };

  const handleNextMonth = () => {
    setMonthIndex(prev => Math.min(MONTHS.length - 1, prev + 1));
    setSelectedDay('Monday');
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const activeDayObj = daysInActiveMonth.find((d: any) => d.name === selectedDay);
    if (!activeDayObj) return;

    const [monthName, yearStr] = activeMonth.split(' ');
    const year = parseInt(yearStr, 10);
    const monthVal = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
    const dateNum = activeDayObj.dateNum;

    const startDetails = parseTimeString(startTime);
    const endDetails = parseTimeString(endTime);

    const startDateTime = new Date(year, monthVal, dateNum, startDetails.hours, startDetails.minutes);
    const endDateTime = new Date(year, monthVal, dateNum, endDetails.hours, endDetails.minutes);

    const metadata = {
      type: eventType,
      platform: eventType === 'Meeting' ? platform : undefined,
      attendees: eventType === 'Meeting' ? attendees : undefined,
      doc: eventType === 'Meeting' ? doc : undefined,
      priority: eventType === 'Task' ? taskPriority : undefined,
      assignee: eventType === 'Task' ? taskAssignee : undefined,
      alertType: eventType === 'Reminder' ? alertType : undefined,
      category: eventType === 'Focus Time' ? focusCategory : undefined,
      topic: eventType === 'Focus Time' ? focusTopic : undefined,
      meetingLink: eventType === 'Meeting' ? meetingLink : undefined
    };

    const description = `${agenda.trim() || 'No description provided.'}\n\n---\nMetadata: ${JSON.stringify(metadata)}`;

    const googleEvent = {
      summary: title,
      description,
      location: eventType === 'Meeting' ? platform : undefined,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Create local optimistic event
    const optimisticEvent = {
      id: `temp-${Date.now()}`,
      type: eventType,
      title,
      time: `${startTime} - ${endTime}`,
      duration: '1h',
      status: 'Upcoming',
      agenda: agenda.trim() || 'No description provided.',
      platform: eventType === 'Meeting' ? platform : 'None',
      meetingLink: eventType === 'Meeting' ? meetingLink : '#',
      attendees: eventType === 'Meeting' ? attendees : 'None',
      doc: eventType === 'Meeting' ? doc : '',
      priority: eventType === 'Task' ? taskPriority : 'Medium',
      assignee: eventType === 'Task' ? taskAssignee : 'Unassigned',
      alertType: eventType === 'Reminder' ? alertType : 'Notification Badge',
      category: eventType === 'Focus Time' ? focusCategory : 'Coding',
      topic: eventType === 'Focus Time' ? focusTopic : '',
      startDateObj: startDateTime,
      endDateObj: endDateTime
    };

    // Optimistically render instantly
    setEvents(prev => [...prev, optimisticEvent]);
    setNotification(`Successfully scheduled ${eventType}!`);
    setTimeout(() => setNotification(null), 3000);
    
    // Clear inputs immediately
    setTitle('');
    setAgenda('');
    setTaskAssignee('');
    setFocusTopic('');
    setAttendees('');
    setDoc('');
    setMeetingLink('https://zoom.us/j/123456');

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: googleEvent })
      });
      const json = await res.json();
      if (json.success) {
        const realEvent = parseGoogleEvent(json.event);
        // Replace temp optimistic event with the confirmed server event
        setEvents(prev => prev.map((evItem: any) => evItem.id === optimisticEvent.id ? realEvent : evItem));
      } else {
        // Rollback
        setEvents(prev => prev.filter((evItem: any) => evItem.id !== optimisticEvent.id));
        alert("Failed to schedule event on server: " + json.error);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setEvents(prev => prev.filter((evItem: any) => evItem.id !== optimisticEvent.id));
      alert("Error scheduling event on server");
    }
  };

  const handleDeleteEvent = async (eventId: string | number, eventMonthStr: string) => {
    // If it is a mock event (numeric id) or a temporary unsaved event
    const isMock = typeof eventId === 'number' || (typeof eventId === 'string' && !isNaN(Number(eventId)));
    const isTemp = typeof eventId === 'string' && eventId.startsWith('temp-');

    if (isMock || isTemp) {
      setEvents((prev: any[]) => prev.filter((e: any) => e.id !== eventId));
      setNotification('Event deleted successfully!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // For real Google Calendar events, launch our custom deletion overlay
    const eventObj = events.find((e: any) => e.id === eventId);
    setDeletingEventState({
      eventId: String(eventId),
      title: eventObj ? eventObj.title : 'Google Calendar Event',
      status: 'confirming'
    });
  };


  // Helper icons
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Meeting': return <Video size={14} color="#93c5fd" />;
      case 'Task': return <CheckSquare size={14} color="#fde047" />;
      case 'Reminder': return <Bell size={14} color="#fca5a5" />;
      case 'Focus Time': return <Zap size={14} color="#d8b4fe" />;
      default: return <Calendar size={14} color="#a1a1aa" />;
    }
  };

  const getEventTypeClass = (type: string) => {
    switch (type) {
      case 'Meeting': return `${styles.typeBadge} ${styles.typeMeeting}`;
      case 'Task': return `${styles.typeBadge} ${styles.typeTask}`;
      case 'Reminder': return `${styles.typeBadge} ${styles.typeReminder}`;
      case 'Focus Time': return `${styles.typeBadge} ${styles.typeFocus}`;
      default: return styles.typeBadge;
    }
  };

  const getMiniBadgeColor = (type: string) => {
    switch (type) {
      case 'Meeting': return 'rgba(59, 130, 246, 0.15)';
      case 'Task': return 'rgba(245, 158, 11, 0.15)';
      case 'Reminder': return 'rgba(239, 68, 68, 0.15)';
      case 'Focus Time': return 'rgba(168, 85, 247, 0.15)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  };

  const getMiniBadgeTextColor = (type: string) => {
    switch (type) {
      case 'Meeting': return '#93c5fd';
      case 'Task': return '#fde047';
      case 'Reminder': return '#fca5a5';
      case 'Focus Time': return '#d8b4fe';
      default: return '#a1a1aa';
    }
  };

  // Extract month and year parts for filter matching
  const [activeMonthName, activeYearStr] = activeMonth.split(' ');
  const activeYear = parseInt(activeYearStr, 10);
  const activeMonthVal = new Date(Date.parse(`${activeMonthName} 1, ${activeYear}`)).getMonth();

  // Active day events (selected day)
  const activeDayObj = daysInActiveMonth.find(d => d.name === selectedDay);
  const activeDayEvents = activeDayObj ? events.filter((e: any) => {
    const eYear = e.startDateObj.getFullYear();
    const eMonth = e.startDateObj.getMonth();
    const eDate = e.startDateObj.getDate();
    return eYear === activeYear && eMonth === activeMonthVal && eDate === activeDayObj.dateNum;
  }) : [];

  // Flat chronological list for the entire Month View list feed
  const activeMonthAllEvents = events.filter((e: any) => {
    const eYear = e.startDateObj.getFullYear();
    const eMonth = e.startDateObj.getMonth();
    return eYear === activeYear && eMonth === activeMonthVal;
  }).map((e: any) => {
    const dayName = e.startDateObj.toLocaleString('en-US', { weekday: 'long' });
    const dateNum = e.startDateObj.getDate();
    return { ...e, day: `${dayName} ${dateNum}` };
  }).sort((a, b) => a.startDateObj.getTime() - b.startDateObj.getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      
      {/* CALENDAR VIEW PICKER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Month Navigation pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.monthHeader} style={{ margin: 0 }}>
            <button className={styles.monthBtn} onClick={handlePrevMonth} disabled={monthIndex === 0}>
              <ChevronLeft size={16} />
            </button>
            <span className={styles.monthTitle} style={{ margin: '0 10px' }}>{activeMonth}</span>
            <button className={styles.monthBtn} onClick={handleNextMonth} disabled={monthIndex === MONTHS.length - 1}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Sync Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <Loader2 size={12} className={styles.spinner} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{syncStatus}</span>
              </div>
            ) : (
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
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                <span>{syncStatus}</span>
              </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className={styles.viewSwitchGroup}>
          <button 
            className={`${styles.viewSwitchBtn} ${viewType === 'Week' ? styles.viewSwitchBtnActive : ''}`}
            onClick={() => setViewType('Week')}
          >
            <Calendar size={14} /> Weekly View
          </button>
          <button 
            className={`${styles.viewSwitchBtn} ${viewType === 'Month' ? styles.viewSwitchBtnActive : ''}`}
            onClick={() => setViewType('Month')}
          >
            <CheckSquare size={14} /> Monthly Grid
          </button>
          <button 
            className={`${styles.viewSwitchBtn} ${viewType === 'List' ? styles.viewSwitchBtnActive : ''}`}
            onClick={() => setViewType('List')}
          >
            <List size={14} /> List Feed
          </button>
        </div>

      </div>

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
              <b>Google Account Sync Required:</b> GlideFlow needs access to your Google Calendar to fetch your events.
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
            Connect Calendar <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* RENDER ACTIVE CALENDAR LAYOUT */}
      {viewType === 'Week' && (
        <div className={styles.calendarLayout}>
          {/* Weekday Sidebar */}
          <div className={styles.calendarSidebar}>
            {daysInActiveMonth.map((day: any) => {
              const count = events.filter((e: any) => {
                const eYear = e.startDateObj.getFullYear();
                const eMonth = e.startDateObj.getMonth();
                const eDate = e.startDateObj.getDate();
                return eYear === activeYear && eMonth === activeMonthVal && eDate === day.dateNum;
              }).length;
              
              const isActive = selectedDay === day.name;
              return (
                <div 
                  key={day.name} 
                  className={`${styles.dayCard} ${isActive ? styles.dayCardActive : ''}`}
                  onClick={() => setSelectedDay(day.name)}
                >
                  <div>
                    <div className={styles.dayName}>{day.name}</div>
                    <div className={styles.daySub}>{day.date}</div>
                  </div>
                  <span className={`${styles.dayCountBadge} ${isActive ? styles.dayCountBadgeActive : ''}`}>
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Daily agenda feed (details + scheduler form) */}
          <div className={styles.calendarContent}>
            
            {/* Event List Card */}
            <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Calendar size={18} color="#22c55e" />
                Timeline for {selectedDay} {activeDayObj?.dateNum} ({activeMonthName})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '330px', overflowY: 'auto', paddingRight: '4px' }}>
                {activeDayEvents.length > 0 ? (
                  activeDayEvents.map(ev => (
                    <div key={ev.id} className={styles.listItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {getEventIcon(ev.type)}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ededed', margin: 0 }}>{ev.title}</h4>
                            <span className={getEventTypeClass(ev.type)} style={{ marginTop: '4px', display: 'inline-block' }}>{ev.type}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', color: '#ededed', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <Clock size={14} color="#717171" /> {ev.time}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#717171', marginTop: '2px' }}>{ev.duration}</div>
                        </div>
                      </div>
                      {ev.agenda && <p style={{ fontSize: '0.85rem', color: '#a1a1aa', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', width: '100%', margin: 0 }}>{ev.agenda}</p>}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '2px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                          {ev.type === 'Meeting' && `Attendees: ${ev.attendees}`}
                          {ev.type === 'Task' && `Assignee: ${ev.assignee} (Priority: ${ev.priority})`}
                          {ev.type === 'Reminder' && `Alert style: ${ev.alertType}`}
                          {ev.type === 'Focus Time' && `Topic: ${ev.topic}`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {ev.type === 'Meeting' && ev.meetingLink !== '#' && (
                            <a href={ev.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', background: '#22c55e', color: '#000', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, textDecoration: 'none' }}>
                              Join Call
                            </a>
                          )}
                          <button 
                            onClick={() => handleDeleteEvent(ev.id, activeMonth)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', color: '#717171' }}>
                    <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.9rem' }}>No events scheduled.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}

      {viewType === 'Month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Calendar Month Grid */}
          <div className={styles.monthGrid}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(h => (
              <div key={h} className={styles.gridHeaderCell}>{h}</div>
            ))}
            
            {monthCells.map((cell, idx) => {
              const isSelected = selectedDay === cell.dayName && !cell.isEmpty;
              const cellEvents = !cell.isEmpty ? events.filter((e: any) => {
                const eYear = e.startDateObj.getFullYear();
                const eMonth = e.startDateObj.getMonth();
                const eDate = e.startDateObj.getDate();
                return eYear === activeYear && eMonth === activeMonthVal && eDate === cell.dateNum;
              }) : [];

              return (
                <div 
                  key={idx}
                  className={`${styles.gridCell} ${isSelected ? styles.gridCellActive : ''}`}
                  style={{ opacity: cell.isEmpty ? 0.2 : 1, cursor: cell.isEmpty ? 'default' : 'pointer' }}
                  onClick={() => {
                    if (!cell.isEmpty) {
                      setSelectedDay(cell.dayName);
                    }
                  }}
                >
                  <span className={`${styles.gridCellNum} ${isSelected ? styles.gridCellNumActive : ''}`}>
                    {cell.dateNum !== 0 ? cell.dateNum : ''}
                  </span>
                  
                  {/* Event indicator badges inside cell */}
                  <div className={styles.gridCellEvents}>
                    {cellEvents.slice(0, 2).map((ev: any) => (
                      <div 
                        key={ev.id} 
                        className={styles.gridMiniBadge}
                        style={{ background: getMiniBadgeColor(ev.type), color: getMiniBadgeTextColor(ev.type) }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {cellEvents.length > 2 && (
                      <div style={{ fontSize: '0.6rem', color: '#717171', textAlign: 'center' }}>
                        +{cellEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewType === 'List' && (
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Calendar size={18} color="#22c55e" />
            Agenda Overview for {activeMonth}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
            {activeMonthAllEvents.length > 0 ? (
              activeMonthAllEvents.map(ev => (
                <div key={ev.id} className={styles.listItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#ededed', fontWeight: 600 }}>{ev.day}</span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', margin: 0 }}>{ev.title}</h4>
                      <span className={getEventTypeClass(ev.type)}>{ev.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{ev.time}</span>
                      <button 
                        onClick={() => handleDeleteEvent(ev.id, activeMonth)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        title="Delete Event"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#717171', margin: 0 }}>{ev.agenda}</p>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#717171' }}>
                <Clock size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>No events recorded in {activeMonth}.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI SMART PLANNER INPUT BOX */}
      <div className={styles.scheduleForm} style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 15, 15, 0.6) 100%)', border: '1px dashed rgba(139, 92, 246, 0.3)', marginBottom: '0.75rem', padding: '16px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0' }}>
          <Sparkles size={16} style={{ animation: 'pulse-glow 2s infinite alternate' }} />
          AI Smart Planner (Natural Language)
          {aiUsage && !aiUsage.isPro && (
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 500, marginLeft: 'auto' }}>
              Usage: {aiUsage.count} / {aiUsage.max} actions
            </span>
          )}
        </h4>
        <form onSubmit={handleAiSchedule} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="e.g., Code sync with Hitesh next Monday at 3 PM for 1h on Meet" 
            className={styles.formInput}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={aiLoading}
            style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
          />
          <button 
            type="submit" 
            disabled={aiLoading || !aiInput.trim()}
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#a78bfa',
              padding: '0px 18px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: aiLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; }}
          >
            {aiLoading ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={14} />
            )}
            Parse
          </button>
        </form>
      </div>

      {/* EVENT SCHEDULER FORM (Always visible at the bottom of Calendar view) */}
      <form onSubmit={handleAddEvent} className={styles.scheduleForm} style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px', marginBottom: '4px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Plus size={16} color="#22c55e" />
            Schedule Item for {selectedDay} {activeDayObj?.dateNum} ({activeMonthName})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className={styles.formLabel} style={{ margin: 0 }}>Event Type:</label>
            <select 
              className={styles.formInput} 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value)}
              style={{ width: '130px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="Meeting">Meeting</option>
              <option value="Task">Task / Todo</option>
              <option value="Reminder">Reminder</option>
              <option value="Focus Time">Focus Block</option>
            </select>
          </div>
        </div>

        {notification && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '8px 12px', borderRadius: '6px', color: '#22c55e', fontSize: '0.85rem', fontWeight: 500 }}>
            <CheckCircle2 size={16} />
            {notification}
          </div>
        )}

        <div className={styles.formGrid}>
          <div>
            <label className={styles.formLabel}>Title / Subject</label>
            <input 
              type="text" 
              placeholder={eventType === 'Focus Time' ? "e.g. Write WebSocket modules" : "e.g. Sync with team"} 
              className={styles.formInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel}>Time slot (Start - End)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="09:00 AM" 
                className={styles.formInput}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <input 
                type="text" 
                placeholder="10:00 AM" 
                className={styles.formInput}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* CONDITIONAL COMPONENT FIELDS */}
        {eventType === 'Meeting' && (
          <>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.formLabel}>Meeting Link</label>
                <input 
                  type="url" 
                  placeholder="e.g. https://zoom.us/j/123456" 
                  className={styles.formInput}
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={styles.formLabel}>Platform</label>
                <select 
                  className={styles.formInput}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="Zoom">Zoom</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Slack Call">Slack Call</option>
                  <option value="Discord">Discord</option>
                </select>
              </div>
            </div>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.formLabel}>Attendees</label>
                <input 
                  type="text" 
                  placeholder="e.g. Aarav, Hitesh, Piyush" 
                  className={styles.formInput}
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.formLabel}>Linked Document / Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sprint Docs" 
                  className={styles.formInput}
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {eventType === 'Task' && (
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Task Priority</label>
              <select 
                className={styles.formInput}
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            <div>
              <label className={styles.formLabel}>Assignee</label>
              <input 
                type="text" 
                placeholder="e.g. Kiran" 
                className={styles.formInput}
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              />
            </div>
          </div>
        )}

        {eventType === 'Reminder' && (
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Notification Alert Style</label>
              <select 
                className={styles.formInput}
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
              >
                <option value="Notification Badge">Inbox Badge Notification</option>
                <option value="Alert Window">Desktop Alert Modal</option>
                <option value="Silent">Silent Log Tracker</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px', color: '#717171', fontSize: '0.8rem', marginTop: '1.5rem' }}>
              <span>* Generates system alert in inbox.</span>
            </div>
          </div>
        )}

        {eventType === 'Focus Time' && (
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Focus Category</label>
              <select 
                className={styles.formInput}
                value={focusCategory}
                onChange={(e) => setFocusCategory(e.target.value)}
              >
                <option value="Coding">Coding / Engineering</option>
                <option value="Design Review">Design / UI-UX Polish</option>
                <option value="Deep Work">Deep Reading / Strategy</option>
              </select>
            </div>
            <div>
              <label className={styles.formLabel}>Focus Block Topic</label>
              <input 
                type="text" 
                placeholder="e.g. Research replication latency" 
                className={styles.formInput}
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Agenda Description & Submit */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <label className={styles.formLabel}>Agenda / Description Notes</label>
            <input 
              type="text" 
              placeholder="Detail notes and links here..." 
              className={styles.formInput}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.formSubmitBtn}>Schedule</button>
        </div>
      </form>

      {/* DYNAMIC GOOGLE CALENDAR DELETION APPROVAL MODAL */}
      {deletingEventState && (
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
            gap: '1.25rem'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} color="#ef4444" />
                Delete Calendar Event
              </h3>
              <button 
                type="button"
                onClick={() => setDeletingEventState(null)} 
                style={{ background: 'transparent', border: 'none', color: '#717171', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: '1.5' }}>
              {deletingEventState.status === 'confirming' && (
                <p style={{ margin: 0 }}>
                  Are you sure you want to delete <strong style={{ color: '#fff' }}>{deletingEventState.title}</strong> from Google Calendar? This action cannot be undone.
                </p>
              )}

              {deletingEventState.status === 'deleting' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                  <Loader2 size={32} className={styles.spinner} style={{ animation: 'spin 1s linear infinite', color: '#ef4444' }} />
                  <p style={{ margin: 0, textAlign: 'center' }}>Deleting event from Google Calendar...</p>
                </div>
              )}

              {deletingEventState.status === 'requesting_approval' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: '8px', color: '#f87171' }}>
                    <Bell size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: '2px', color: '#ff8a8a' }}>Authorization Required</strong>
                      Corsair security requires one-time approval to authorize this Google Calendar deletion.
                    </div>
                  </div>
                  <p style={{ margin: 0 }}>
                    Please click the button below to authorize the deletion in a new tab. Once you click <strong style={{ color: '#fff' }}>Approve</strong>, the event will delete automatically.
                  </p>
                </div>
              )}

              {deletingEventState.status === 'polling' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                  <Loader2 size={32} className={styles.spinner} style={{ animation: 'spin 1s linear infinite', color: '#22c55e' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#fff' }}>Waiting for authorization...</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#a1a1aa' }}>
                      Please click <strong style={{ color: '#fff' }}>Approve</strong> on the Corsair page in the opened tab.
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#717171' }}>
                      This modal will close automatically once approved.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (deletingEventState.approvalUrl) {
                        window.open(deletingEventState.approvalUrl, '_blank');
                      }
                    }}
                    style={{
                      fontSize: '0.8rem',
                      color: '#93c5fd',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink size={12} /> Open approval page again
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
              {deletingEventState.status === 'confirming' && (
                <>
                  <button 
                    type="button"
                    onClick={() => setDeletingEventState(null)}
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
                      setDeletingEventState((prev: any) => prev ? { ...prev, status: 'deleting' } : null);
                      try {
                        const res = await fetch(`/api/calendar?id=${deletingEventState.eventId}`, {
                          method: 'DELETE'
                        });
                        const json = await res.json();
                        if (json.success) {
                          setEvents((prev: any[]) => prev.filter((e: any) => e.id !== deletingEventState.eventId));
                          setNotification('Event deleted successfully!');
                          setTimeout(() => setNotification(null), 3000);
                          setDeletingEventState(null);
                        } else if (json.error === 'Approval Required' && json.approvalUrl) {
                          setDeletingEventState((prev: any) => prev ? { ...prev, status: 'requesting_approval', approvalUrl: json.approvalUrl } : null);
                        } else {
                          alert("Failed to delete event: " + json.error);
                          setDeletingEventState(null);
                        }
                      } catch (err: any) {
                        console.error(err);
                        alert("Error deleting event: " + err.message);
                        setDeletingEventState(null);
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
                    Delete Event
                  </button>
                </>
              )}

              {deletingEventState.status === 'requesting_approval' && (
                <>
                  <button 
                    type="button"
                    onClick={() => setDeletingEventState(null)}
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
                    onClick={() => {
                      if (deletingEventState.approvalUrl) {
                        window.open(deletingEventState.approvalUrl, '_blank');
                        setDeletingEventState((prev: any) => prev ? { ...prev, status: 'polling' } : null);
                      }
                    }}
                    style={{
                      background: '#22c55e',
                      border: 'none',
                      color: '#000',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink size={14} /> Authorize Deletion
                  </button>
                </>
              )}

              {deletingEventState.status === 'polling' && (
                <button 
                  type="button"
                  onClick={() => setDeletingEventState(null)}
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
                  Cancel / Stop
                </button>
              )}

              {deletingEventState.status === 'deleting' && (
                <button 
                  type="button"
                  disabled
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#717171',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Deleting...
                </button>
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
