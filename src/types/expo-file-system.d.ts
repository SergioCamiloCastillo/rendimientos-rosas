declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: string }
  ): Promise<void>;
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: string }
  ): Promise<string>;
  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean }
  ): Promise<void>;
  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<{
    exists: boolean;
    isDirectory: boolean;
    modificationTime?: number;
    size?: number;
    uri: string;
    md5?: string;
  }>;
  export function makeDirectoryAsync(
    fileUri: string,
    options?: { intermediates?: boolean }
  ): Promise<void>;
  export const EncodingType: {
    UTF8: string;
    Base64: string;
  };
}
