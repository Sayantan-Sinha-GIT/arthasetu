'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { DataSaverToggle } from '@/components/layout/DataSaverToggle';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = !!user && !!ADMIN_EMAIL && user.email?.toLowerCase().trim() === ADMIN_EMAIL;
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const isActive = (path: string) => pathname === path;

  // Determine navigation links based on user role
  const navLinks = user
    ? isAdmin
      ? [
          { href: `/${ADMIN_ROUTE_KEY}/admin`, label: t.adminNav.dashboard },
          { href: `/${ADMIN_ROUTE_KEY}/admin/schemes`, label: t.adminNav.schemes },
          { href: `/${ADMIN_ROUTE_KEY}/admin/history`, label: t.adminNav.history },
        ]
      : [
          { href: '/dashboard', label: t.nav.dashboard },
          { href: '/advisor', label: t.nav.advisor },
          { href: '/planner', label: t.nav.planner },
          { href: '/schemes', label: t.nav.schemes },
        ]
    : [];

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  const logoHref = user
    ? isAdmin
      ? `/${ADMIN_ROUTE_KEY}/admin`
      : '/dashboard'
    : '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300 ${pathname === '/' ? 'bg-gradient-to-b from-black/60 to-transparent pointer-events-none' : 'glass border-b border-border/40 shadow-sm'}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${pathname === '/' ? 'pointer-events-auto' : ''}`}>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={logoHref} className="flex items-center gap-2 shrink-0 group transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center shadow-md group-hover:shadow-saffron-500/30 transition-shadow">
              <span className="text-white font-bold text-sm">अ</span>
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">
              {t.appName}
            </span>
            {isAdmin && (
              <span className="hidden sm:inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-600 text-white dark:bg-navy-400 dark:text-navy-950 uppercase tracking-wider">
                {t.adminNav.badge}
              </span>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ease-smooth
                    ${active
                      ? 'bg-primary/15 text-primary font-bold shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface/80'
                    }
                  `}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-1 left-3.5 right-3.5 h-0.5 bg-primary rounded-full animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Data Saver Toggle */}
            <DataSaverToggle />

            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border hover:border-primary/40 hover:bg-surface
                         transition-all duration-200 text-muted hover:text-foreground cursor-pointer active:scale-95 shadow-xs"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* User Menu (desktop) */}
            {user ? (
              <div className="hidden lg:flex items-center gap-2">
                {isAdmin ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-foreground max-w-[130px] truncate">
                      {user.email}
                    </span>
                  </div>
                ) : (
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-saffron-400 to-navy-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-muted max-w-[100px] truncate">
                      {user.displayName || user.email}
                    </span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-muted hover:text-danger transition-colors rounded-lg hover:bg-surface cursor-pointer font-medium"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
                >
                  {t.nav.signup}
                </Link>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/50 bg-surface-elevated animate-fade-in">
          <div className="py-3 px-2 space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-primary/15 text-primary font-bold shadow-xs'
                      : 'text-muted hover:text-foreground hover:bg-surface'
                    }
                  `}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}

            {/* Mobile user section */}
            <div className="pt-2 mt-2 border-t border-border-subtle">
              {user ? (
                isAdmin ? (
                  <>
                    <div className="px-3 py-2 text-xs text-muted">
                      {t.adminNav.signedInAs}: <span className="font-bold text-foreground font-mono">{user.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-sm text-danger hover:bg-danger-light rounded-lg transition-colors font-medium"
                    >
                      {t.nav.logout}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 text-sm text-muted hover:text-foreground rounded-lg hover:bg-surface"
                    >
                      {t.nav.profile}
                    </Link>
                    <Link
                      href="/saved-plans"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 text-sm text-muted hover:text-foreground rounded-lg hover:bg-surface"
                    >
                      {t.nav.savedPlans}
                    </Link>
                    <Link
                      href="/saved-advice"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 text-sm text-muted hover:text-foreground rounded-lg hover:bg-surface"
                    >
                      {t.nav.savedAdvice}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-sm text-danger hover:bg-danger-light rounded-lg transition-colors"
                    >
                      {t.nav.logout}
                    </button>
                  </>
                )
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-center border border-border rounded-xl hover:bg-surface"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-semibold text-center bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover"
                  >
                    {t.nav.signup}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
