/**
 * NewUserBanner Component
 *
 * A dismissible banner for first-time visitors that guides them
 * to the Key Findings page. Uses localStorage to track dismissal.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, HelpCircle } from 'lucide-react';

const STORAGE_KEY = 'apal-banner-dismissed';

export function NewUserBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay for smoother page load
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleDismiss = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  const handleLinkClick = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative transition-all duration-300 ${
        isAnimating ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-gradient-to-r from-ocean-deep to-ocean-deep/95 border border-ocean-deep/20 rounded-2xl p-5 md:p-6 shadow-lg">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-bioluminescent/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-bioluminescent" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white mb-1">
              First time here?
            </h3>
            <p className="text-sm text-white/70 mb-4">
              We compiled survival and growth data from 18 published studies on <em>A. palmata</em>. Browse the data, or start with common questions researchers have asked.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/analysis"
                onClick={handleLinkClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-bioluminescent text-ocean-abyss font-medium text-sm rounded-lg hover:bg-bioluminescent/90 transition-colors group"
              >
                <HelpCircle className="w-4 h-4" />
                View Analysis
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/literature"
                onClick={handleLinkClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Or browse the literature
              </Link>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewUserBanner;
