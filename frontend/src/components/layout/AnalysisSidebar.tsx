import { useEffect, useState, useCallback } from 'react';
import {
  TrendingDown,
  Shield,
  Sprout,
  MapPin,
  BarChart3,
  FileDown,
  LayoutGrid,
  AlertOctagon,
  Users,
  Target,
  Clock,
} from 'lucide-react';

export interface AnalysisSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  category?: 'summary' | 'status' | 'drivers' | 'size' | 'quality' | 'comparison' | 'tools' | 'data';
  finding?: number | number[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const ANALYSIS_SECTIONS: AnalysisSection[] = [
  // Executive Summary
  { id: 'summary', label: 'Key Findings', icon: <LayoutGrid className="w-4 h-4" />, category: 'summary', finding: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },

  // Population Status (Findings 1, 9)
  { id: 'population-status', label: 'Population Decline', icon: <TrendingDown className="w-4 h-4" />, category: 'status', finding: [1, 9] },

  // Key Drivers (Finding 2)
  { id: 'drivers', label: 'Critical Vital Rates', icon: <Shield className="w-4 h-4" />, category: 'drivers', finding: 2 },

  // Size Effects (Findings 3, 4, 5)
  { id: 'size-effects', label: 'Size Relationships', icon: <Target className="w-4 h-4" />, category: 'size', finding: [3, 4, 5] },

  // Heterogeneity (Finding 6) - NEW prominent section
  { id: 'heterogeneity', label: 'Study Heterogeneity', icon: <AlertOctagon className="w-4 h-4" />, category: 'quality', finding: 6 },

  // Population Comparisons (Findings 7, 8)
  { id: 'populations', label: 'Natural vs Fragment', icon: <Users className="w-4 h-4" />, category: 'comparison', finding: [7, 8] },

  // Restoration Scenarios
  { id: 'scenarios', label: 'Restoration Scenarios', icon: <Sprout className="w-4 h-4" />, category: 'tools' },

  // Regional (Finding 10)
  { id: 'regional', label: 'Regional Variation', icon: <MapPin className="w-4 h-4" />, category: 'data', finding: 10 },

  // Evidence Quality (Findings 11-14)
  { id: 'evidence', label: 'Evidence Quality', icon: <BarChart3 className="w-4 h-4" />, category: 'data', finding: [11, 12, 13, 14] },

  // Research Priorities (Finding 15) - NEW
  { id: 'priorities', label: 'Research Priorities', icon: <Clock className="w-4 h-4" />, category: 'data', finding: 15 },

  // Download
  { id: 'download', label: 'Download Data', icon: <FileDown className="w-4 h-4" />, category: 'data' },
];

interface AnalysisSidebarProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export function AnalysisSidebar({ activeSection, onSectionClick }: AnalysisSidebarProps) {
  return (
    <nav
      className="sticky top-20 w-56 flex-shrink-0 hidden xl:block"
      aria-label="Analysis sections"
    >
      <div className="space-y-1">
        {ANALYSIS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left ${
                isActive
                  ? 'bg-[#0a3d62]/10 text-[#0a3d62] font-medium border-l-3 border-[#0a3d62]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className={isActive ? 'text-[#0a3d62]' : 'text-gray-400'}>
                {section.icon}
              </span>
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Hook to track which analysis section is currently visible via IntersectionObserver
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useScrollSpy(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Track visibility of each section
    const visibleSections = new Map<string, number>();

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visibleSections.set(id, entry.intersectionRatio);
            } else {
              visibleSections.delete(id);
            }

            // Find the most visible section (highest ratio, or first visible if tied)
            let bestSection = sectionIds[0];
            let bestRatio = 0;

            for (const sId of sectionIds) {
              const ratio = visibleSections.get(sId) || 0;
              if (ratio > bestRatio) {
                bestRatio = ratio;
                bestSection = sId;
              }
            }

            if (bestRatio > 0) {
              setActiveSection(bestSection);
            }
          });
        },
        {
          rootMargin: '-80px 0px -40% 0px',
          threshold: [0, 0.1, 0.3, 0.5],
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [sectionIds]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      // Update URL hash without triggering scroll
      window.history.replaceState(null, '', `#${sectionId}`);
    }
  }, []);

  return { activeSection, scrollToSection };
}
