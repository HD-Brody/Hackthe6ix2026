const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9"; // Default: Jessica (Playful, Bright, Warm)

/**
 * Converts text to speech using ElevenLabs API (Server-side helper).
 * 
 * @param text The text to synthesize into speech.
 * @returns A promise resolving to a Buffer containing the raw MP3 audio data.
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set in the environment variables.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
