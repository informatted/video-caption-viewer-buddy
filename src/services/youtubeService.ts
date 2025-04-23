
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://xjvrqnfffokjfcdmshuk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnJxbmZmZm9ramZjZG1zaHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTYyNjIsImV4cCI6MjA2MDkzMjI2Mn0.E4lWCw-kibNViGUJlHXnoS-fQ1hZXxeohTbetsGXgpA';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Caption {
  start: number;
  end: number;
  text: string;
}

/**
 * Extracts the video ID from a YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11)
    ? match[2]
    : null;
}

/**
 * Fetch captions for a YouTube video
 */
export async function fetchYouTubeCaptions(videoId: string): Promise<Caption[]> {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-captions', {
      body: { videoId }
    });

    if (error) {
      console.error('Error fetching captions:', error);
      return [];
    }

    if (data.error || !data.captions || data.captions.length === 0) {
      console.warn('No captions available:', data.error);
      return [];
    }

    return data.captions;
  } catch (error) {
    console.error('Error fetching captions:', error);
    return [];
  }
}

/**
 * Parse WebVTT content into structured captions
 */
export function parseVTT(vttContent: string): Caption[] {
  if (!vttContent) return [];

  const vttLines = vttContent.split('\n');
  const captions: Caption[] = [];
  
  let index = 0;
  
  // Skip WebVTT header
  while (index < vttLines.length && !vttLines[index].includes('-->')) {
    index++;
  }
  
  while (index < vttLines.length) {
    const line = vttLines[index];
    
    if (line.includes('-->')) {
      const timeMatch = line.match(/(\d+):(\d+)\.(\d+)\s+-->\s+(\d+):(\d+)\.(\d+)/);
      
      if (timeMatch) {
        const startMinutes = parseInt(timeMatch[1]);
        const startSeconds = parseInt(timeMatch[2]);
        const startMillis = parseInt(timeMatch[3]);
        
        const endMinutes = parseInt(timeMatch[4]);
        const endSeconds = parseInt(timeMatch[5]);
        const endMillis = parseInt(timeMatch[6]);
        
        const start = startMinutes * 60 + startSeconds + startMillis / 1000;
        const end = endMinutes * 60 + endSeconds + endMillis / 1000;
        
        let text = '';
        index++;
        
        while (index < vttLines.length && vttLines[index].trim() !== '') {
          text += (text ? ' ' : '') + vttLines[index].trim();
          index++;
        }
        
        if (text) {
          captions.push({ start, end, text });
        }
      }
    }
    
    index++;
  }
  
  return captions;
}
