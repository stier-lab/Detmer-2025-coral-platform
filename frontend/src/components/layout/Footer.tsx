import { Link } from 'react-router-dom';
import {
  Mail,
  Github,
  ExternalLink,
  BarChart3,
  Download,
  BookOpen,
  FileText,
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ocean-950 text-white mt-auto border-t border-white/5">
      {/* Top accent line */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(46, 134, 171, 0.25), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral-400 to-teal-500 flex items-center justify-center flex-shrink-0 p-1.5">
                <svg
                  className="w-full h-full text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M12 3C12 3 8 7 8 12c0 3 2 6 4 8m0-17c0 0 4 4 4 9c0 3-2 6-4 8" strokeLinecap="round" />
                  <path d="M12 12c-2-3-5-4-7-3m7 3c2-3 5-4 7-3" strokeLinecap="round" />
                  <path d="M12 16c-1.5-2-4-3-6-2m6 2c1.5-2 4-3 6-2" strokeLinecap="round" opacity="0.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  <em>A. palmata</em> Database
                </h3>
                <p className="text-white/60 text-xs font-sans">Stier Lab &middot; UC Santa Barbara</p>
              </div>
            </div>

            <p className="text-white/70 text-sm font-body leading-relaxed max-w-sm mb-4">
              A synthesis of demographic parameters for Caribbean elkhorn coral restoration,
              developed by the Ocean Recoveries Lab at UCSB.
            </p>

            <div className="text-white/60 text-xs font-sans leading-relaxed mb-4">
              <p>Department of Ecology, Evolution & Marine Biology</p>
              <p>University of California, Santa Barbara</p>
              <p>Santa Barbara, CA 93106</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-3">
              <a
                href="mailto:stier@ucsb.edu"
                className="inline-flex items-center gap-1.5 text-teal-400 hover:text-teal-300 text-sm font-sans transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                stier@ucsb.edu
              </a>
              <a
                href="https://github.com/stier-lab/Detmer-2025-coral-parameters"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm font-sans transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
            </div>

            <p className="text-white/60 text-xs font-sans">
              Questions or data contributions?{' '}
              <a href="mailto:stier@ucsb.edu" className="text-teal-400 hover:text-teal-300 transition-colors">
                Get in touch
              </a>
            </p>
          </div>

          {/* Navigate links */}
          <div className="md:col-span-4">
            <h4 className="text-[0.6875rem] font-sans font-semibold uppercase tracking-[0.15em] text-white/60 mb-4">
              Navigate
            </h4>
            <ul className="space-y-2.5">
              {[
                { to: '/analysis', label: 'Analysis', Icon: BarChart3 },
                { to: '/literature', label: 'Literature', Icon: BookOpen },
                { to: '/methods', label: 'Methods', Icon: FileText },
                { to: '/download', label: 'Download', Icon: Download },
              ].map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-white/70 hover:text-white text-sm font-sans transition-colors inline-flex items-center gap-2"
                  >
                    <Icon className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="md:col-span-3">
            <h4 className="text-[0.6875rem] font-sans font-semibold uppercase tracking-[0.15em] text-white/60 mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://oceanrecoveries.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white text-sm font-sans transition-colors inline-flex items-center gap-1.5"
                >
                  Ocean Recoveries Lab
                  <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/stier-lab/Detmer-2025-coral-parameters"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white text-sm font-sans transition-colors inline-flex items-center gap-1.5"
                >
                  Source Code
                  <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Funding */}
        <div className="py-5 border-t border-white/5 mb-5">
          <p className="text-white/60 text-xs font-sans text-center">
            Supported by the National Science Foundation (NSF OCE-2048589) and NOAA Coral Reef Conservation Program
          </p>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <p className="text-white/60 text-xs font-sans">
              &copy; {currentYear} Stier Lab, UC Santa Barbara. Data openly available for research use.
            </p>
            <span className="hidden sm:inline text-white/30" aria-hidden="true">|</span>
            <p className="text-white/50 text-xs font-sans">
              v1.0 &middot; Last updated January 2026
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs font-sans">
            <a
              href="https://github.com/stier-lab/Detmer-2025-coral-parameters/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white/80 transition-colors inline-flex items-center gap-1"
            >
              License
              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
            <Link
              to="/methods"
              className="text-white/60 hover:text-white/80 transition-colors"
            >
              Cite this database
            </Link>
            <a
              href="https://www.nsf.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white/80 transition-colors inline-flex items-center gap-1"
            >
              NSF Support
              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
