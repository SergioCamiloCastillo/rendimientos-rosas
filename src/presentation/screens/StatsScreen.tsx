import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors } from '../theme';
import { Select, Sidebar, MenuButton } from '../components';
import { PerformanceRepository, WorkerRepository } from '../../data/repositories';
import { PerformanceRecordWithDetails, Worker } from '../../domain/entities';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const { width: screenWidth } = Dimensions.get('window');

interface WorkerStats {
  id: string;
  name: string;
  code: string;
  totalHours: number;
  totalAchieved: number;
  recordCount: number;
  avgPercentage: number;
}

interface DailyStats {
  date: string;
  dateLabel: string;
  total: number;
  metGoal: number;
  avgPercentage: number;
}

export const StatsScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [records, setRecords] = useState<PerformanceRecordWithDetails[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [activeWorkers, setActiveWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workerDailyStats, setWorkerDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);

  // Refs para capturar las gráficas
  const barChartRef = React.useRef<ViewShot | null>(null);
  const trendChartRef = React.useRef<ViewShot | null>(null);
  const workerChartRef = React.useRef<ViewShot | null>(null);

  const captureChartAsBase64 = async (ref: React.RefObject<ViewShot | null>): Promise<string | null> => {
    try {
      if (!ref.current || !ref.current.capture) return null;
      const base64 = await ref.current.capture();
      return base64;
    } catch (err) {
      console.error('Error capturing chart:', err);
      return null;
    }
  };

  const generatePdfForChart = async (chartName: string, ref: React.RefObject<ViewShot | null>) => {
    setExportingPdf(chartName);
    try {
      const base64 = await captureChartAsBase64(ref);
      if (!base64) {
        setExportingPdf(null);
        return;
      }

      const dateRange = `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, sans-serif; padding: 32px; background: #fff; }
              h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 4px; }
              .subtitle { font-size: 14px; color: #666; margin-bottom: 32px; }
              h2 { font-size: 18px; color: #333; margin-bottom: 12px; }
              img { width: 100%; border-radius: 12px; border: 1px solid #eee; }
              .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px; }
            </style>
          </head>
          <body>
            <h1>${chartName}</h1>
            <p class="subtitle">Período: ${dateRange}</p>
            <img src="data:image/png;base64,${base64}" />
            <p class="footer">Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${chartName}.pdf` });
    } catch (err) {
      console.error('Error generating PDF for chart:', err);
    } finally {
      setExportingPdf(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar trabajadores activos
      const workers = await WorkerRepository.getAll();
      const activeList = workers.filter(w => !w.isDeleted);
      setActiveWorkers(activeList);
      const activeIds = new Set(activeList.map(w => w.id));

      const data = await PerformanceRepository.getWithDetails({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      
      // Filtrar solo registros de trabajadores activos
      const filteredData = data.filter(r => activeIds.has(r.workerId));
      setRecords(filteredData);
      calculateStats(filteredData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (record: PerformanceRecordWithDetails): number => {
    const totalHours = Math.round((record.totalHours || 0) * 100) / 100;
    const expectedTotal = totalHours > 0 
      ? record.expectedPerformance * totalHours
      : record.expectedPerformance;
    return expectedTotal > 0 
      ? Math.round((record.achievedPerformance / expectedTotal) * 100)
      : 0;
  };

  const calculateStats = (data: PerformanceRecordWithDetails[]) => {
    // Stats por trabajador (solo activos)
    const workerMap: Record<string, WorkerStats> = {};
    data.forEach(record => {
      if (!workerMap[record.workerId]) {
        workerMap[record.workerId] = {
          id: record.workerId,
          name: record.workerName,
          code: record.workerCode || '',
          totalHours: 0,
          totalAchieved: 0,
          recordCount: 0,
          avgPercentage: 0,
        };
      }
      workerMap[record.workerId].totalHours += record.totalHours || 0;
      workerMap[record.workerId].totalAchieved += record.achievedPerformance;
      workerMap[record.workerId].recordCount += 1;
      workerMap[record.workerId].avgPercentage += calculatePercentage(record);
    });

    const workers = Object.values(workerMap).map(w => ({
      ...w,
      avgPercentage: w.recordCount > 0 ? Math.round(w.avgPercentage / w.recordCount) : 0,
    })).sort((a, b) => b.avgPercentage - a.avgPercentage);

    setWorkerStats(workers);

    // Stats por fecha
    const dateMap: Record<string, { total: number; metGoal: number; percentageSum: number }> = {};
    data.forEach(record => {
      const dateKey = record.date;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { total: 0, metGoal: 0, percentageSum: 0 };
      }
      dateMap[dateKey].total += 1;
      const pct = calculatePercentage(record);
      dateMap[dateKey].percentageSum += pct;
      if (pct >= 100) {
        dateMap[dateKey].metGoal += 1;
      }
    });

    const daily = Object.entries(dateMap)
      .map(([date, stats]) => ({
        date,
        dateLabel: format(parseISO(date), 'dd/MM', { locale: es }),
        total: stats.total,
        metGoal: stats.metGoal,
        avgPercentage: stats.total > 0 ? Math.round(stats.percentageSum / stats.total) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setDailyStats(daily);
    
    // Calcular stats del trabajador seleccionado si hay uno
    if (selectedWorkerId) {
      calculateWorkerDailyStats(data, selectedWorkerId);
    }
  };

  const calculateWorkerDailyStats = (data: PerformanceRecordWithDetails[], workerId: string) => {
    const workerRecords = data.filter(r => r.workerId === workerId);
    const dateMap: Record<string, { total: number; metGoal: number; percentageSum: number }> = {};
    
    workerRecords.forEach(record => {
      const dateKey = record.date;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { total: 0, metGoal: 0, percentageSum: 0 };
      }
      dateMap[dateKey].total += 1;
      const pct = calculatePercentage(record);
      dateMap[dateKey].percentageSum += pct;
      if (pct >= 100) {
        dateMap[dateKey].metGoal += 1;
      }
    });

    const daily = Object.entries(dateMap)
      .map(([date, stats]) => ({
        date,
        dateLabel: format(parseISO(date), 'dd/MM', { locale: es }),
        total: stats.total,
        metGoal: stats.metGoal,
        avgPercentage: stats.total > 0 ? Math.round(stats.percentageSum / stats.total) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setWorkerDailyStats(daily);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [startDate, endDate])
  );

  // Recalcular stats del trabajador cuando cambia la selección
  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId);
    if (workerId) {
      calculateWorkerDailyStats(records, workerId);
    } else {
      setWorkerDailyStats([]);
    }
  };

  const setThisWeek = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setEndDate(new Date());
  };

  const setLastWeek = () => {
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    setStartDate(lastWeekStart);
    setEndDate(lastWeekEnd);
  };

  const totalRecords = records.length;
  const avgPercentage = totalRecords > 0 
    ? Math.round(records.reduce((sum, r) => sum + calculatePercentage(r), 0) / totalRecords)
    : 0;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  const totalAchieved = records.reduce((sum, r) => sum + r.achievedPerformance, 0);
  const bestWorker = workerStats[0];
  const metGoalCount = records.filter(r => calculatePercentage(r) >= 100).length;

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return colors.success;
    if (percentage >= 80) return colors.warning;
    return colors.danger;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topHeader}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.topTitle}>Estadísticas</Text>
        <View style={{ width: 32 }} />
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Estadísticas</Text>
        </View>

        {/* Filtros de fecha */}
        <View style={styles.filterSection}>
          <View style={styles.quickFilters}>
            <TouchableOpacity style={styles.quickFilterBtn} onPress={setThisWeek}>
              <Text style={styles.quickFilterText}>Esta semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterBtn} onPress={setLastWeek}>
              <Text style={styles.quickFilterText}>Semana pasada</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateRow}>
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={() => setShowStartPicker(true)}
            >
              <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
              <Text style={styles.dateText}>
                {format(startDate, 'dd/MM/yyyy', { locale: es })}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.dateSeparator}>a</Text>
            
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={() => setShowEndPicker(true)}
            >
              <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
              <Text style={styles.dateText}>
                {format(endDate, 'dd/MM/yyyy', { locale: es })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cards de resumen */}
       

        {/* Top 3 Mejores Trabajadores */}
        {workerStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitleWithIcon}>Top 3 Mejores Trabajadores</Text>
            </View>
            <View style={styles.topWorkersContainer}>
              {workerStats.slice(0, 3).map((worker, index) => (
                <View key={worker.id} style={[styles.topWorkerCard, index === 0 && styles.topWorkerFirst]}>
                  <View style={styles.topWorkerRank}>
                    <Text style={[styles.topWorkerRankText, index === 0 && styles.topWorkerRankFirst]}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Text>
                  </View>
                  <View style={styles.topWorkerInfo}>
                    <Text style={styles.topWorkerName} numberOfLines={1}>
                      {worker.code ? `${worker.code} - ` : ''}{worker.name}
                    </Text>
                    <Text style={styles.topWorkerStats}>
                      {worker.recordCount} registros • {worker.totalHours.toFixed(1)}h
                    </Text>
                  </View>
                  <View style={[styles.topWorkerBadge, { backgroundColor: getPercentageColor(worker.avgPercentage) }]}>
                    <Text style={styles.topWorkerPercentage}>{worker.avgPercentage}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gráfica de barras verticales - Rendimiento por Trabajador */}
        {workerStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="bar-chart" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitleWithIcon, { flex: 1 }]}>Rendimiento por Trabajador</Text>
              <TouchableOpacity
                style={styles.pdfDownloadBtn}
                onPress={() => generatePdfForChart('Rendimiento por Trabajador', barChartRef)}
                disabled={exportingPdf !== null}
              >
                {exportingPdf === 'Rendimiento por Trabajador' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* --- VISIBLE UI CHART (Scrollable) --- */}
            <View style={styles.chartContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.verticalChartWrapper, { width: workerStats.length * (workerStats.length > 8 ? 35 : workerStats.length > 5 ? 42 : 50) + 40 }]}>
                  <View style={styles.verticalChartArea}>
                    <View style={[styles.goalLine, { bottom: `${(100 / 150) * 100}%` }]}>
                      <Text style={styles.goalLineLabel}>100%</Text>
                    </View>
                    <View style={styles.verticalBarsContainer}>
                      {workerStats.map((worker) => {
                        const maxPct = 150;
                        const barHeight = Math.min((worker.avgPercentage / maxPct) * 100, 100);
                        const uiWrapperWidth = workerStats.length > 8 ? 35 : workerStats.length > 5 ? 42 : 50;
                        const uiBarWidth = workerStats.length > 8 ? 16 : workerStats.length > 5 ? 20 : 24;
                        
                        return (
                          <View key={worker.id} style={[styles.verticalBarWrapper, { width: uiWrapperWidth }]}>
                            <Text style={[styles.verticalBarValue, { color: getPercentageColor(worker.avgPercentage), fontSize: workerStats.length > 8 ? 8 : 10 }]}>
                              {worker.avgPercentage}%
                            </Text>
                            <View style={[styles.verticalBarTrack, { width: uiBarWidth }]}>
                              <View 
                                style={[
                                  styles.verticalBar,
                                  { 
                                    height: `${barHeight}%`,
                                    backgroundColor: getPercentageColor(worker.avgPercentage),
                                  }
                                ]} 
                              />
                            </View>
                            <View style={styles.verticalBarLabelContainer}>
                              <Text style={[styles.verticalBarLabelVertical, { fontSize: workerStats.length > 8 ? 7 : 9 }]} numberOfLines={2}>
                                {worker.name}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.goalLineLegend}>
                <View style={styles.goalLineLegendMark} />
                <Text style={styles.goalLineLegendText}>Meta 100%</Text>
              </View>
            </View>

            {/* --- HIDDEN EXPORT CHART (Compressed to fit screen) --- */}
            <View style={{ position: 'absolute', top: -10000, left: 0 }}>
              <ViewShot ref={barChartRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
                <View style={[styles.chartContainer, { width: screenWidth - 40, backgroundColor: colors.surface }]}>
                  <View style={[styles.verticalChartWrapper, { width: '100%', paddingRight: 10 }]}>
                    <View style={styles.verticalChartArea}>
                      <View style={[styles.goalLine, { bottom: `${(100 / 150) * 100}%` }]}>
                        <Text style={styles.goalLineLabel}>100%</Text>
                      </View>
                      <View style={[styles.verticalBarsContainer, { justifyContent: 'space-around' }]}>
                        {workerStats.map((worker) => {
                          const maxPct = 150;
                          const barHeight = Math.min((worker.avgPercentage / maxPct) * 100, 100);
                          const contentWidth = screenWidth - 100;
                          const exportWrapperWidth = Math.min(50, contentWidth / Math.max(1, workerStats.length));
                          const exportBarWidth = Math.max(8, exportWrapperWidth * 0.45);
                          
                          return (
                            <View key={worker.id} style={[styles.verticalBarWrapper, { width: exportWrapperWidth }]}>
                              <Text style={[styles.verticalBarValue, { color: getPercentageColor(worker.avgPercentage), fontSize: workerStats.length > 8 ? 8 : 10 }]}>
                                {worker.avgPercentage}%
                              </Text>
                              <View style={[styles.verticalBarTrack, { width: exportBarWidth }]}>
                                <View 
                                  style={[
                                    styles.verticalBar,
                                    { 
                                      height: `${barHeight}%`,
                                      backgroundColor: getPercentageColor(worker.avgPercentage),
                                    }
                                  ]} 
                                />
                              </View>
                              <View style={styles.verticalBarLabelContainer}>
                                <Text style={[styles.verticalBarLabelVertical, { fontSize: workerStats.length > 8 ? 7 : 9 }]} numberOfLines={2}>
                                  {worker.name}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                  <View style={styles.goalLineLegend}>
                    <View style={styles.goalLineLegendMark} />
                    <Text style={styles.goalLineLegendText}>Meta 100%</Text>
                  </View>
                </View>
              </ViewShot>
            </View>

          </View>
        )}

        {/* Gráfica de puntos - Tendencia por Fecha */}
        {dailyStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="trending-up" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitleWithIcon, { flex: 1 }]}>Tendencia de Rendimiento General</Text>
              <TouchableOpacity
                style={styles.pdfDownloadBtn}
                onPress={() => generatePdfForChart('Tendencia de Rendimiento General', trendChartRef)}
                disabled={exportingPdf !== null}
              >
                {exportingPdf === 'Tendencia de Rendimiento General' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            <ViewShot ref={trendChartRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
            <View style={styles.chartContainer}>
              <View style={styles.svgChartWrapper}>
                <View style={styles.simpleChartYAxis}>
                  <Text style={styles.simpleChartYLabel}>150%</Text>
                  <Text style={styles.simpleChartYLabel}>100%</Text>
                  <Text style={styles.simpleChartYLabel}>50%</Text>
                  <Text style={styles.simpleChartYLabel}>0%</Text>
                </View>
                <View style={styles.svgChartArea}>
                  <Svg width="100%" height="100%" style={styles.svgCanvas}>
                    <Line 
                      x1="0" 
                      y1={`${100 - (100 / 150) * 100}%`} 
                      x2="100%" 
                      y2={`${100 - (100 / 150) * 100}%`} 
                      stroke="#9CA3AF" 
                      strokeWidth="1.5" 
                      strokeDasharray="5,5"
                    />
                    {dailyStats.map((day, index) => {
                      if (index === 0) return null;
                      const maxPct = 150;
                      const prevDay = dailyStats[index - 1];
                      const padding = 8;
                      const x1 = padding + ((index - 1) / (dailyStats.length - 1)) * (100 - padding * 2);
                      const y1 = 5 + (100 - Math.min((prevDay.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      const x2 = padding + (index / (dailyStats.length - 1)) * (100 - padding * 2);
                      const y2 = 5 + (100 - Math.min((day.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      return (
                        <Line 
                          key={`line-${day.date}`}
                          x1={`${x1}%`} 
                          y1={`${y1}%`} 
                          x2={`${x2}%`} 
                          y2={`${y2}%`} 
                          stroke={colors.primary} 
                          strokeWidth="2" 
                        />
                      );
                    })}
                    {dailyStats.map((day, index) => {
                      const maxPct = 150;
                      const padding = 8;
                      const x = dailyStats.length > 1 
                        ? padding + (index / (dailyStats.length - 1)) * (100 - padding * 2) 
                        : 50;
                      const y = 5 + (100 - Math.min((day.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      return (
                        <Circle 
                          key={`dot-${day.date}`}
                          cx={`${x}%`} 
                          cy={`${y}%`} 
                          r="6" 
                          fill={getPercentageColor(day.avgPercentage)} 
                          stroke="#fff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </Svg>
                  <View style={styles.svgXLabels}>
                    {dailyStats.map((day) => (
                      <Text key={day.date} style={styles.svgXLabel}>{day.dateLabel}</Text>
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.lineGraphLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Rendimiento promedio</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.goalLineLegendMark, { marginRight: 6 }]} />
                  <Text style={styles.legendText}>Meta 100%</Text>
                </View>
              </View>
            </View>
            </ViewShot>
          </View>
        )}

        {/* Tendencia por Trabajador Individual */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="person" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitleWithIcon, { flex: 1 }]}>Tendencia Individual</Text>
            {selectedWorkerId && workerDailyStats.length > 0 && (
              <TouchableOpacity
                style={styles.pdfDownloadBtn}
                onPress={() => generatePdfForChart(
                  `Tendencia - ${activeWorkers.find(w => w.id === selectedWorkerId)?.name || 'Trabajador'}`,
                  workerChartRef
                )}
                disabled={exportingPdf !== null}
              >
                {exportingPdf?.startsWith('Tendencia -') ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.workerSelectContainer}>
            <Select
              label=""
              value={selectedWorkerId}
              onChange={handleWorkerChange}
              options={[
                { label: 'Seleccionar trabajador...', value: '' },
                ...activeWorkers.map(w => ({
                  label: w.code ? `${w.code} - ${w.name}` : w.name,
                  value: w.id,
                })),
              ]}
              placeholder="Seleccionar trabajador"
            />
          </View>
          
          {selectedWorkerId && workerDailyStats.length > 0 && (
            <ViewShot ref={workerChartRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
            <View style={styles.chartContainer}>
              <View style={styles.svgChartWrapper}>
                <View style={styles.simpleChartYAxis}>
                  <Text style={styles.simpleChartYLabel}>150%</Text>
                  <Text style={styles.simpleChartYLabel}>100%</Text>
                  <Text style={styles.simpleChartYLabel}>50%</Text>
                  <Text style={styles.simpleChartYLabel}>0%</Text>
                </View>
                <View style={styles.svgChartArea}>
                  <Svg width="100%" height="100%" style={styles.svgCanvas}>
                    <Line 
                      x1="0" 
                      y1={`${100 - (100 / 150) * 100}%`} 
                      x2="100%" 
                      y2={`${100 - (100 / 150) * 100}%`} 
                      stroke="#9CA3AF" 
                      strokeWidth="1.5" 
                      strokeDasharray="5,5"
                    />
                    {workerDailyStats.map((day, index) => {
                      if (index === 0) return null;
                      const maxPct = 150;
                      const prevDay = workerDailyStats[index - 1];
                      const padding = 8;
                      const x1 = padding + ((index - 1) / (workerDailyStats.length - 1)) * (100 - padding * 2);
                      const y1 = 5 + (100 - Math.min((prevDay.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      const x2 = padding + (index / (workerDailyStats.length - 1)) * (100 - padding * 2);
                      const y2 = 5 + (100 - Math.min((day.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      return (
                        <Line 
                          key={`line-${day.date}`}
                          x1={`${x1}%`} 
                          y1={`${y1}%`} 
                          x2={`${x2}%`} 
                          y2={`${y2}%`} 
                          stroke={colors.primary} 
                          strokeWidth="2" 
                        />
                      );
                    })}
                    {workerDailyStats.map((day, index) => {
                      const maxPct = 150;
                      const padding = 8;
                      const x = workerDailyStats.length > 1 
                        ? padding + (index / (workerDailyStats.length - 1)) * (100 - padding * 2) 
                        : 50;
                      const y = 5 + (100 - Math.min((day.avgPercentage / maxPct) * 100, 100)) * 0.9;
                      return (
                        <Circle 
                          key={`dot-${day.date}`}
                          cx={`${x}%`} 
                          cy={`${y}%`} 
                          r="6" 
                          fill={getPercentageColor(day.avgPercentage)} 
                          stroke="#fff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </Svg>
                  <View style={styles.svgXLabels}>
                    {workerDailyStats.map((day) => (
                      <Text key={day.date} style={styles.svgXLabel}>{day.dateLabel}</Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            </ViewShot>
          )}
          
          {selectedWorkerId && workerDailyStats.length === 0 && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Sin registros en este período</Text>
            </View>
          )}
          
          {!selectedWorkerId && (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="person-search" size={40} color={colors.textLight} />
              <Text style={styles.noDataText}>Selecciona un trabajador para ver su tendencia</Text>
            </View>
          )}
        </View>

        {records.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialIcons name="bar-chart" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No hay datos en este período</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Pickers */}
      {Platform.OS === 'ios' ? (
        <>
          <Modal visible={showStartPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.modalCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Fecha Inicio</Text>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.modalDone}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => date && setStartDate(date)}
                  maximumDate={endDate}
                />
              </View>
            </View>
          </Modal>
          <Modal visible={showEndPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.modalCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Fecha Fin</Text>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.modalDone}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => date && setEndDate(date)}
                  minimumDate={startDate}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
              maximumDate={endDate}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
              minimumDate={startDate}
              maximumDate={new Date()}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
  },
  quickFilterText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
  },
  dateSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  topWorkersContainer: {
    gap: 12,
  },
  topWorkerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
  },
  topWorkerFirst: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  topWorkerRank: {
    marginRight: 12,
  },
  topWorkerRankText: {
    fontSize: 24,
  },
  topWorkerRankFirst: {
    fontSize: 28,
  },
  topWorkerInfo: {
    flex: 1,
  },
  topWorkerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  topWorkerStats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topWorkerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topWorkerPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barDateLabel: {
    width: 45,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
  barTotal: {
    backgroundColor: colors.border,
  },
  barMet: {
    backgroundColor: colors.success,
  },
  barValueSmall: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  lineChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingBottom: 40,
  },
  lineChartBar: {
    flex: 1,
    alignItems: 'center',
  },
  lineChartBarWrapper: {
    width: 8,
    height: 100,
    backgroundColor: colors.border,
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  lineChartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  lineChartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: -6,
  },
  lineChartLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
  },
  lineChartValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  lineChartBaseline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  lineChartBaselineMark: {
    flex: 1,
    height: 1,
    backgroundColor: colors.success,
    opacity: 0.5,
  },
  lineChartBaselineText: {
    fontSize: 10,
    color: colors.success,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalDone: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  workerSelectContainer: {
    marginBottom: 16,
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalBarLabel: {
    width: 50,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  horizontalBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 8,
    overflow: 'visible',
    position: 'relative',
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 12,
  },
  horizontalBarValue: {
    width: 50,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  metaLine: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 2,
    backgroundColor: '#1E40AF',
    zIndex: 10,
  },
  metaLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLegendLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1E40AF',
    marginRight: 8,
  },
  metaLegendText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  noDataContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  verticalChartWrapper: {
    marginBottom: 8,
    minWidth: screenWidth - 80,
    paddingLeft: 40,
  },
  verticalChartArea: {
    height: 180,
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1E40AF',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalLineLabel: {
    position: 'absolute',
    left: -35,
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
  },
  verticalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingTop: 20,
    gap: 8,
  },
  verticalBarWrapper: {
    width: 50,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  verticalBarValue: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  verticalBarTrack: {
    width: 24,
    height: '70%',
    backgroundColor: colors.border,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  verticalBar: {
    width: '100%',
    borderRadius: 12,
  },
  verticalBarLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    width: 40,
  },
  goalLineLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  goalLineLegendMark: {
    width: 20,
    height: 2,
    backgroundColor: '#1E40AF',
    marginRight: 6,
  },
  goalLineLegendText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
  },
  lineGraphWrapper: {
    flexDirection: 'row',
    height: 180,
  },
  lineGraphYAxis: {
    width: 35,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  lineGraphYLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  lineGraphArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 8,
  },
  lineGraphGoalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1E40AF',
    opacity: 0.5,
  },
  lineGraphContent: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'flex-end',
    paddingBottom: 25,
  },
  lineGraphPoint: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  lineGraphDotWrapper: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  lineGraphDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    left: '50%',
    marginLeft: -5,
    zIndex: 10,
  },
  lineGraphLine: {
    position: 'absolute',
    width: 2,
    left: '50%',
    marginLeft: -1,
  },
  lineGraphXLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    position: 'absolute',
    bottom: 0,
  },
  lineGraphLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },

  verticalBarLabelContainer: {
    height: 90,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  verticalBarLabelVertical: {
    fontSize: 9,
    color: colors.text,
    fontWeight: '500',
    transform: [{ rotate: '-90deg' }],
    width: 85,
    textAlign: 'right',
  },
  simpleChartWrapper: {
    flexDirection: 'row',
    height: 180,
    paddingTop: 10,
  },
  simpleChartYAxis: {
    width: 35,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  simpleChartYLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  simpleChartBars: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    height: 2,
    backgroundColor: '#1E40AF',
  },
  simpleChartContent: {
    flexDirection: 'row',
    height: '100%',
    paddingBottom: 20,
  },
  simpleChartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  simpleChartDotArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  simpleChartDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    left: '50%',
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  simpleChartDotLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
    left: '50%',
    marginLeft: -15,
    width: 30,
    textAlign: 'center',
  },
  simpleChartXLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 10,
    color: colors.textSecondary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  connectingLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.primary,
  },
  connectingLineHorizontal: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary,
    left: '-100%',
    right: '50%',
  },
  linesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    zIndex: 1,
  },
  lineConnector: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary,
    transformOrigin: 'left center',
  },
  lineSegmentVertical: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.primary,
  },
  lineSegmentHorizontal: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary,
  },
  simpleLineConnector: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary,
    zIndex: 0,
  },
  svgChartWrapper: {
    flexDirection: 'row',
    height: 180,
  },
  svgChartArea: {
    flex: 1,
    marginLeft: 8,
  },
  svgCanvas: {
    flex: 1,
  },
  svgXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  svgXLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  pdfDownloadBtn: {
    padding: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    marginLeft: 8,
  },
});
