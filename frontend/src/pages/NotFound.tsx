/**
 * Custom 404 Not Found Page
 *
 * A friendly error page with coral-themed personality
 */

import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function NotFound() {
  return (
    <div className="min-h-screen bg-ocean-abyss flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          {/* Coral skeleton illustration */}
          <div className="mb-8 relative">
            <svg
              viewBox="0 0 200 200"
              className="w-48 h-48 mx-auto text-white/10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              {/* Dead coral skeleton branches */}
              <path d="M100 180 C100 160, 95 140, 100 120 C105 100, 115 90, 110 70 C105 50, 90 40, 95 20" strokeLinecap="round" />
              <path d="M100 120 C85 110, 70 105, 60 90" strokeLinecap="round" />
              <path d="M100 120 C115 110, 130 105, 140 90" strokeLinecap="round" />
              <path d="M95 70 C80 65, 65 60, 55 45" strokeLinecap="round" />
              <path d="M110 70 C125 60, 135 50, 145 35" strokeLinecap="round" />
              {/* X marks */}
              <circle cx="100" cy="100" r="50" strokeDasharray="4 4" opacity="0.3" />
            </svg>

            {/* 404 overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-6xl font-bold text-white/20">404</span>
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-light text-white mb-4">
            This reef has <span className="font-semibold italic text-coral-warm">bleached</span>
          </h1>

          <p className="text-white/50 text-lg mb-4">
            The page you're looking for has gone the way of too many Caribbean corals —
            it's not where it used to be.
          </p>

          <p className="text-white/30 text-sm mb-8 italic">
            (But unlike coral bleaching, this one's easy to fix!)
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-bioluminescent text-ocean-abyss font-semibold text-sm rounded-full transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(0,212,170,0.3)]"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              to="/analysis"
              className="inline-flex items-center gap-2 px-6 py-3 text-white/70 hover:text-white font-medium text-sm transition-colors border border-white/20 rounded-full hover:border-white/40 hover:bg-white/5"
            >
              <Sparkles className="w-4 h-4" />
              View Analysis
            </Link>
          </div>

          {/* Helpful links */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-white/30 text-sm mb-4">Maybe you were looking for:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/analysis" className="text-bioluminescent/70 hover:text-bioluminescent inline-flex items-center gap-1">
                <Search className="w-3 h-3" />
                Analysis
              </Link>
              <Link to="/literature" className="text-bioluminescent/70 hover:text-bioluminescent">
                Literature
              </Link>
              <Link to="/methods" className="text-bioluminescent/70 hover:text-bioluminescent">
                Methods
              </Link>
              <Link to="/download" className="text-bioluminescent/70 hover:text-bioluminescent">
                Download
              </Link>
            </div>
          </div>

          {/* Go back link */}
          <button
            onClick={() => window.history.back()}
            className="mt-8 text-white/30 hover:text-white/50 text-sm inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back to previous page
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
