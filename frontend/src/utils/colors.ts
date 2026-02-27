import { DataType } from '../types';

// Data type colors for visualizations
export const DATA_TYPE_COLORS: Record<DataType, string> = {
  field: '#264653',
  nursery_in: '#2a9d8f',
  nursery_ex: '#e9c46a',
};

// Region color palette
export const REGION_COLORS: Record<string, string> = {
  'Florida': '#264653',
  'USVI': '#2a9d8f',
  'Puerto Rico': '#e9c46a',
  'Curacao': '#f4a261',
  'Jamaica': '#e07a5f',
  'Mexico': '#9d0208',
  'Bahamas': '#457b9d',
  'BVI': '#a8dadc',
  'Dominican Republic': '#bc6c25',
};

// Size class colors (sequential blue scale)
export const SIZE_CLASS_COLORS: Record<string, string> = {
  'SC1': '#caf0f8',
  'SC2': '#90e0ef',
  'SC3': '#00b4d8',
  'SC4': '#0077b6',
  'SC5': '#03045e',
};

// Survival color scale
export function getSurvivalColor(rate: number): string {
  if (rate < 0.3) return '#d62828';
  if (rate < 0.5) return '#f77f00';
  if (rate < 0.7) return '#fcbf49';
  return '#2a9d8f';
}

// Growth color scale (diverging)
export function getGrowthColor(rate: number): string {
  if (rate < -50) return '#d62828';
  if (rate < -10) return '#f4a261';
  if (rate < 10) return '#faf8f5';
  if (rate < 50) return '#90e0ef';
  return '#0077b6';
}

// D3 color scales
export const SEQUENTIAL_OCEAN = ['#caf0f8', '#90e0ef', '#00b4d8', '#0077b6', '#03045e'];
export const SEQUENTIAL_CORAL = ['#fff3e6', '#fcd5ce', '#f4a261', '#e07a5f', '#9d0208'];
export const DIVERGING_GROWTH = ['#d62828', '#f4a261', '#faf8f5', '#90e0ef', '#0077b6'];
export const CATEGORICAL_REGIONS = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e07a5f', '#9d0208'];

// Generate D3-compatible color scale
export function createColorScale(domain: [number, number], colors: string[]) {
  const [min, max] = domain;
  const step = (max - min) / (colors.length - 1);
  return (value: number): string => {
    const index = Math.min(
      Math.floor((value - min) / step),
      colors.length - 1
    );
    return colors[Math.max(0, index)];
  };
}

// Interpolate between colors for smooth gradients
export function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
