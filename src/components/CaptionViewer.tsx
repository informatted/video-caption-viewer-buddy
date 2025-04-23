
import { useEffect, useRef, useState } from 'react';

interface Caption {
  start: number;
  end: number;
  text: string;
}

interface CaptionViewerProps {
  captions: Caption[];
  currentTime: number;
}

export function CaptionViewer({ captions, currentTime }: CaptionViewerProps) {
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(-1);
  const captionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!captions.length) return;

    // Find the active caption based on current time
    const index = captions.findIndex(
      (caption) => currentTime >= caption.start && currentTime <= caption.end
    );

    if (index !== activeCaptionIndex) {
      setActiveCaptionIndex(index);
      
      // Scroll to the active caption
      if (index !== -1 && captionsRef.current) {
        const captionElements = captionsRef.current.querySelectorAll('.caption-item');
        if (captionElements[index]) {
          captionElements[index].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }
  }, [currentTime, captions, activeCaptionIndex]);

  if (!captions.length) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-600">No captions available for this video.</p>
      </div>
    );
  }

  return (
    <div 
      ref={captionsRef}
      className="mt-4 p-4 bg-white rounded-lg shadow-md h-64 overflow-y-auto"
    >
      <h2 className="text-xl font-semibold mb-3">Captions</h2>
      <div className="space-y-2">
        {captions.map((caption, index) => (
          <div
            key={index}
            className={`caption-item p-2 rounded-md ${
              index === activeCaptionIndex
                ? 'bg-blue-100 border-l-4 border-blue-500'
                : 'bg-gray-50'
            }`}
          >
            <p className="text-sm text-gray-500">
              {formatTime(caption.start)} - {formatTime(caption.end)}
            </p>
            <p className="text-md">{caption.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
