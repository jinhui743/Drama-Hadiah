import React from 'react';
import { STORY_TITLE, COVER_IMAGE_PROMPT } from '../constants';
import { Loader2, Wand2 } from 'lucide-react';

interface BookCoverProps {
  onOpen: () => void;
  imageUrl?: string;
  isGenerating: boolean;
  onGenerateCover: () => void;
}

const BookCover: React.FC<BookCoverProps> = ({ onOpen, imageUrl, isGenerating, onGenerateCover }) => {
  return (
    <div className="w-full h-full bg-paper-dark relative flex flex-col shadow-inner overflow-hidden group">
      {/* Binding effect left */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-400 to-transparent z-20 opacity-50"></div>
      <div className="absolute left-1 top-0 bottom-0 w-1 bg-white/20 z-20"></div>

      {/* Top Section: Image */}
      <div className="h-3/4 w-full relative bg-gray-800 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-[2000ms]" 
          />
        ) : (
           <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-gray-300 p-8 text-center">
             <p className="mb-4 text-sm opacity-60 font-serif italic">{COVER_IMAGE_PROMPT.substring(0, 100)}...</p>
             <button 
                onClick={(e) => { e.stopPropagation(); onGenerateCover(); }}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all border border-white/20"
             >
               {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
               <span className="text-sm">Generate Cover with Gemini</span>
             </button>
           </div>
        )}
        
        {/* Overlay Gradient/Texture for book feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')]"></div>
      </div>

      {/* Bottom Section: Title */}
      <div className="h-1/4 w-full bg-white flex flex-col items-center justify-center p-6 relative">
         <div className="absolute top-0 left-0 w-full h-1 bg-yellow-600/30"></div>
         
         <h1 className="font-serif text-3xl md:text-4xl text-ink font-bold tracking-wide text-center mb-2">
           {STORY_TITLE}
         </h1>

         <button 
           onClick={onOpen}
           className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-400 hover:text-gray-800 transition-colors animate-pulse"
         >
           点击打开 (Click to Open)
         </button>
      </div>

      {/* Hardcover thickness effect on right */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300 border-l border-gray-400"></div>
      <div className="absolute right-[1px] top-0 bottom-0 w-[2px] bg-gray-500"></div>
      
      {/* Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default BookCover;