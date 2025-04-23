
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhsvgjyawlepaqhgpguf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoc3Znanlhd2xlcGFxaGdwZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNjkwOTQsImV4cCI6MjA2MDk0NTA5NH0.FF0caJe6TB5wWpRW1eIhW5MB12W1_RMe-3sAm-Uxe_w';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  const m = url.match(/^.*(?:youtu.be\/|v\/|\/u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
  const id = m && m[1].length === 11 ? m[1] : null;
  return id;
}

export async function fetchYouTubeCaptions(videoId: string): Promise<Caption[]> {
  try {
    console.log(`Fetching captions VTT for video ID: ${videoId}`);
    const { data, error } = await supabase.functions.invoke(
      'youtube-captions',
      {
        body: { videoId },
        responseType: 'text',    // Explicitly request text response
      }
    );

    if (error) {
      console.error('Error fetching captions VTT:', error);
      return [];
    }

    // Ensure data is a string before parsing
    if (typeof data !== "string") {
      console.warn('Response is not a string VTT data');
      return [];
    }

    // Parse the VTT here on the frontend
    return parseVTT(data);
  } catch (error) {
    console.error('Error fetching captions:', error);
    return [];
  }
}

// VTT to Caption[]
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
      // Match timestamps like 00:00.000 --> 00:02.420
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
