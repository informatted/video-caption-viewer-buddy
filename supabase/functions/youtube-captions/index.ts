// supabase/functions/captions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const USER_AGENT = "Mozilla/5.0 (compatible; Deno)";

function extractVideoId(url: string): string | null {
  console.log("🛠 extractVideoId from:", url);
  const m = url.match(
    /^.*(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]+).*/i
  );
  const id = m && m[1].length === 11 ? m[1] : null;
  console.log("🛠 got videoId =", id);
  return id;
}

async function fetchCaptions(videoId: string): Promise<string> {
  console.log("🔍 fetchCaptions for ID:", videoId);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, { headers: { "User-Agent": USER_AGENT } });
  console.log("➡️  YouTube page status:", res.status);
  if (!res.ok) throw new Error(`YouTube page load failed: ${res.status}`);
  const html = await res.text();

  // match everything up to the semicolon that ends the JSON assignment
  const jsonMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*([\s\S]+?})\s*;/  
  );
  if (!jsonMatch) throw new Error("Could not find ytInitialPlayerResponse");
  let player;
  try {
    player = JSON.parse(jsonMatch[1]);
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    throw new Error("Failed to parse player JSON");
  }

  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  const track = tracks[0];
  console.log("🔤 using track:", track.name?.simpleText || track.languageCode);
  const vttUrl = track.baseUrl + "&fmt=vtt";
  console.log("📥 download VTT from:", vttUrl);

  const vttRes = await fetch(vttUrl, { headers: { "User-Agent": USER_AGENT } });
  console.log("➡️  VTT fetch status:", vttRes.status);
  if (!vttRes.ok) throw new Error(`VTT download failed: ${vttRes.status}`);

  return await vttRes.text();
}

serve(async (req) => {
  console.log("➡️  Incoming request:", req.method, req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let videoId: string | null = null;

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      console.log("📬 POST body:", body);

      if (typeof body.videoUrl === "string") {
        videoId = extractVideoId(body.videoUrl);
        if (!videoId) throw new Error("Invalid YouTube URL in POST body");
      } else if (typeof body.videoId === "string") {
        videoId = body.videoId;
      } else {
        throw new Error("POST JSON must include { videoUrl: string }");
      }

    } else if (req.method === "GET") {
      const urlObj = new URL(req.url);
      const raw = urlObj.searchParams.get("videoUrl") ?? "";
      console.log("🔗 GET videoUrl param:", raw);
      videoId = extractVideoId(raw);
      if (!videoId) throw new Error("Missing or invalid videoUrl query param");

    } else {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    console.log("✅ Resolved videoId:", videoId);
    const captions = await fetchCaptions(videoId);
    return new Response(captions, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });

  } catch (err: any) {
    console.error("⚠️  Handler error:", err.message);
    return new Response(err.message, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
