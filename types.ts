
export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  WIDE = '21:9',
  STORIES = '9:16',
  VERTICAL = '4:5',
  LINKEDIN = '1.91:1', // Standard for link previews
}

export enum ImageResolution {
  ONE_K = '1K',
  TWO_K = '2K',
  FOUR_K = '4K',
}

export enum AppMode {
  GENERATOR = 'GENERATOR',
  ANALYZER = 'ANALYZER',
  EDITOR = 'EDITOR',
  LANDING_PAGE = 'LANDING_PAGE'
}

export interface CanvasImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CanvasZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface HistoryItem {
  id: string;
  thumbnail: string;
  fullImage: string;
  timestamp: number;
  prompt: string;
  mode?: AppMode;
}

// Bundle Types
export interface BundleItem {
  ratio: AspectRatio | number; // Enum or raw number for custom
  label: string;
  qty: number;
  width?: number; // Optional specific pixel width
  height?: number; // Optional specific pixel height
}

export interface BundleConfig {
  id: string;
  name: string;
  items: BundleItem[];
}
