import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

// Devine l'extension depuis le type MIME (fiable) plutôt que depuis l'URI :
// sur Android, les URIs de galerie sont souvent des content:// sans point
// (ex. content://media/external/images/media/12345), donc découper sur "."
// renvoyait l'URI entière comme "extension" et cassait le chemin de l'objet.
function guessExtension(uri: string, mimeType?: string | null): string {
  const fromMime = mimeType?.split('/').pop()?.toLowerCase();
  if (fromMime && /^[a-z0-9]{2,5}$/.test(fromMime)) return fromMime;
  const fromUri = uri.split('.').pop()?.toLowerCase();
  if (fromUri && /^[a-z0-9]{2,5}$/.test(fromUri)) return fromUri;
  return 'jpg';
}

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
  const ext = guessExtension(asset.uri, asset.mimeType);
  const path = `${userId}/avatar.${ext}`;

  // Lecture en base64 via expo-file-system (méthode recommandée par Supabase
  // pour React Native) : fetch() sur un URI local content:// est peu fiable
  // sur Android selon la version et le fournisseur de galerie.
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), {
      contentType: asset.mimeType ?? `image/${ext}`,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-buster pour rafraîchir l'affichage après remplacement.
  return `${data.publicUrl}?v=${Date.now()}`;
}
