import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SkipLink } from '../common';

interface PageLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'immersive' | 'minimal';
}

// Atmospheric background with subtle ocean-inspired effects
function AtmosphericBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Base gradient - surface water effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-sand-light via-sand-light to-ocean-light/5" />

      {/* Caustic light patterns - very subtle */}
      <div className="absolute top-0 left-0 w-full h-96 opacity-30">
        <div
          className="absolute w-[600px] h-[600px] -top-48 -left-48 rounded-full"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(46, 134, 171, 0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] top-12 right-[-10%] rounded-full animate-float"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 212, 170, 0.05) 0%, transparent 70%)',
            animationDuration: '20s',
          }}
        />
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(5,27,44,0.02)_100%)]" />

      {/* Very light grain texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// Floating coral decorations for immersive variant
function FloatingDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Floating coral branch silhouettes */}
      <svg
        className="absolute bottom-0 right-0 w-64 h-64 text-ocean-light/[0.03] animate-float"
        viewBox="0 0 100 100"
        style={{ animationDuration: '15s' }}
      >
        <path
          d="M50 90 L50 50 M50 50 Q30 35 20 20 M50 50 Q70 35 80 20 M50 60 Q35 50 25 35 M50 60 Q65 50 75 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="absolute top-32 left-8 w-32 h-32 text-coral-warm/[0.04] animate-float-reverse"
        viewBox="0 0 100 100"
        style={{ animationDuration: '18s' }}
      >
        <path
          d="M50 90 L50 40 M50 40 Q25 25 15 10 M50 40 Q75 25 85 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function PageLayout({
  children,
  fullWidth = false,
  variant = 'default',
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-sand-light relative">
      <SkipLink />

      {/* Atmospheric background effects */}
      {variant !== 'minimal' && <AtmosphericBackground />}
      {variant === 'immersive' && <FloatingDecorations />}

      <Header />

      <main
        id="main-content"
        className={`flex-1 ${
          fullWidth ? '' : 'max-w-7xl mx-auto'
        } w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10`}
        role="main"
      >
        {children}
      </main>

      <Footer />
    </div>
  );
}

// Simple layout without sidebar for static pages
export function SimpleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-sand-light relative">
      <SkipLink />
      <AtmosphericBackground />
      <Header />
      <main
        id="main-content"
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10"
        role="main"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
