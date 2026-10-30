import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { STORAGE_KEYS } from '../infrastructure/storage/AsyncStorageAdapter';
import { getFirstOpenDate, keepEarliestFirstOpen } from './firstOpen';

// Formato del archivo de respaldo. Si cambia la estructura, subir BACKUP_VERSION
// y mantener la lectura de versiones anteriores en parseBackup.
const BACKUP_APP = 'rinde';
const BACKUP_VERSION = 1;
const LAST_BACKUP_KEY = '@rendimientos/last_backup_at';

// Qué guarda el respaldo: todas las listas de la app
const BACKUP_SECTIONS = {
  workers: STORAGE_KEYS.WORKERS,
  activities: STORAGE_KEYS.ACTIVITIES,
  blocks: STORAGE_KEYS.BLOCKS,
  records: STORAGE_KEYS.PERFORMANCE_RECORDS,
  weeklyGoals: STORAGE_KEYS.WEEKLY_GOALS,
  absences: STORAGE_KEYS.ABSENCES,
} as const;

type BackupSection = keyof typeof BACKUP_SECTIONS;
type BackupData = Record<BackupSection, unknown[]>;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  createdAt: string;
  // Primera apertura de la app en el celular donde se hizo el respaldo (opcional: los
  // respaldos anteriores no la traen)
  firstOpenAt?: string;
  data: BackupData;
}

export type BackupCounts = Record<BackupSection, number>;

export interface PickedBackup {
  backup: BackupFile;
  counts: BackupCounts;
}

const SECTIONS = Object.keys(BACKUP_SECTIONS) as BackupSection[];

const countsOf = (data: BackupData): BackupCounts =>
  Object.fromEntries(SECTIONS.map(s => [s, data[s].length])) as BackupCounts;

const readCurrentData = async (): Promise<BackupData> => {
  const pairs = await AsyncStorage.multiGet(SECTIONS.map(s => BACKUP_SECTIONS[s]));
  const byKey = Object.fromEntries(pairs);
  return Object.fromEntries(
    SECTIONS.map(s => {
      const raw = byKey[BACKUP_SECTIONS[s]];
      const parsed = raw ? JSON.parse(raw) : [];
      return [s, Array.isArray(parsed) ? parsed : []];
    })
  ) as BackupData;
};

export const getCurrentCounts = async (): Promise<BackupCounts> => countsOf(await readCurrentData());

export const getLastBackupDate = async (): Promise<Date | null> => {
  const value = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  return value ? new Date(value) : null;
};

/**
 * Crea el archivo de respaldo con todos los datos y abre el menú de compartir
 * para guardarlo en Drive, enviarlo por WhatsApp o correo.
 */
export const createBackup = async (): Promise<BackupCounts> => {
  const now = new Date();
  const firstOpen = await getFirstOpenDate();
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    firstOpenAt: firstOpen?.toISOString(),
    data: await readCurrentData(),
  };

  const filename = `rinde-respaldo-${format(now, 'yyyy-MM-dd-HHmm')}.json`;
  const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + filename;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Guardar respaldo de Rinde',
    UTI: 'public.json',
  });

  await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
  return countsOf(backup.data);
};

/**
 * Valida que el texto sea un respaldo de Rinde. No exige el esquema estricto de cada
 * entidad: un respaldo hecho con una versión anterior de la app debe poder restaurarse.
 */
export const parseBackup = (text: string): BackupFile => {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un respaldo válido');
  }

  if (!json || json.app !== BACKUP_APP || typeof json.data !== 'object' || json.data === null) {
    throw new Error('El archivo no es un respaldo de Rinde');
  }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    throw new Error('Este respaldo es de una versión más nueva de Rinde. Actualiza la app');
  }

  const data = {} as BackupData;
  for (const section of SECTIONS) {
    const list = json.data[section] ?? [];
    const valid = Array.isArray(list) && list.every(
      (item: any) => item && typeof item === 'object' && typeof item.id === 'string'
    );
    if (!valid) {
      throw new Error('El respaldo está dañado y no se puede restaurar');
    }
    data[section] = list;
  }

  return {
    app: BACKUP_APP,
    version: json.version,
    createdAt: String(json.createdAt ?? ''),
    firstOpenAt: typeof json.firstOpenAt === 'string' ? json.firstOpenAt : undefined,
    data,
  };
};

/** Abre el selector de archivos y devuelve el respaldo leído, o null si se canceló. */
export const pickBackup = async (): Promise<PickedBackup | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    // Algunas apps guardan el .json como texto u octet-stream
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const text = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const backup = parseBackup(text);
  return { backup, counts: countsOf(backup.data) };
};

/** Reemplaza todos los datos actuales por los del respaldo. */
export const restoreBackup = async (backup: BackupFile): Promise<void> => {
  await AsyncStorage.multiSet(
    SECTIONS.map(s => [BACKUP_SECTIONS[s], JSON.stringify(backup.data[s])])
  );
  await keepEarliestFirstOpen(backup.firstOpenAt);
};
