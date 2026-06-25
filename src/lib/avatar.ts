import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

// Ouvre la galerie, téléverse l'image dans le bucket `avatars` sous le dossier
// de l'utilisateur, et renvoie l'URL publique. Renvoie null si annulé.
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const arrayBuffer = await fetch(asset.uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, {
      contentType: asset.mimeType ?? `image/${ext}`,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-buster pour rafraîchir l'affichage après remplacement.
  return `${data.publicUrl}?v=${Date.now()}`;
}
