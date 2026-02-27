import { useEffect, useState, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { SiteLocation } from '../../types';
import { getSurvivalColor, REGION_COLORS } from '../../utils/colors';
import { formatPercent, formatNumber, formatGrowthRate } from '../../utils/formatters';
import { Card } from '../common/Card';
import { SkeletonMap } from '../common/Skeleton';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  sites: SiteLocation[];
  selectedSite?: string | null;
  onSiteSelect?: (siteId: string) => void;
  colorMetric?: 'survival' | 'growth' | 'sample_size' | 'region';
  height?: number;
  isLoading?: boolean;
}

const CARIBBEAN_CENTER: [number, number] = [18.5, -75];
const CARIBBEAN_ZOOM = 5;

function getMarkerColor(site: SiteLocation, metric: string): string {
  if (metric === 'survival') {
    return getSurvivalColor(site.survival_rate ?? 0.5);
  }
  if (metric === 'region') {
    return REGION_COLORS[site.region] || '#94a3b8';
  }
  if (metric === 'sample_size') {
    const n = site.total_observations;
    if (n < 50) return '#adb5bd';
    if (n < 200) return '#2e86ab';
    return '#0a3d62';
  }
  // growth
  const growth = site.mean_growth ?? 0;
  if (growth < -10) return '#d62828';
  if (growth < 10) return '#f4a261';
  return '#2a9d8f';
}

function getMarkerRadius(n: number): number {
  return Math.max(6, Math.min(25, Math.sqrt(n) * 1.2));
}

// Component to fit bounds
function FitBounds({ sites }: { sites: SiteLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length === 0) return;

    const latLngs = sites.map((s) => [s.latitude, -Math.abs(s.longitude)] as [number, number]);
    if (latLngs.length > 0) {
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

      for (const [lat, lng] of latLngs) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }

      map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [50, 50] });
    }
  }, [sites, map]);

  return null;
}

function MapViewComponent({
  sites,
  selectedSite,
  onSiteSelect,
  colorMetric = 'survival',
  height = 600,
  isLoading = false,
}: MapViewProps) {
  const [activeMetric, setActiveMetric] = useState(colorMetric);

  // Show skeleton when loading
  if (isLoading) {
    return <SkeletonMap height={height} />;
  }

  return (
    <Card padding="none" className="relative overflow-hidden">

      {/* Metric selector */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-2">
        <div className="text-xs text-text-muted mb-2">Color by:</div>
        <div className="flex flex-col gap-1">
          {(['survival', 'region', 'sample_size'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeMetric === metric
                  ? 'bg-ocean-mid text-white'
                  : 'bg-sand-light text-text-secondary hover:bg-sand-warm'
              }`}
            >
              {metric === 'survival'
                ? 'Survival Rate'
                : metric === 'sample_size'
                ? 'Sample Size'
                : 'Region'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full">
        <MapContainer
          center={CARIBBEAN_CENTER}
          zoom={CARIBBEAN_ZOOM}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <FitBounds sites={sites} />

          {sites.map((site) => (
            <CircleMarker
              key={site.site_id}
              center={[site.latitude, -Math.abs(site.longitude)]}
              radius={getMarkerRadius(site.total_observations)}
              pathOptions={{
                color: selectedSite === site.site_id ? '#0a3d62' : 'white',
                weight: selectedSite === site.site_id ? 3 : 1.5,
                fillColor: getMarkerColor(site, activeMetric),
                fillOpacity: 0.85,
              }}
              eventHandlers={{
                click: () => onSiteSelect?.(site.site_id),
              }}
            >
              <Popup>
                <div className="min-w-[220px] p-3">
                  <h3 className="font-semibold text-ocean-deep text-lg mb-1">
                    {site.name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-3 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: REGION_COLORS[site.region] }}
                    />
                    {site.region}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-text-muted block text-xs">Observations</span>
                      <span className="font-mono font-semibold text-ocean-deep">
                        {formatNumber(site.total_observations)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Survival</span>
                      <span
                        className="font-mono font-semibold"
                        style={{ color: getSurvivalColor(site.survival_rate ?? 0) }}
                      >
                        {site.survival_rate
                          ? formatPercent(site.survival_rate)
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Avg Growth</span>
                      <span className="font-mono font-semibold text-ocean-deep">
                        {site.mean_growth
                          ? formatGrowthRate(site.mean_growth)
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Depth</span>
                      <span className="font-mono font-semibold text-ocean-deep">
                        {site.depth_m ? `${site.depth_m.toFixed(1)}m` : '—'}
                      </span>
                    </div>
                  </div>

                  {site.studies && (
                    <div className="mt-3 pt-3 border-t border-border-light">
                      <span className="text-xs text-text-muted block mb-1.5">Studies:</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // Handle both string and array formats
                          const studies = site.studies as string[] | string | undefined;
                          const studiesArray: string[] = Array.isArray(studies)
                            ? studies
                            : typeof studies === 'string'
                              ? studies.split(', ').filter(Boolean)
                              : [];
                          return (
                            <>
                              {studiesArray.slice(0, 3).map((study: string) => (
                                <span
                                  key={study}
                                  className="text-xs bg-sand-warm px-2 py-0.5 rounded"
                                >
                                  {study}
                                </span>
                              ))}
                              {studiesArray.length > 3 && (
                                <span className="text-xs text-text-muted">
                                  +{studiesArray.length - 3} more
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3">
        <div className="text-xs text-text-muted mb-2">
          {activeMetric === 'survival'
            ? 'Survival Rate'
            : activeMetric === 'sample_size'
            ? 'Sample Size'
            : 'Region'}
        </div>
        {activeMetric === 'survival' && (
          <div className="flex flex-col gap-1">
            {[
              { color: '#2a9d8f', label: '>70%' },
              { color: '#fcbf49', label: '50-70%' },
              { color: '#f77f00', label: '30-50%' },
              { color: '#d62828', label: '<30%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
        {activeMetric === 'region' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(REGION_COLORS).slice(0, 6).map(([region, color]) => (
              <div key={region} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{region}</span>
              </div>
            ))}
          </div>
        )}
        {activeMetric === 'sample_size' && (
          <div className="flex flex-col gap-1">
            {[
              { color: '#0a3d62', label: '>200 obs' },
              { color: '#2e86ab', label: '50-200' },
              { color: '#adb5bd', label: '<50' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export const MapView = memo(MapViewComponent);
