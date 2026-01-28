import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { PerformanceRecordWithDetails } from '../domain/entities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

export async function exportToExcel(
  records: PerformanceRecordWithDetails[],
  options: ExportOptions = {}
): Promise<void> {
  const { 
    filename = `rendimientos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`,
    sheetName = 'Rendimientos'
  } = options;

  const data = records.map(record => ({
    'Fecha': format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
    'Trabajador': record.workerName,
    'Actividad': record.activityName,
    'Rendimiento Logrado': record.achievedPerformance,
    'Meta': record.expectedPerformance,
    'Unidad': record.activityUnit,
    'Cumplió Meta': record.metGoal ? 'Sí' : 'No',
    'Porcentaje': `${Math.round((record.achievedPerformance / record.expectedPerformance) * 100)}%`,
    'Notas': record.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Rendimientos',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}

export async function exportByActivity(
  records: PerformanceRecordWithDetails[]
): Promise<void> {
  const groupedByActivity: Record<string, PerformanceRecordWithDetails[]> = {};
  
  records.forEach(record => {
    if (!groupedByActivity[record.activityName]) {
      groupedByActivity[record.activityName] = [];
    }
    groupedByActivity[record.activityName].push(record);
  });

  const workbook = XLSX.utils.book_new();

  Object.entries(groupedByActivity).forEach(([activityName, activityRecords]) => {
    const data = activityRecords.map(record => ({
      'Fecha': format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
      'Trabajador': record.workerName,
      'Rendimiento Logrado': record.achievedPerformance,
      'Meta': record.expectedPerformance,
      'Unidad': record.activityUnit,
      'Cumplió Meta': record.metGoal ? 'Sí' : 'No',
      'Porcentaje': `${Math.round((record.achievedPerformance / record.expectedPerformance) * 100)}%`,
      'Notas': record.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const sheetName = activityName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const filename = `rendimientos_por_actividad_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Rendimientos por Actividad',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}

export async function exportByWorker(
  records: PerformanceRecordWithDetails[]
): Promise<void> {
  const groupedByWorker: Record<string, PerformanceRecordWithDetails[]> = {};
  
  records.forEach(record => {
    if (!groupedByWorker[record.workerName]) {
      groupedByWorker[record.workerName] = [];
    }
    groupedByWorker[record.workerName].push(record);
  });

  const workbook = XLSX.utils.book_new();

  Object.entries(groupedByWorker).forEach(([workerName, workerRecords]) => {
    const data = workerRecords.map(record => ({
      'Fecha': format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
      'Actividad': record.activityName,
      'Rendimiento Logrado': record.achievedPerformance,
      'Meta': record.expectedPerformance,
      'Unidad': record.activityUnit,
      'Cumplió Meta': record.metGoal ? 'Sí' : 'No',
      'Porcentaje': `${Math.round((record.achievedPerformance / record.expectedPerformance) * 100)}%`,
      'Notas': record.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const sheetName = workerName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const filename = `rendimientos_por_trabajador_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Rendimientos por Trabajador',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}
