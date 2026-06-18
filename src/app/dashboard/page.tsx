'use client';
import { useState } from 'react';
import { LayoutDashboard, Inbox, Calendar, Settings, Plus, LogOut, BrainCircuit, Mail } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { DashboardView } from '@/components/dashboard/DashboardView';
import AccountView from '@/components/dashboard/SettingsView';
import InboxView from '@/components/dashboard/InboxView';
import CalendarView from '@/components/dashboard/CalendarView';
import WorkspaceSettingsView from '@/components/dashboard/WorkspaceSettingsView';
import ComposeModal from '@/components/ComposeModal';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Inbox', icon: <Inbox size={20} /> },
    { name: 'Calendar', icon: <Calendar size={20} /> },
    { name: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logo}><BrainCircuit color="#22c55e" size={28} /> GLIDEFLOW</div>
          <nav style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {navItems.map((item) => (
              <div key={item.name} className={`${styles.navItem} ${activeTab === item.name ? styles.active : ''}`} onClick={() => setActiveTab(item.name)}>
                {item.icon} {item.name}
              </div>
            ))}
          </nav>
        </div>
        <div 
          className={styles.profileSection} 
          onClick={() => setActiveTab('Account')}
          style={{ cursor: 'pointer' }}
        >
          {isLoaded && isSignedIn && user ? (
            <>
              {user.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.fullName || 'User'} 
                  className={styles.avatar} 
                  style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                />
              ) : (
                <div className={styles.avatar}>
                  {(user.firstName?.[0] || user.primaryEmailAddress?.emailAddress?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className={styles.userInfo}>
                <span className={styles.userName} style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.fullName || user.primaryEmailAddress?.emailAddress.split('@')[0]}
                </span>
                <span className={styles.userPlan}>
                  {(user.publicMetadata?.plan as string) || 'Free Plan'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.avatar}>...</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>Loading...</span>
                <span className={styles.userPlan}>Fetching info</span>
              </div>
            </>
          )}
          <LogOut 
            size={16} 
            style={{ marginLeft: 'auto', cursor: 'pointer', color: '#a1a1aa' }} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent tab navigation when logging out
              signOut().then(() => router.push('/'));
            }}
          />
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div><h1 className={styles.pageTitle}>{activeTab}</h1><p className={styles.pageSubtitle}>Manage your workflow</p></div>
          <div style={{ position: 'relative' }}>
            <button className={styles.actionBtn} onClick={() => setShowActions(!showActions)}><Plus size={24} /></button>
            {showActions && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownItem} onClick={() => { setIsModalOpen(true); setShowActions(false); }}><Mail size={16} /> Compose</div>
                <div className={styles.dropdownItem} onClick={() => setShowActions(false)}><Calendar size={16} /> Schedule</div>
              </div>
            )}
          </div>
        </header>
        <div className={styles.contentScrollWrapper}>
          {activeTab === 'Dashboard' && <DashboardView />}
          {activeTab === 'Inbox' && <InboxView />}
          {activeTab === 'Calendar' && <CalendarView />}
          {activeTab === 'Account' && <AccountView />}
          {activeTab === 'Settings' && <WorkspaceSettingsView />}
        </div>
      </main>
      <ComposeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}