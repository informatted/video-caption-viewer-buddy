
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface Caption {
  start: number;
  end: number;
  text: string;
}

interface RequestBody {
  videoId: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json() as RequestBody;
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Missing videoId parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const VIDEO_URL = `https://www.youtube.com/watch?v=${videoId}`;

    // 1) Fetch the watch page HTML
    const res = await fetch(VIDEO_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Deno)" },
    });
    
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to load video page: ${res.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const html = await res.text();

    // 2) Extract ytInitialPlayerResponse JSON blob
    const jsonMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s
    );
    
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not find initial player response in HTML" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let playerResponse;
    try {
      playerResponse = JSON.parse(jsonMatch[1]);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Failed to parse player response JSON: ${err.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 3) Navigate to captionTracks
    const captionTracks =
      playerResponse.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;
        
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No captions available", captions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 4) Pick the first track
    const track = captionTracks[0];

    // 5) Build the URL and fetch VTT
    const vttUrl = `${track.baseUrl}&fmt=vtt`;
    const vttRes = await fetch(vttUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Deno)" },
    });
    
    if (!vttRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download captions: ${vttRes.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 6) Parse the WebVTT content
    const vtt = await vttRes.text();
    const captions = parseVTT(vtt);

    return new Response(
      JSON.stringify({ 
        captions,
        trackInfo: {
          name: track.name?.simpleText || track.languageCode,
          languageCode: track.languageCode,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/**
 * Parse WebVTT content into structured captions
 */
function parseVTT(vttContent: string): Caption[] {
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
