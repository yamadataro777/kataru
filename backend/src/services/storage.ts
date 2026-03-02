import { supabase } from './supabase';

const BUCKET = 'audio';

export async function uploadAudio(
  sessionId: string,
  audioBuffer: Buffer,
  mimeType: string
) {
  const ext = mimeType.includes('webm') ? 'webm'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('wav') ? 'wav'
    : 'webm';

  const filePath = `${sessionId}/audio.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, audioBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return { publicUrl: urlData.publicUrl, filePath };
}

export async function deleteAudio(filePath: string) {
  if (!filePath) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) throw error;
}
