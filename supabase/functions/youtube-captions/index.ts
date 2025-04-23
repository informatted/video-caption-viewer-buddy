
// Based on your working grab_captions_ui_debug.ts logic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const USER_AGENT = "Mozilla/5.0 (compatible; Deno)";

// Helper: extract video ID
function extractVideoId(url: string): string | null {
  const m = url.match(
    /^.*(?:youtu.be\/|v\/|\/u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/
  );
  const id = m && m[1].length === 11 ? m[1] : null;
  return id;
}

async function fetchCaptions(videoId: string): Promise<string> {
  const vidUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(vidUrl, { headers: { "User-Agent": USER_AGENT }});
  if (!res.ok) throw new Error(`Failed to load video page: ${res.status}`);
  const html = await res.text();

  // As in the sample: simpler regex
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!match) throw new Error("Could not find player response");
  const playerResp = JSON.parse(match[1]);
  const tracks = playerResp.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || !tracks.length) throw new Error("No captions");
  const track = tracks[0];
  const vttUrl = track.baseUrl + "&fmt=vtt";
  const vttRes = await fetch(vttUrl, { headers: { "User-Agent": USER_AGENT }});
  if (!vttRes.ok) throw new Error(`Failed to fetch VTT: ${vttRes.status}`);
  return await vttRes.text();
}

serve(async (req) => {
  // CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Accept both POST (Supabase default) and GET for debug
    let videoId: string | null = null;

    if (req.method === "POST") {
      const { videoId: vid } = await req.json();
      if (!vid) throw new Error("Missing videoId parameter");
      videoId = vid;
    } else if (req.method === "GET") {
      const urlObj = new URL(req.url);
      const videoUrl = urlObj.searchParams.get("videoUrl") || "";
      videoId = extractVideoId(videoUrl);
      if (!videoId) throw new Error("Invalid YouTube URL");
    } else {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // Fetch captions, may throw
    const vtt = await fetchCaptions(videoId);
    // Return VTT as text
    return new Response(vtt, {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
      status: 200,
    });
  } catch (e: any) {
    // Send error as plain text (to mirror your example)
    return new Response(e.message ?? "Unknown error", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
      status: 500,
    });
  }
});
