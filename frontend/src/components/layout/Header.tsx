import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFilterStore } from '../../stores/filterStore';
import {
  BarChart3,
  ArrowRight,
  Database,
  BookOpen,
  FileText,
} from 'lucide-react';

// 3-page architecture: Story (home) + Analysis + Methods
const NAV_ITEMS = [
  { path: '/analysis', label: 'Analysis', icon: BarChart3 },
  { path: '/methods', label: 'Methods', icon: FileText },
  { path: '/literature', label: 'Literature', icon: BookOpen },
];

// Contextual CTAs based on current page
const getContextualCTA = (pathname: string) => {
  switch (pathname) {
    case '/':
      return { label: 'Full Analysis', path: '/analysis', icon: BarChart3 };
    case '/analysis':
      return { label: 'Methods', path: '/methods', icon: FileText };
    case '/methods':
      return { label: 'Analysis', path: '/analysis', icon: BarChart3 };
    case '/literature':
      return { label: 'Analysis', path: '/analysis', icon: BarChart3 };
    default:
      return { label: 'Full Analysis', path: '/analysis', icon: BarChart3 };
  }
};

export function Header() {
  const location = useLocation();
  const { getActiveFilterCount } = useFilterStore();
  const filterCount = getActiveFilterCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const contextualCTA = getContextualCTA(location.pathname);

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state reset on route change
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isLandingPage = location.pathname === '/';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-ocean-950/97 backdrop-blur-lg shadow-lg'
          : isLandingPage
          ? 'bg-transparent'
          : 'bg-ocean-950'
      }`}
    >
      {/* Subtle bottom border */}
      <div className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300 ${
        scrolled ? 'opacity-100' : 'opacity-0'
      }`} style={{ background: 'linear-gradient(90deg, transparent, rgba(46, 134, 171, 0.2), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[3.75rem]">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            aria-label="Return to home page"
          >
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-coral-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow p-1">
              <img
                src="/images/palmata-icon.svg"
                alt=""
                className="w-full h-full object-contain invert"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col">
              <span className="font-display font-semibold text-white text-[0.9375rem] leading-tight tracking-tight group-hover:text-teal-300 transition-colors">
                <em className="hidden sm:inline not-italic">Acropora palmata</em>
                <em className="sm:hidden not-italic">A. palmata</em>
              </span>
              <span className="text-white/60 text-[0.6875rem] font-sans hidden sm:block">
                Caribbean Demographic Database
              </span>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center" aria-label="Main navigation">
            <div className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[0.8125rem] font-sans font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-white/60'}`} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Filter indicator */}
            {filterCount > 0 && (
              <Link
                to="/analysis"
                className="flex items-center gap-2 px-2.5 py-1.5 bg-coral-400/15 rounded-lg border border-coral-400/20 hover:border-coral-400/40 transition-all"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-coral-400" />
                </span>
                <span className="text-white/80 text-xs font-sans font-medium">
                  {filterCount}
                  <span className="hidden sm:inline ml-1">
                    filter{filterCount > 1 ? 's' : ''}
                  </span>
                </span>
              </Link>
            )}

            {/* Contextual CTA */}
            {!isLandingPage && (
              <Link
                to={contextualCTA.path}
                className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-white font-sans font-medium text-[0.8125rem] rounded-lg transition-all duration-200 group"
              >
                <contextualCTA.icon className="w-3.5 h-3.5" />
                <span>{contextualCTA.label}</span>
                <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {/* Species badge */}
            <div className="hidden xl:flex items-center gap-1.5 text-[0.6875rem] text-white/60 font-sans border-l border-white/10 pl-3 ml-1" aria-label="Database contains 5,200+ records">
              <Database className="w-3 h-3 text-teal-500/60" aria-hidden="true" />
              <span>5,200+ records</span>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className={`w-5 h-5 text-white transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-250 ease-out ${
            mobileMenuOpen ? 'max-h-[70vh] opacity-100 pb-4' : 'max-h-0 opacity-0'
          }`}
        >
          <nav
            id="mobile-menu"
            className="pt-3 border-t border-white/10"
            aria-label="Mobile navigation"
          >
            {!isLandingPage && (
              <Link
                to={contextualCTA.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 mb-3 px-4 py-2.5 bg-teal-500 text-white font-sans font-medium text-sm rounded-lg"
              >
                <contextualCTA.icon className="w-4 h-4" />
                {contextualCTA.label}
              </Link>
            )}

            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-white/40'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
