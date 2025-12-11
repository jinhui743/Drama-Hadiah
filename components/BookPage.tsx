import React from 'react';
import { StoryPage } from '../types';
import { Loader2, Wand2, Sparkles } from 'lucide-react';

interface BookPagePartProps {
  pageData: StoryPage;
  imageUrl?: string;
  isGenerating: boolean;
  onGenerateImage?: () => void;
}

export const BookPageLeft: React.FC<BookPagePartProps> = ({ pageData, imageUrl, isGenerating, onGenerateImage }) => {
  return (
    <div className="w-full h-full relative bg-gray-100 border-r border-gray-300 overflow-hidden group select-none">
      <div className="absolute inset-0 shadow-[inset_-10px_0_20px_-5px_rgba(0,0,0,0.1)] z-10 pointer-events-none"></div>
      
      {imageUrl ? (
        <div className="w-full h-full relative">
          <img src={imageUrl} alt={`Illustration for page ${pageData.pageNumber}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 shadow-inner pointer-events-none mix-blend-multiply bg-[#fdfbf7] opacity-10"></div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-gray-500 p-12 text-center">
           <Sparkles className="w-12 h-12 mb-4 text-gray-300" />
           <p className="text-xs font-mono mb-6 opacity-50 line-clamp-4">{pageData.imagePrompt}</p>
           {onGenerateImage && (
             <button 
                onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-gray-50 rounded shadow-sm transition-all border border-gray-300 text-sm font-sans text-gray-700 z-20 cursor-pointer"
             >
               {isGenerating ? <Loader2 className="animate-spin w-4 h-4 text-blue-600" /> : <Wand2 className="w-4 h-4 text-purple-600" />}
               <span>Visualize with Gemini</span>
             </button>
           )}
        </div>
      )}
    </div>
  );
};

export const BookPageRight: React.FC<BookPagePartProps> = ({ pageData }) => {
  // Function to create Drop Cap
  const renderTextWithDropCap = (text: string) => {
    const firstChar = text.charAt(0);
    const restOfText = text.slice(1);

    return (
      <div className="relative leading-relaxed text-gray-800 text-justify">
        <span className="float-left text-7xl md:text-8xl font-serif leading-[0.8] pr-4 pt-2 text-ink font-bold">
          {firstChar}
        </span>
        {restOfText}
      </div>
    );
  };

  return (
    <div className="w-full h-full relative bg-paper p-6 md:p-10 flex flex-col select-none">
      <div className="absolute inset-0 shadow-[inset_10px_0_20px_-5px_rgba(0,0,0,0.1)] pointer-events-none z-10"></div>
      
      {/* Header */}
      <div className="flex justify-end mb-4 border-b border-transparent min-h-[1rem]">
      </div>

      {/* Content */}
      <div className="flex-grow font-serif text-2xl md:text-3xl text-ink overflow-y-auto custom-scroll pr-2 leading-relaxed">
         {renderTextWithDropCap(pageData.text)}
      </div>

      {/* Footer / Page Number */}
      <div className="mt-4 flex justify-end">
        <span className="font-serif text-gray-400 text-lg">{pageData.pageNumber}</span>
      </div>
    </div>
  );
};

interface BookPageProps extends BookPagePartProps {
  onGenerateImage: () => void;
}

const BookPage: React.FC<BookPageProps> = (props) => {
  return (
    <div className="flex w-full h-full bg-paper overflow-hidden relative shadow-2xl">
      <div className="w-1/2 h-full">
        <BookPageLeft {...props} />
      </div>
      <div className="w-1/2 h-full">
        <BookPageRight {...props} />
      </div>
      {/* Spine Shadow Center */}
      <div className="absolute left-1/2 top-0 bottom-0 w-16 -ml-8 bg-gradient-to-r from-transparent via-black/10 to-transparent pointer-events-none z-20 mix-blend-multiply opacity-60"></div>
    </div>
  );
};

export default BookPage;