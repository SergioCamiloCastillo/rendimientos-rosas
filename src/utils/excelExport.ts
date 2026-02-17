import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import XLSX from 'xlsx-js-style';
import { PerformanceRecordWithDetails } from '../domain/entities';
import { WeeklyGoalRepository, PerformanceRepository, ActivityRepository, AbsenceRepository } from '../data/repositories';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para abrir archivo con app por defecto
const openFileWithDefaultApp = async (uri: string) => {
  if (Platform.OS === 'android') {
    try {
      // Import dinámico para evitar errores en Expo Go
      const IntentLauncher = await import('expo-intent-launcher');
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error) {
      // Fallback a Sharing si IntentLauncher falla (ej: Expo Go)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
    }
  } else {
    // En iOS usamos sharing que permite "Abrir en..."
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  }
};

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  startDate?: string;
  endDate?: string;
}

// Función helper para formatear hora 24h a 12h AM/PM
const formatTimeToAMPM = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Función helper para calcular porcentaje correcto
const calculatePercentage = (record: PerformanceRecordWithDetails): number => {
  const totalHoursRaw = record.totalHours || 0;
  const totalHours = Math.round(totalHoursRaw * 10) / 10;
  const expectedTotal = totalHours > 0 
    ? record.expectedPerformance * totalHours
    : record.expectedPerformance;
  return expectedTotal > 0 
    ? Math.round((record.achievedPerformance / expectedTotal) * 100)
    : 0;
};

// Headers del Excel
const HEADERS = [
  'Fecha', 'Nombre', 'Código', 'Labor', 'Bloque', 'Hora Inicio', 'Hora Fin', 
  'Total Horas', 'Rend. Establecido', 'Total', '% Cumplimiento', 'Meta Total', 'Notas'
];

// Estilo para headers (fondo azul, texto blanco, negrita)
const headerStyle = {
  fill: { fgColor: { rgb: '1E40AF' } },  // Azul oscuro
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
};

// Estilo para fila de totales
const totalStyle = {
  fill: { fgColor: { rgb: 'DBEAFE' } },  // Azul claro
  font: { bold: true, sz: 11 },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
};

// Función para aplicar estilos a los headers
const applyHeaderStyles = (worksheet: XLSX.WorkSheet, totalRowIndex?: number) => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Aplicar estilo a la primera fila (headers)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = headerStyle;
    }
  }
  
  // Aplicar estilo a la fila de totales si existe
  if (totalRowIndex !== undefined) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = totalStyle;
      }
    }
  }
  
  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 20 },  // Nombre
    { wch: 10 },  // Código
    { wch: 18 },  // Labor
    { wch: 12 },  // Bloque
    { wch: 12 },  // Hora Inicio
    { wch: 12 },  // Hora Fin
    { wch: 12 },  // Total Horas
    { wch: 16 },  // Rend. Establecido
    { wch: 10 },  // Total
    { wch: 14 },  // % Cumplimiento
    { wch: 12 },  // Meta Total
    { wch: 25 },  // Notas
  ];
  
  return worksheet;
};

// Función para expandir registros con múltiples turnos en filas separadas
const expandRecordsWithShifts = (records: PerformanceRecordWithDetails[]) => {
  const rows: any[] = [];
  
  records.forEach(record => {
    const percentage = calculatePercentage(record);
    const totalHours = Math.round((record.totalHours || 0) * 10) / 10;
    const expectedTotal = totalHours > 0 
      ? record.expectedPerformance * totalHours
      : record.expectedPerformance;
    
    if (record.shifts && record.shifts.length > 0) {
      record.shifts.forEach((shift, index) => {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const shiftHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
        
        rows.push({
          'Fecha': format(new Date(record.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }),
          'Nombre': record.workerName,
          'Código': record.workerCode || '',
          'Labor': record.activityName,
          'Bloque': shift.block || record.block || '',
          'Hora Inicio': formatTimeToAMPM(shift.startTime),
          'Hora Fin': formatTimeToAMPM(shift.endTime),
          'Total Horas': shiftHours.toFixed(1),
          'Rend. Establecido': record.expectedPerformance,
          'Total': shift.achievedPerformance,
          '% Cumplimiento': index === 0 ? `${percentage}%` : '',
          'Meta Total': index === 0 ? expectedTotal : '',
          'Notas': index === 0 ? (record.notes || '') : '',
        });
      });
    } else {
      rows.push({
        'Fecha': format(new Date(record.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }),
        'Nombre': record.workerName,
        'Código': record.workerCode || '',
        'Labor': record.activityName,
        'Bloque': record.block || '',
        'Hora Inicio': '',
        'Hora Fin': '',
        'Total Horas': totalHours.toFixed(1),
        'Rend. Establecido': record.expectedPerformance,
        'Total': record.achievedPerformance,
        '% Cumplimiento': `${percentage}%`,
        'Meta Total': expectedTotal,
        'Notas': record.notes || '',
      });
    }
  });
  
  return rows;
};

export async function exportToExcel(
  records: PerformanceRecordWithDetails[],
  options: ExportOptions = {}
): Promise<void> {
  const { 
    filename = `rendimientos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`,
    sheetName = 'Rendimientos'
  } = options;

  const data = expandRecordsWithShifts(records);
  
  // Agregar fila de totales al final
  const totalRecords = records.length;
  const avgPercentage = totalRecords > 0 
    ? Math.round(records.reduce((sum, r) => sum + calculatePercentage(r), 0) / totalRecords)
    : 0;
  const totalAchieved = records.reduce((sum, r) => sum + r.achievedPerformance, 0);
  
  data.push({
    'Fecha': '',
    'Nombre': 'TOTALES',
    'Código': '',
    'Labor': '',
    'Bloque': '',
    'Hora Inicio': '',
    'Hora Fin': '',
    'Total Horas': '',
    'Rend. Establecido': '',
    'Total': totalAchieved,
    '% Cumplimiento': `${avgPercentage}%`,
    'Meta Total': '',
    'Notas': `Total Registros: ${totalRecords}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  applyHeaderStyles(worksheet, data.length); // data.length es el índice de la fila de totales (0-indexed después del header)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: 'base64',
  });

  await openFileWithDefaultApp(uri);
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
    const data = expandRecordsWithShifts(activityRecords);
    
    // Agregar totales por actividad
    const totalRecords = activityRecords.length;
    const avgPercentage = totalRecords > 0 
      ? Math.round(activityRecords.reduce((sum, r) => sum + calculatePercentage(r), 0) / totalRecords)
      : 0;
    const totalAchieved = activityRecords.reduce((sum, r) => sum + r.achievedPerformance, 0);
    
    data.push({
      'Fecha': '',
      'Nombre': 'TOTALES',
      'Código': '',
      'Labor': activityName,
      'Bloque': '',
      'Hora Inicio': '',
      'Hora Fin': '',
      'Total Horas': '',
      'Rend. Establecido': '',
      'Total': totalAchieved,
      '% Cumplimiento': `${avgPercentage}%`,
      'Meta Total': '',
      'Notas': `Total Registros: ${totalRecords}`,
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    applyHeaderStyles(worksheet, data.length);
    const sheetName = activityName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const filename = `rendimientos_por_actividad_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: 'base64',
  });

  await openFileWithDefaultApp(uri);
}

export async function exportByWorker(
  records: PerformanceRecordWithDetails[]
): Promise<void> {
  const groupedByWorker: Record<string, PerformanceRecordWithDetails[]> = {};
  
  records.forEach(record => {
    const key = `${record.workerCode || ''}_${record.workerName}`;
    if (!groupedByWorker[key]) {
      groupedByWorker[key] = [];
    }
    groupedByWorker[key].push(record);
  });

  const workbook = XLSX.utils.book_new();

  Object.entries(groupedByWorker).forEach(([key, workerRecords]) => {
    const workerName = workerRecords[0].workerName;
    const workerCode = workerRecords[0].workerCode || '';
    
    const data = expandRecordsWithShifts(workerRecords);
    
    // Agregar totales por trabajador
    const totalRecords = workerRecords.length;
    const avgPercentage = totalRecords > 0 
      ? Math.round(workerRecords.reduce((sum, r) => sum + calculatePercentage(r), 0) / totalRecords)
      : 0;
    const totalAchieved = workerRecords.reduce((sum, r) => sum + r.achievedPerformance, 0);
    const totalHours = workerRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    
    data.push({
      'Fecha': '',
      'Nombre': 'TOTALES',
      'Código': workerCode,
      'Labor': '',
      'Bloque': '',
      'Hora Inicio': '',
      'Hora Fin': '',
      'Total Horas': totalHours.toFixed(1),
      'Rend. Establecido': '',
      'Total': totalAchieved,
      '% Cumplimiento': `${avgPercentage}%`,
      'Meta Total': '',
      'Notas': `Total Registros: ${totalRecords}`,
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    applyHeaderStyles(worksheet, data.length);
    const sheetName = (workerCode ? `${workerCode} - ` : '') + workerName.substring(0, 25);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
  });

  const filename = `rendimientos_por_trabajador_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: 'base64',
  });

  await openFileWithDefaultApp(uri);
}

// Exportar reporte semanal con todos los trabajadores
export async function exportWeeklyReport(
  records: PerformanceRecordWithDetails[],
  weekStart: string,
  weekEnd: string
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // Hoja 1: Resumen por trabajador
  const workerSummary: Record<string, {
    name: string;
    code: string;
    totalHours: number;
    totalAchieved: number;
    recordCount: number;
    percentageSum: number;
  }> = {};
  
  records.forEach(record => {
    const key = record.workerId;
    if (!workerSummary[key]) {
      workerSummary[key] = {
        name: record.workerName,
        code: record.workerCode || '',
        totalHours: 0,
        totalAchieved: 0,
        recordCount: 0,
        percentageSum: 0,
      };
    }
    workerSummary[key].totalHours += record.totalHours || 0;
    workerSummary[key].totalAchieved += record.achievedPerformance;
    workerSummary[key].recordCount += 1;
    workerSummary[key].percentageSum += calculatePercentage(record);
  });
  
  const summaryData = Object.values(workerSummary).map(worker => ({
    'Código': worker.code,
    'Nombre': worker.name,
    'Total Horas': worker.totalHours.toFixed(1),
    'Total Rendimiento': worker.totalAchieved,
    'Registros': worker.recordCount,
    '% Promedio': `${Math.round(worker.percentageSum / worker.recordCount)}%`,
  }));
  
  // Agregar totales generales
  const grandTotalHours = Object.values(workerSummary).reduce((sum, w) => sum + w.totalHours, 0);
  const grandTotalAchieved = Object.values(workerSummary).reduce((sum, w) => sum + w.totalAchieved, 0);
  const grandTotalRecords = Object.values(workerSummary).reduce((sum, w) => sum + w.recordCount, 0);
  const grandAvgPercentage = grandTotalRecords > 0
    ? Math.round(Object.values(workerSummary).reduce((sum, w) => sum + w.percentageSum, 0) / grandTotalRecords)
    : 0;
  
  summaryData.push({
    'Código': '',
    'Nombre': 'TOTAL GENERAL',
    'Total Horas': grandTotalHours.toFixed(1),
    'Total Rendimiento': grandTotalAchieved,
    'Registros': grandTotalRecords,
    '% Promedio': `${grandAvgPercentage}%`,
  });
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  // Aplicar estilos al resumen
  const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
  for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (summarySheet[cellRef]) {
      summarySheet[cellRef].s = headerStyle;
    }
    // Fila de totales
    const totalRef = XLSX.utils.encode_cell({ r: summaryData.length, c: col });
    if (summarySheet[totalRef]) {
      summarySheet[totalRef].s = totalStyle;
    }
  }
  summarySheet['!cols'] = [
    { wch: 10 },  // Código
    { wch: 20 },  // Nombre
    { wch: 12 },  // Total Horas
    { wch: 16 },  // Total Rendimiento
    { wch: 10 },  // Registros
    { wch: 12 },  // % Promedio
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen Semanal');
  
  // Hoja 2: Detalle completo
  const detailData = expandRecordsWithShifts(records);
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  applyHeaderStyles(detailSheet, detailData.length);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle');

  const filename = `reporte_semanal_${weekStart}_${weekEnd}`;
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = (FileSystem.documentDirectory || '') + `${filename}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: 'base64',
  });

  await openFileWithDefaultApp(uri);
}

// Exportar reporte Plan de Trabajo por bloque
const BLOCKS = ['21', '17', '16', '15', '10'];

export async function exportWorkPlan(date: string): Promise<void> {
  const dateObj = new Date(date + 'T12:00:00');
  const weekStart = format(startOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Obtener registros de rendimiento de la semana
  const allRecords = await PerformanceRepository.getActive();
  const weekRecords = allRecords.filter(r => r.date >= weekStart && r.date <= weekEnd);

  if (weekRecords.length === 0) {
    throw new Error('No hay registros de rendimiento para esta semana');
  }

  // Obtener actividades y metas semanales
  const activities = await ActivityRepository.getAll();
  const goals = await WeeklyGoalRepository.getWithDetails(weekStart);

  // Agrupar rendimiento por bloque + actividad desde los shifts
  // key = "block|activityId"
  const achieved: Record<string, number> = {};

  weekRecords.forEach(record => {
    if (record.shifts && record.shifts.length > 0) {
      record.shifts.forEach(shift => {
        const block = (shift.block || '').trim();
        if (block) {
          const key = `${block}|${record.activityId}`;
          achieved[key] = (achieved[key] || 0) + shift.achievedPerformance;
        }
      });
    } else {
      const block = (record.block || '').trim();
      if (block) {
        const key = `${block}|${record.activityId}`;
        achieved[key] = (achieved[key] || 0) + record.achievedPerformance;
      }
    }
  });

  // Construir mapa de metas: key = "block|activityId" -> goalAmount
  const goalMap: Record<string, number> = {};
  goals.forEach(g => {
    if (g.block) {
      goalMap[`${g.block}|${g.activityId}`] = g.goalAmount;
    }
  });

  // Construir filas agrupadas por bloque
  const rows: any[] = [];

  BLOCKS.forEach(block => {
    // Encontrar todas las actividades que tienen rendimiento en este bloque
    const blockEntries: { activityName: string; meta: number; realizado: number }[] = [];

    Object.keys(achieved).forEach(key => {
      const [b, actId] = key.split('|');
      if (b === block) {
        const activity = activities.find(a => a.id === actId);
        const actName = activity?.name || 'Actividad eliminada';
        const meta = goalMap[key] || 0;
        blockEntries.push({
          activityName: actName,
          meta,
          realizado: achieved[key],
        });
      }
    });

    // También agregar metas que no tienen rendimiento aún
    goals.forEach(g => {
      if (g.block === block) {
        const key = `${block}|${g.activityId}`;
        if (!achieved[key]) {
          blockEntries.push({
            activityName: g.activityName,
            meta: g.goalAmount,
            realizado: 0,
          });
        }
      }
    });

    if (blockEntries.length === 0) return;

    blockEntries.forEach((entry, index) => {
      const pct = entry.meta > 0 ? Math.round((entry.realizado / entry.meta) * 100) : 0;
      rows.push({
        'Bloque': index === 0 ? `B${block}` : '',
        'Actividad': entry.activityName,
        'Meta': entry.meta || '',
        'Realizado': entry.realizado,
        '% Cumplimiento': entry.meta > 0 ? `${pct}%` : '',
      });
    });
  });

  if (rows.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  // Obtener ausentismo del rango
  const absences = await AbsenceRepository.getByDateRange(weekStart, weekEnd);
  const totalPeople = absences.reduce((sum, a) => sum + (a.peopleCount ?? 0), 0);
  const totalHoursLost = absences.reduce((sum, a) => sum + (a.hoursLost ?? 0), 0);

  // Fila vacía separadora + fila de ausentismo
  rows.push({
    'Bloque': '',
    'Actividad': '',
    'Meta': '',
    'Realizado': '',
    '% Cumplimiento': '',
  });
  const absenceRowIndex = rows.length; // índice 0-based de la fila de ausentismo (en el sheet será +1 por header)
  rows.push({
    'Bloque': 'AUSENTISMO',
    'Actividad': `${totalPeople} personas`,
    'Meta': '',
    'Realizado': '',
    '% Cumplimiento': `${totalHoursLost} hrs perdidas`,
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Aplicar estilos a headers
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const hRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[hRef]) {
      worksheet[hRef].s = headerStyle;
    }
  }

  // Colorear filas según porcentaje
  const greenFill = { fgColor: { rgb: 'DCFCE7' } };
  const yellowFill = { fgColor: { rgb: 'FEF9C3' } };
  const redFill = { fgColor: { rgb: 'FEE2E2' } };
  const orangeFill = { fgColor: { rgb: 'FFEDD5' } };
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  for (let row = 1; row <= rows.length; row++) {
    const pctCell = XLSX.utils.encode_cell({ r: row, c: 4 });
    if (worksheet[pctCell] && String(worksheet[pctCell].v).includes('%')) {
      const pct = parseInt(String(worksheet[pctCell].v));
      const fill = pct >= 100 ? greenFill : pct >= 80 ? yellowFill : redFill;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cRef]) {
          worksheet[cRef].s = { fill, border: thinBorder };
        }
      }
    }
  }

  // Estilo para fila de ausentismo
  const absenceSheetRow = absenceRowIndex + 1; // +1 por header
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cRef = XLSX.utils.encode_cell({ r: absenceSheetRow, c: col });
    if (worksheet[cRef]) {
      worksheet[cRef].s = {
        fill: orangeFill,
        font: { bold: true, sz: 11 },
        border: thinBorder,
      };
    }
  }

  // Anchos de columna
  worksheet['!cols'] = [
    { wch: 14 },  // Bloque
    { wch: 25 },  // Actividad
    { wch: 12 },  // Meta
    { wch: 12 },  // Realizado
    { wch: 18 },  // % Cumplimiento
  ];

  const dateFormatted = format(dateObj, 'dd-MM-yyyy');
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plan de Trabajo');

  const wpFilename = `plan_de_trabajo_${dateFormatted}`;
  const wpOut = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const wpUri = (FileSystem.documentDirectory || '') + `${wpFilename}.xlsx`;

  await FileSystem.writeAsStringAsync(wpUri, wpOut, {
    encoding: 'base64',
  });

  await openFileWithDefaultApp(wpUri);
}
