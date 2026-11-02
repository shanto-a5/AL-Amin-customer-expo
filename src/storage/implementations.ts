import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalImageStorage, SessionStorage, StorageAdapter } from './storage-adapter';
import { uuid } from '@/utils/id';
import { File, Directory, Paths } from 'expo-file-system';

export class AsyncStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

export class LocalSessionStorage implements SessionStorage {
  constructor(private adapter: StorageAdapter) {}

  async getToken(): Promise<string | null> {
    return this.adapter.get('vanta.session.token');
  }

  async setToken(token: string): Promise<void> {
    await this.adapter.set('vanta.session.token', token);
  }

  async clearToken(): Promise<void> {
    await this.adapter.remove('vanta.session.token');
  }
}

export class LocalDeviceImageStorage implements LocalImageStorage {
  async saveImageFromUri(uri: string, folder: string): Promise<string> {
    try {
      if (uri.startsWith('p:')) return uri;
      // `new File(uri)` accepts file:// URIs and, since Expo SDK 54, Android
      // content:// document-provider URIs that the image picker may return. The
      // picker's own cache copy is already app-accessible; the explicit exists
      // check turns a stale/expired URI into a clear error instead of an
      // opaque native read failure later during multipart upload.
      const file = new File(uri);
      if (!file.exists) {
        throw new Error('Source file not found or not accessible');
      }
      const dir = new Directory(Paths.document, 'vanta-images', folder);
      dir.create({ idempotent: true, intermediates: true });
      const rawExtension = file.extension || '.jpg';
      // Normalise to a single lowercase dot-prefixed extension: some Android
      // providers report no extension, and a stray leading dot would produce a
      // file name like `abc..jpeg`.
      const extension = rawExtension.startsWith('.')
        ? rawExtension.toLowerCase()
        : `.${rawExtension.toLowerCase()}`;
      const target = new File(dir, `${uuid()}${extension}`);
      // `File.copy` is asynchronous. It MUST be awaited: without this the method
      // returned `target.uri` before the bytes were written, and the upload then
      // read a file that did not exist yet — failing with `ENOENT` from
      // `File.bytes()` on a real device.
      await file.copy(target);
      if (!target.exists) {
        throw new Error('Image could not be written to disk');
      }
      return target.uri;
    } catch (error) {
      console.warn('Image copy failed, storing original uri', error);
      return uri;
    }
  }
}