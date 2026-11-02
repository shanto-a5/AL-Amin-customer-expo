import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { ApiError } from '@/api/api-client';
import { vantaApi } from '@/api/vanta-api';
import { getContainer } from '@/infrastructure/container';

export type MediaPickResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

export class MediaService {
  async pickImage(folder = 'uploads'): Promise<MediaPickResult> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return {
          status: 'unavailable',
          message: 'Photo access is turned off. Enable it in system settings, or add a placeholder image instead.',
        };
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
      const assetUri = result.assets[0].uri;
      if (Platform.OS === 'web') {
        return { status: 'picked', uri: assetUri };
      }
      return { status: 'picked', uri: await this.persist(assetUri, folder) };
    } catch (error) {
      return {
        status: 'unavailable',
        message: error instanceof Error ? error.message : 'The photo library could not be opened on this device.',
      };
    }
  }

  async captureImage(folder = 'uploads'): Promise<MediaPickResult> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'unavailable', message: 'Camera access is turned off for this app.' };
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
      const assetUri = result.assets[0].uri;
      if (Platform.OS === 'web') {
        return { status: 'picked', uri: assetUri };
      }
      return { status: 'picked', uri: await this.persist(assetUri, folder) };
    } catch (error) {
      return {
        status: 'unavailable',
        message: error instanceof Error ? error.message : 'The camera could not be opened on this device.',
      };
    }
  }

  async persist(uri: string, folder: string): Promise<string> {
    return getContainer().imageStorage.saveImageFromUri(uri, folder);
  }

  async uploadImage(uri: string): Promise<string> {
    try {
      const { media } = await vantaApi.uploadMedia(uri);
      return media.url;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'network_error') {
        const { media } = await vantaApi.uploadMedia(uri);
        return media.url;
      }
      throw error;
    }
  }

  async uploadAvatar(uri: string, authenticated = true): Promise<string> {
    const result = await vantaApi.uploadAvatar(uri, { authenticated });
    return result.avatarUrl;
  }
}

export const mediaService = new MediaService();
