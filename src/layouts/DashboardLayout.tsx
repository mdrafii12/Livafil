import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Pill, Tags, Truck, Boxes, 
  History, BarChart4, Users, Settings, Bell, Search, 
  Sun, Moon, Menu, X, ChevronDown, LogOut, Check, Trash2, 
  User as UserIcon, Building2, Eye, CircleAlert, ArrowLeftRight,
  Coins, ShieldAlert, HelpCircle, Receipt, Globe, AlarmClock, Stethoscope
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Notification } from '../types';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/supabaseData';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, setTheme } = useTheme();
  const { profile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  
  const { language, setLanguage } = useLanguage();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const { t } = useTranslation();

  if (!profile) return null;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  // Unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Filtered notifications
  const displayedNotifs = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.read;
    return true;
  });

  const menuItems = [
    { name: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'billing', label: 'Quick Billing', path: '/billing', icon: Receipt, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'opd', label: 'Out-Patient (OPD)', path: '/opd', icon: Stethoscope, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'refillReminders', label: 'Refill Reminders', path: '/reminders', icon: AlarmClock, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'medicines', label: 'Medicines', path: '/medicines', icon: Pill, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'categories', label: 'Categories', path: '/categories', icon: Tags, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'suppliers', label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'batches', label: 'Inventory Batches', path: '/batches', icon: Boxes, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'movements', label: 'Stock Movements', path: '/movements', icon: History, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'recovery', label: 'Recovery Center', path: '/recovery', icon: Coins, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'reports', label: 'Reports Audit', path: '/reports', icon: BarChart4, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'exchange', label: 'MedGuard Exchange', path: '/exchange', icon: ArrowLeftRight, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'users', label: 'Staff Management', path: '/users', icon: Users, roles: ['Owner', 'Manager'] },
    { name: 'support', label: 'Support Hub', path: '/support', icon: HelpCircle, roles: ['Owner', 'Manager', 'Staff'] },
    { name: 'admin', label: 'Super Admin', path: '/admin', icon: ShieldAlert, roles: ['Owner', 'Manager'] },
    { name: 'settings', label: 'Settings', path: '/settings', icon: Settings, roles: ['Owner', 'Manager', 'Staff'] },
  ];

  // Helper to resolve breadcrumb segment names
  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.map((p, idx) => {
      const url = '/' + parts.slice(0, idx + 1).join('/');
      const label = p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ');
      return { label, url };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-200 z-30`}>
        <div className="p-6 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="LIVAFIL" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">LIVAFIL</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          {menuItems
            .filter(item => item.roles.includes(profile.role))
            .map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-sm group ${
                    active 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                  <span>{t(`sidebar.${item.name}`, item.label)}</span>
                </Link>
              );
            })}
        </nav>

        {/* AI Protection Card */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 text-white border border-transparent dark:border-slate-800/60 shadow-xs">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">AI Protection</p>
            <p className="text-sm leading-tight mb-3">Smart expiry detection is active.</p>
            <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-4/5"></div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200/50">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile.name}</p>
              <p className="text-[10px] font-semibold text-slate-400 truncate tracking-wide uppercase">{profile.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR FOR MOBILE */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-200 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="LIVAFIL" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <span className="font-display font-bold text-lg text-gray-900 dark:text-white">LIVAFIL</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-12rem)]">
          {menuItems
            .filter(item => item.roles.includes(profile.role))
            .map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{t(`sidebar.${item.name}`, item.label)}</span>
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 absolute bottom-0 left-0 right-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all duration-200">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </button>
 
            {/* BREADCRUMBS */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-400 font-medium">
              <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  <span>/</span>
                  <Link 
                    to={b.url} 
                    className={idx === breadcrumbs.length - 1 ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'hover:text-blue-600 dark:hover:text-blue-400'}
                  >
                    {b.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* RIGHT SIDEBAR UTILITIES */}
          <div className="flex items-center space-x-4">

            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                title="Change Language"
              >
                <Globe className="h-4.5 w-4.5" />
                <span className="text-[10px] font-bold uppercase">{language}</span>
              </button>
              
              {langOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-2 z-50 animate-slideDown origin-top-right">
                  {(['en', 'te', 'hi'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setLangOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold ${
                        language === lang 
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {lang === 'en' ? 'English' : lang === 'te' ? 'Telugu' : 'Hindi'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Lighter/Darker Theme Switcher */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-blue-500" />}
            </button>

            {/* NOTIFICATION CENTER DROPDOWN */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-red-500 border border-white dark:border-gray-900 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-slideIn">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Shelf Alerts</h4>
                      <p className="text-[10px] text-gray-400 font-medium">Pharmacy Expiry & Stock Metrics</p>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>All Read</span>
                      </button>
                    )}
                  </div>

                  {/* Filter chips inside center */}
                  <div className="flex space-x-1.5 p-1.5 border-b border-gray-50 dark:border-gray-800/50">
                    <button 
                      onClick={() => setNotifFilter('all')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${notifFilter === 'all' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setNotifFilter('unread')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${notifFilter === 'unread' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1 space-y-0.5">
                    {displayedNotifs.length > 0 ? (
                      displayedNotifs.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-2.5 rounded-xl border border-transparent flex items-start justify-between group transition-colors ${notif.read ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40' : 'bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/40'}`}
                        >
                          <div className="flex items-start space-x-2 shrink min-w-0">
                            <span className="mt-0.5 shrink-0">
                              {notif.type === 'expiry' ? (
                                <CircleAlert className="h-4 w-4 text-red-500" />
                              ) : notif.type === 'low_stock' ? (
                                <Boxes className="h-4 w-4 text-amber-500" />
                              ) : notif.type === 'exchange_request' ? (
                                <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                              ) : notif.type === 'exchange_match' ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Shield className="h-4 w-4 text-slate-500" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs ${notif.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'} leading-tight truncate`}>
                                {notif.title}
                              </p>
                              <p className="text-[10px] text-gray-400 leading-snug mt-0.5 break-words">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shrink-0">
                            {!notif.read && (
                              <button 
                                onClick={() => handleMarkRead(notif.id)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Mark read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete notification"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center space-y-2">
                        <Check className="h-6 w-6 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 p-1.5 rounded-full" />
                        <span>All shelves are secure!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER SETTINGS & MENU DROPDOWN */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent"
              >
                <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {profile.name.charAt(0)}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 p-2 space-y-0.5 animate-slideIn">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{profile.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wider">{profile.role}</p>
                  </div>

                  <Link 
                    to="/settings" 
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span>User Profile</span>
                  </Link>

                  <Link 
                    to="/settings" 
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <span>Pharmacy Profile</span>
                  </Link>

                  <hr className="border-gray-100 dark:border-gray-800 my-1" />

                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* WORKSPACE VIEW CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}