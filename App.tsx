import React, { useState, useCallback, useEffect, useRef } from 'react';
import { STORY_PAGES, COVER_IMAGE_PROMPT } from './constants';
import BookCover from './components/BookCover';
import BookPage, { BookPageLeft, BookPageRight } from './components/BookPage';
import { generateImage } from './services/geminiService';
import { loadImagesFromDB, saveImageToDB } from './services/storageService';
import { ChevronLeft, ChevronRight, Info, Volume2, Square, Settings, Check, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// A single Leaf in the 3D book structure
// Front is visible when leaf is on the Right (Angle 0)
// Back is visible when leaf is on the Left (Angle -180)
const TurningLeaf: React.FC<{
  front: React.ReactNode;
  back: React.ReactNode;
  angle: number;
  zIndex: number;
  isMoving: boolean;
}> = ({ front, back, angle, zIndex, isMoving }) => {
  return (
    <div 
      className="absolute top-0 right-0 w-1/2 h-full origin-left preserve-3d will-change-transform shadow-spine"
      style={{ 
        transform: `rotateY(${angle}deg)`, 
        zIndex,
        transition: isMoving ? 'transform 1000ms ease-in-out' : 'none'
      }}
    >
      {/* Front Face */}
      <div className="absolute inset-0 w-full h-full backface-hidden z-10 bg-paper">
        {front}
        {/* Dynamic lighting overlay for Front */}
        <div 
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000" 
          style={{ opacity: angle < -90 ? 0.4 : 0 }} 
        />
      </div>

      {/* Back Face */}
      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-paper">
        {back}
         {/* Dynamic lighting overlay for Back */}
         <div 
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000" 
          style={{ opacity: angle > -90 ? 0.4 : 0 }} 
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState<Record<number, boolean>>({});

  // PDF State
  const [isDownloading, setIsDownloading] = useState(false);

  // Animation State
  const [isFlipping, setIsFlipping] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [flipRotation, setFlipRotation] = useState(0); 
  const [animationTargetIndex, setAnimationTargetIndex] = useState<number>(-1);

  // Reading Mode State
  const [isReading, setIsReading] = useState(false);
  
  // Voice / TTS State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load Saved Images on Mount
  useEffect(() => {
    loadImagesFromDB().then(savedImages => {
      if (Object.keys(savedImages).length > 0) {
        setGeneratedImages(prev => ({ ...prev, ...savedImages }));
      }
    });
  }, []);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      
      // Sort voices: Put Chinese voices first, then English, then others
      available.sort((a, b) => {
        const aZh = a.lang.toLowerCase().includes('zh');
        const bZh = b.lang.toLowerCase().includes('zh');
        if (aZh && !bZh) return -1;
        if (!aZh && bZh) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(available);
      
      // Default selection logic if not set
      if (!selectedVoiceName && available.length > 0) {
        // Prefer Chinese voices given the content
        const zhVoice = available.find(v => v.lang.toLowerCase().includes('zh'));
        setSelectedVoiceName(zhVoice ? zhVoice.name : available[0].name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceName]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowVoiceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateImage = useCallback(async (pageIndex: number, prompt: string) => {
    if (isGenerating[pageIndex]) return;
    setIsGenerating(prev => ({ ...prev, [pageIndex]: true }));
    const imageUrl = await generateImage(prompt);
    if (imageUrl) {
      setGeneratedImages(prev => ({ ...prev, [pageIndex]: imageUrl }));
      saveImageToDB(pageIndex, imageUrl);
    } else {
      console.log("Using fallback image.");
      const fallbackUrl = `https://picsum.photos/seed/${pageIndex + 100}/1024/1024`;
      setGeneratedImages(prev => ({ ...prev, [pageIndex]: fallbackUrl }));
    }
    setIsGenerating(prev => ({ ...prev, [pageIndex]: false }));
  }, [isGenerating]);

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      // 3:2 aspect ratio landscape -> let's use 1200x800 for high quality
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1200, 800],
        hotfixes: ['px_scaling']
      });

      // 1. Capture Cover
      const coverEl = document.getElementById('print-cover');
      if (coverEl) {
        const canvas = await html2canvas(coverEl, {
          scale: 1, // Capture at 1:1 since the element size matches PDF size
          useCORS: true,
          logging: false,
          backgroundColor: null
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(imgData, 'JPEG', 0, 0, 1200, 800);
      }

      // 2. Capture Pages
      for (let i = 0; i < STORY_PAGES.length; i++) {
        const pageEl = document.getElementById(`print-page-${STORY_PAGES[i].id}`);
        if (pageEl) {
          pdf.addPage([1200, 800], 'landscape');
          const canvas = await html2canvas(pageEl, {
            scale: 1,
            useCORS: true,
            logging: false,
            backgroundColor: null
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          pdf.addImage(imgData, 'JPEG', 0, 0, 1200, 800);
        }
      }

      pdf.save('Hadiah-Storybook.pdf');
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const triggerFlip = useCallback((newIndex: number) => {
    if (isFlipping || newIndex === currentPageIndex) return;

    const dir = newIndex > currentPageIndex ? 'next' : 'prev';
    setDirection(dir);
    setAnimationTargetIndex(newIndex);
    setIsFlipping(true);

    const startAngle = dir === 'next' ? 0 : -180;
    const endAngle = dir === 'next' ? -180 : 0;

    setFlipRotation(startAngle);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlipRotation(endAngle);
      });
    });

    setTimeout(() => {
      setCurrentPageIndex(newIndex);
      setIsFlipping(false);
      setDirection(null);
      setFlipRotation(0);
    }, 1000);
  }, [isFlipping, currentPageIndex]);

  const nextPage = useCallback(() => {
    if (currentPageIndex < STORY_PAGES.length - 1) {
      triggerFlip(currentPageIndex + 1);
    }
  }, [currentPageIndex, triggerFlip]);

  const prevPage = useCallback(() => {
    if (currentPageIndex > -1) {
      triggerFlip(currentPageIndex - 1);
    }
  }, [currentPageIndex, triggerFlip]);

  const toggleReading = () => {
    if (isReading) {
      setIsReading(false);
      window.speechSynthesis.cancel();
    } else {
      setIsReading(true);
      if (currentPageIndex === -1 && !isFlipping) {
        nextPage();
      }
    }
  };

  // Effect for Text-to-Speech
  useEffect(() => {
    const synth = window.speechSynthesis;

    // Stop speech if we are not reading or if a page flip is currently happening
    if (!isReading || isFlipping) {
      synth.cancel();
      return;
    }

    if (currentPageIndex === -1) return;

    const pageData = STORY_PAGES[currentPageIndex];
    if (!pageData) return;

    // Delay speech slightly to allow the visual page turn to settle
    const timeoutId = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(pageData.text);
      
      // Voice selection logic
      const voice = voices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        // Fallback default
        utterance.lang = 'zh-CN';
      }
      
      utterance.rate = 1.0; 

      utterance.onend = () => {
        // Automatically turn page if reading mode is active and not at the end
        if (currentPageIndex < STORY_PAGES.length - 1) {
             nextPage();
        } else {
             // Finished reading the book
             setIsReading(false);
        }
      };

      utterance.onerror = (e) => {
         console.warn("Speech synthesis error or interruption:", e);
      };

      synth.speak(utterance);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      synth.cancel();
    };
  }, [isReading, isFlipping, currentPageIndex, nextPage, voices, selectedVoiceName]);


  // Helper to get component for a specific page index and side
  const getPageContent = (index: number, side: 'left' | 'right' | 'cover') => {
    if (index === -1) {
      if (side === 'cover') {
         return (
           <BookCover 
             onOpen={nextPage} 
             imageUrl={generatedImages[-1]}
             isGenerating={!!isGenerating[-1]}
             onGenerateCover={() => handleGenerateImage(-1, COVER_IMAGE_PROMPT)}
           />
         );
      }
      return <div className="w-full h-full bg-transparent" />; // Empty left side when cover is closed
    }

    const pageData = STORY_PAGES[index];
    if (!pageData) return <div className="w-full h-full bg-paper" />;

    if (side === 'left') {
      return (
        <BookPageLeft 
          pageData={pageData}
          imageUrl={generatedImages[index]}
          isGenerating={!!isGenerating[index]}
          onGenerateImage={() => handleGenerateImage(index, pageData.imagePrompt)}
        />
      );
    } else {
      return (
        <BookPageRight 
           pageData={pageData}
           isGenerating={false}
        />
      );
    }
  };

  // --------------------------------------------------------------------------
  // Render Logic for Layers
  // --------------------------------------------------------------------------
  
  let leftStaticContent: React.ReactNode = null;
  let rightStaticContent: React.ReactNode = null;
  let leafFrontContent: React.ReactNode = null;
  let leafBackContent: React.ReactNode = null;
  
  if (isFlipping && direction === 'next') {
    const baseIndex = currentPageIndex;
    const nextIndex = animationTargetIndex; 

    leftStaticContent = getPageContent(baseIndex, baseIndex === -1 ? 'left' : 'left');
    rightStaticContent = getPageContent(nextIndex, 'right');

    if (baseIndex === -1) {
       leafFrontContent = getPageContent(-1, 'cover');
       leafBackContent = getPageContent(0, 'left');
    } else {
       leafFrontContent = getPageContent(baseIndex, 'right');
       leafBackContent = getPageContent(nextIndex, 'left');
    }

  } else if (isFlipping && direction === 'prev') {
    const baseIndex = currentPageIndex;     
    const prevIndex = animationTargetIndex; 

    leftStaticContent = getPageContent(prevIndex, prevIndex === -1 ? 'left' : 'left');
    rightStaticContent = getPageContent(baseIndex, 'right');

    if (prevIndex === -1) {
       leafFrontContent = getPageContent(-1, 'cover');
       leafBackContent = getPageContent(0, 'left');
    } else {
       leafFrontContent = getPageContent(prevIndex, 'right');
       leafBackContent = getPageContent(baseIndex, 'left');
    }

  } else {
    if (currentPageIndex === -1) {
       leftStaticContent = null;
       rightStaticContent = getPageContent(0, 'right');
       leafFrontContent = getPageContent(-1, 'cover');
       leafBackContent = getPageContent(0, 'left');
    } else {
       leftStaticContent = getPageContent(currentPageIndex, 'left');
       rightStaticContent = getPageContent(currentPageIndex, 'right');
    }
  }

  const containerShift = (currentPageIndex === -1 && !isFlipping) ? 'translate-x-[-25%] md:translate-x-[-25%]' : 'translate-x-0';

  return (
    <div className="min-h-screen bg-[#222] flex items-center justify-center py-8 px-4 overflow-hidden relative">
      
      {/* 3D Scene Container */}
      <div 
        className={`relative transition-transform duration-1000 ease-in-out ${containerShift} perspective-2000`}
        style={{ width: '100%', maxWidth: '1024px', aspectRatio: '3/2' }}
      >
        <div className="w-full h-full relative preserve-3d">
            
            {/* Left Static Base */}
            <div className="absolute top-0 left-0 w-1/2 h-full z-0 flex justify-end">
              {leftStaticContent}
            </div>

            {/* Right Static Base */}
            <div className="absolute top-0 right-0 w-1/2 h-full z-0 flex justify-start">
              {rightStaticContent}
            </div>

            {/* Dynamic Leaf */}
            { (isFlipping || currentPageIndex === -1) && (
              <TurningLeaf 
                front={leafFrontContent}
                back={leafBackContent}
                angle={isFlipping ? flipRotation : (currentPageIndex === -1 ? 0 : -180)}
                zIndex={50}
                isMoving={isFlipping}
              />
            )}
            
            {/* Spine Shadow / Center Fold Visual */}
            {currentPageIndex > -1 && !isFlipping && (
               <div className="absolute left-1/2 top-0 bottom-0 w-16 -ml-8 bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none z-40 mix-blend-multiply opacity-40"></div>
            )}

        </div>

        {/* Navigation Controls */}
        <div className={`absolute top-1/2 w-full flex justify-between px-4 pointer-events-none z-50 transition-opacity duration-300 ${isFlipping ? 'opacity-0' : 'opacity-100'}`}>
           <button 
              onClick={(e) => { e.stopPropagation(); prevPage(); }}
              disabled={currentPageIndex === -1 || isFlipping}
              className={`pointer-events-auto p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all ${currentPageIndex === -1 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
              style={{ transform: 'translateX(-150%)' }}
            >
              <ChevronLeft size={32} />
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); nextPage(); }}
              disabled={currentPageIndex === STORY_PAGES.length - 1 || isFlipping}
              className={`pointer-events-auto p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all ${currentPageIndex === STORY_PAGES.length - 1 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
              style={{ transform: 'translateX(150%)' }}
            >
              <ChevronRight size={32} />
            </button>
        </div>
      </div>

      {/* Read Aloud Control Bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-end gap-3 z-[60] pointer-events-none">
        
        {/* Voice Settings */}
        <div className="relative pointer-events-auto" ref={menuRef}>
          <div className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom ${showVoiceMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
             <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
               <h3 className="text-xs font-sans font-bold text-gray-400 uppercase tracking-wider">Voice Selection</h3>
               <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{voices.length} available</span>
             </div>
             <div className="max-h-64 overflow-y-auto custom-scroll p-2">
               {voices.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No voices detected.<br/>Check your browser settings.</div>}
               {voices.map((voice) => {
                 const isRecommended = voice.lang.toLowerCase().includes('zh');
                 return (
                   <button
                     key={voice.name}
                     onClick={() => {
                       setSelectedVoiceName(voice.name);
                       setShowVoiceMenu(false);
                       // If reading, restart to apply new voice immediately
                       if (isReading) {
                         window.speechSynthesis.cancel();
                         // Short timeout to allow cancel to take effect before restart loop picks it up
                         setTimeout(() => {}, 50);
                       }
                     }}
                     className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm transition-colors mb-1 ${selectedVoiceName === voice.name ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                   >
                     <div className="flex flex-col overflow-hidden">
                       <span className="truncate font-medium flex items-center gap-2">
                         {voice.name}
                         {isRecommended && <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 rounded border border-rose-500/30">ZH</span>}
                       </span>
                       <span className="text-[10px] opacity-60">{voice.lang} {voice.localService ? '(Local)' : '(Network)'}</span>
                     </div>
                     {selectedVoiceName === voice.name && <Check className="w-4 h-4 flex-shrink-0 text-green-400 ml-2" />}
                   </button>
                 );
               })}
             </div>
          </div>

          <button 
            onClick={() => setShowVoiceMenu(!showVoiceMenu)}
            className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 bg-white/10 text-white border-white/20 hover:bg-white/20 active:scale-95 hover:scale-105"
            title="Voice Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Main Read Toggle */}
        <button 
          onClick={toggleReading}
          className={`pointer-events-auto flex items-center gap-3 px-6 py-3 h-12 rounded-full shadow-2xl backdrop-blur-md border transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isReading 
              ? 'bg-rose-600/90 text-white border-rose-500 hover:bg-rose-700' 
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
          }`}
        >
          {isReading ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-5 h-5" />}
          <span className="font-serif font-medium tracking-wide whitespace-nowrap">
            {isReading ? 'Stop' : 'Read Story'}
          </span>
        </button>

        {/* PDF Download Button */}
        <button 
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 ${
            isDownloading 
              ? 'bg-white/5 text-gray-400 border-white/10 cursor-not-allowed' 
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95'
          }`}
          title="Download as PDF"
        >
          {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        </button>

      </div>

      {/* API Key Info */}
      <div className="fixed top-4 right-4 group z-[60]">
        <button className="p-2 bg-gray-800 text-gray-400 rounded-full hover:bg-gray-700 transition-colors">
           <Info size={20} />
        </button>
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 p-4 rounded-lg shadow-xl text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-gray-700">
          <p className="mb-2">
            <strong>Gemini API Integration:</strong>
          </p>
          <p>
            This app requires a valid API Key in <code>process.env.API_KEY</code> to generate images.
          </p>
        </div>
      </div>

      {/* Hidden Render Area for PDF Generation */}
      {/* We render all pages here but hide them off-screen. This allows html2canvas to capture them. */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, opacity: 0, pointerEvents: 'none' }}>
        
        {/* Cover for Print */}
        <div id="print-cover" style={{ width: '1200px', height: '800px' }}>
           <BookCover 
             onOpen={() => {}} 
             imageUrl={generatedImages[-1]} 
             isGenerating={false} 
             onGenerateCover={() => {}}
           />
        </div>

        {/* Pages for Print */}
        {STORY_PAGES.map((page, index) => (
           <div key={page.id} id={`print-page-${page.id}`} style={{ width: '1200px', height: '800px' }}>
              <BookPage 
                pageData={page}
                imageUrl={generatedImages[index]}
                isGenerating={false}
                onGenerateImage={() => {}}
              />
           </div>
        ))}
      </div>

    </div>
  );
};

export default App;