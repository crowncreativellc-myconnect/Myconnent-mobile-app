import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';
import { storage, db } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useShoutStore } from '../store/shoutStore';

// 256×256 px JPEG @ 70% quality ≈ 15–30 KB (0.065 MP)
const AVATAR_SIZE = 256;
const JPEG_QUALITY = 0.7;

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const setProfile = useAuthStore((s) => s.setProfile);
  const patchAuthorInShouts = useShoutStore((s) => s.patchAuthorInShouts);

  const pickAndUpload = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return null;

    setIsUploading(true);
    try {
      // Read latest profile directly from store (avoids stale closure)
      const profile = useAuthStore.getState().profile;
      if (!profile?.id) throw new Error('Not authenticated');

      // Resize + compress to minimise storage
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
        { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Read as base64 then decode to ArrayBuffer — the only reliable
      // upload path in React Native (fetch().blob() is broken on RN)
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decode(base64);

      const path = `${profile.id}/avatar.jpg`;

      const { error: uploadError } = await storage.avatars.upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (uploadError) throw uploadError;

      // Append ?t= to bust both the RN image cache and the CDN cache on every upload
      const { data: urlData } = storage.avatars.getPublicUrl(path);
      const displayUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await db
        .profiles()
        .update({ avatar_url: displayUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (dbError) throw dbError;

      setProfile({ ...profile, avatar_url: displayUrl });
      patchAuthorInShouts(profile.id, { avatar_url: displayUrl });
      return displayUrl;
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { pickAndUpload, isUploading };
}
