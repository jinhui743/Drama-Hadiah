export interface StoryPage {
  id: number;
  text: string;
  imagePrompt: string;
  pageNumber: number;
}

export interface BookState {
  currentPageIndex: number; // -1 for cover, 0-7 for pages
  generatedImages: Record<number, string>; // Map page ID to image URL
  isGenerating: Record<number, boolean>; // Map page ID to loading state
}

export enum ViewMode {
  COVER = 'COVER',
  SPREAD = 'SPREAD',
}