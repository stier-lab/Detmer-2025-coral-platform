import { DataType } from './coral';

export interface FilterState {
  regions: string[];
  dataTypes: DataType[];
  studies: string[];
  yearRange: [number, number];
  sizeRange: [number, number];
  sizeClasses: string[];
  fragmentStatus: 'all' | 'Y' | 'N';
  disturbance: 'all' | 'none' | 'storm' | 'MHW' | 'disease';
  depthRange: [number, number] | null;
}

export const defaultFilters: FilterState = {
  regions: [],
  dataTypes: ['field', 'nursery_in', 'nursery_ex'],
  studies: [],
  yearRange: [2000, 2025],
  sizeRange: [0, 10000],
  sizeClasses: ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'],
  fragmentStatus: 'all',
  disturbance: 'all',
  depthRange: null,
};

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}
