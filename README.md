
# YouTube Caption Viewer

A web application that displays YouTube videos along with their captions. The captions are synchronized with the video playback and highlighted as the video plays.

## Features

- Extract and display captions from YouTube videos
- Embedded YouTube player
- Synchronized caption highlighting
- Playback controls
- Mobile-responsive design

## Setup Instructions

### 1. Setup Supabase for Caption Fetching

This application uses a Supabase Edge Function to fetch YouTube captions. To set it up:

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your Supabase project:
   ```bash
   supabase login
   supabase link --project-ref xjvrqnfffokjfcdmshuk
   ```

3. Deploy the edge function:
   ```bash
   supabase functions deploy youtube-captions --no-verify-jwt
   ```

### 2. Run the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to: `http://localhost:8080`

## How to Use

1. Enter a YouTube video URL in the input field
2. Click "Load Video & Captions"
3. The video will load and captions will be displayed below it
4. Captions will be highlighted as the video plays

## Technical Details

- Built with React, TypeScript, and Tailwind CSS
- Uses Supabase Edge Functions to handle CORS and fetch YouTube captions
- Captions are extracted and parsed from the YouTube video page

## Note on Captions Availability

Not all YouTube videos have captions available. If a video doesn't have captions, the application will display a message indicating that no captions are available for the video.
