import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { PerformanceCard, Button, BottomSheet, Input, Select, TimePicker } from '../components';
import { useWorkerStore, useActivityStore, usePerformanceStore } from '../../store';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 290;
const HEADER_MIN_HEIGHT = 90;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [achievedPerformance, setAchievedPerformance] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const scrollY = useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();

  const { workers, fetchWorkers } = useWorkerStore();
  const { activities, fetchActivities } = useActivityStore();
  const { 
    selectedDateRecords,
    selectedDate,
    stats, 
    setSelectedDate,
    fetchRecordsByDate,
    fetchStatsByDate,
    addRecord,
    updateRecord,
    deleteRecord,
    isLoading 
  } = usePerformanceStore();

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const statsScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchWorkers(),
      fetchActivities(),
      fetchRecordsByDate(selectedDate),
      fetchStatsByDate(selectedDate),
    ]);
  };

  const goToPreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateHours = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const checkTimeOverlap = (newStart: string, newEnd: string, existingShifts: any[]): boolean => {
    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);

    for (const shift of existingShifts) {
      const existingStartMin = timeToMinutes(shift.startTime);
      const existingEndMin = timeToMinutes(shift.endTime);

      // Verificar si hay solapamiento
      if (
        (newStartMin >= existingStartMin && newStartMin < existingEndMin) ||
        (newEndMin > existingStartMin && newEndMin <= existingEndMin) ||
        (newStartMin <= existingStartMin && newEndMin >= existingEndMin)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleAddRecord = async () => {
    if (!selectedWorker || !selectedActivity || !achievedPerformance || !startTime || !endTime) {
      showToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    const activity = activities.find(a => a.id === selectedActivity);
    if (!activity) return;

    const hours = calculateHours(startTime, endTime);
    if (hours <= 0) {
      showToast('La hora de fin debe ser mayor a la hora de inicio', 'error');
      return;
    }

    // Verificar si ya existe un registro para este trabajador y actividad en la fecha
    const existingRecord = selectedDateRecords.find(
      r => r.workerId === selectedWorker && 
           r.activityId === selectedActivity &&
           !r.isDeleted
    );

    // Si existe, verificar solapamiento de horarios
    if (existingRecord && existingRecord.shifts && existingRecord.shifts.length > 0) {
      if (checkTimeOverlap(startTime, endTime, existingRecord.shifts)) {
        showToast('Este horario se solapa con un turno ya registrado', 'error');
        return;
      }
    }

    const shift = {
      startTime,
      endTime,
      achievedPerformance: parseFloat(achievedPerformance),
    };

    try {
      await addRecord({
        workerId: selectedWorker,
        activityId: selectedActivity,
        date: format(selectedDate, 'yyyy-MM-dd'),
        achievedPerformance: parseFloat(achievedPerformance),
        expectedPerformance: activity.expectedPerformance,
        shifts: [shift],
        totalHours: hours,
        notes: notes || undefined,
      });
      
      resetForm();
      setShowAddRecord(false);
      await fetchRecordsByDate(selectedDate);
      await fetchStatsByDate(selectedDate);
      showToast('Registro agregado correctamente', 'success');
    } catch (error) {
      showToast('No se pudo agregar el registro', 'error');
    }
  };

  const resetForm = () => {
    setSelectedWorker('');
    setSelectedActivity('');
    setAchievedPerformance('');
    setStartTime('');
    setEndTime('');
    setNotes('');
    setEditingRecord(null);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setSelectedWorker(record.workerId);
    setSelectedActivity(record.activityId);
    setAchievedPerformance(record.achievedPerformance.toString());
    setNotes(record.notes || '');
    setShowEditRecord(true);
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord || !achievedPerformance) {
      showToast('El rendimiento es requerido', 'warning');
      return;
    }

    const activity = activities.find(a => a.id === selectedActivity);
    if (!activity) return;

    try {
      await updateRecord(editingRecord.id, {
        achievedPerformance: parseFloat(achievedPerformance),
        expectedPerformance: activity.expectedPerformance,
        notes: notes || undefined,
      });
      
      resetForm();
      setShowEditRecord(false);
      await fetchRecordsByDate(selectedDate);
      await fetchStatsByDate(selectedDate);
      showToast('Registro actualizado correctamente', 'success');
    } catch (error) {
      showToast('No se pudo actualizar el registro', 'error');
    }
  };

  const handleDeleteRecord = (id: string) => {
    Alert.alert(
      'Eliminar registro',
      '¿Estás seguro de que deseas eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            await deleteRecord(id);
            await fetchRecordsByDate(selectedDate);
            await fetchStatsByDate(selectedDate);
            showToast('Registro eliminado', 'success');
          },
        },
      ]
    );
  };

  const selectedActivityData = activities.find(a => a.id === selectedActivity);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Sticky Animado */}
      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]}>
        {/* Header Expandido - Estilo Original */}
        <Animated.View style={[styles.expandedHeader, { opacity: headerOpacity }]}>
          <View style={styles.headerTop}>
            <View style={styles.dateSelector}>
              <TouchableOpacity 
                onPress={goToPreviousDay} 
                style={styles.dateArrow}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={goToToday} 
                style={styles.dateTouchable}
                activeOpacity={0.7}
              >
                <Text style={styles.dateText}>
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </Text>
                {!isToday && <Text style={styles.todayHint}>Toca para ir a hoy</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={goToNextDay} 
                style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
                disabled={isToday}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-right" size={28} color={isToday ? colors.textLight : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.total}</Text>
              <Text style={styles.statCardLabel}>Total Registros</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.statCardValue, { color: colors.success }]}>{stats.metGoal}</Text>
              <Text style={styles.statCardLabel}>Cumplieron</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.statCardValue, { color: colors.danger }]}>{stats.notMetGoal}</Text>
              <Text style={styles.statCardLabel}>No Cumplieron</Text>
            </View>
          </View>

          <View style={styles.percentageCard}>
            <Text style={styles.percentageLabel}>Porcentaje de cumplimiento</Text>
            <Text style={styles.percentageValue}>{stats.percentage}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.percentage}%` }]} />
            </View>
          </View>
        </Animated.View>

        {/* Mini Header (visible al hacer scroll) */}
        <Animated.View style={[styles.miniHeader, { opacity: miniHeaderOpacity }]} pointerEvents="none">
          <Text style={styles.miniTitle}>Rendimientos</Text>
          <View style={styles.miniStats}>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{stats.total}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <Text style={[styles.miniStatValue, { color: colors.success }]}>{stats.metGoal}</Text>
              <Text style={styles.miniStatLabel}>✓</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <Text style={[styles.miniStatValue, { color: colors.danger }]}>{stats.notMetGoal}</Text>
              <Text style={styles.miniStatLabel}>✗</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStatItem}>
              <Text style={[styles.miniStatValue, { color: colors.primary }]}>{stats.percentage}%</Text>
              <Text style={styles.miniStatLabel}>Meta</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing === true} 
            onRefresh={onRefresh}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isToday ? 'Registros de Hoy' : `Registros del ${format(selectedDate, "d 'de' MMMM", { locale: es })}`}
            </Text>
            <TouchableOpacity onPress={() => setShowAddRecord(true)}>
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Agregar</Text>
              </View>
            </TouchableOpacity>
          </View>

          {selectedDateRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIconText}>☰</Text>
              </View>
              <Text style={styles.emptyText}>No hay registros para esta fecha</Text>
              <Text style={styles.emptySubtext}>
                Toca "Agregar" para registrar el rendimiento
              </Text>
            </View>
          ) : (
            selectedDateRecords.map(record => (
              <PerformanceCard
                key={record.id}
                record={record}
                onPress={() => handleEditRecord(record)}
                onDelete={() => handleDeleteRecord(record.id)}
              />
            ))
          )}
        </View>
      </Animated.ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddRecord(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <BottomSheet visible={showAddRecord} onClose={() => setShowAddRecord(false)}>
        <Text style={styles.sheetTitle}>Nuevo Registro</Text>
        
        <Select
          label="Trabajador"
          placeholder="Seleccionar trabajador"
          options={workers.map(w => ({ label: w.name, value: w.id }))}
          value={selectedWorker}
          onChange={setSelectedWorker}
        />

        <Select
          label="Actividad"
          placeholder="Seleccionar actividad"
          options={activities.map(a => ({ 
            label: `${a.name} (Meta: ${a.expectedPerformance} ${a.unit})`, 
            value: a.id 
          }))}
          value={selectedActivity}
          onChange={setSelectedActivity}
        />

        {selectedActivityData && (
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>
              Meta: {selectedActivityData.expectedPerformance} {selectedActivityData.unit}/hora
            </Text>
          </View>
        )}

        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <TimePicker
              label="Hora Inicio"
              placeholder="08:00"
              value={startTime}
              onChange={setStartTime}
            />
          </View>
          <View style={styles.timeInput}>
            <TimePicker
              label="Hora Fin"
              placeholder="17:00"
              value={endTime}
              onChange={setEndTime}
            />
          </View>
        </View>

        {startTime && endTime && calculateHours(startTime, endTime) > 0 && (
          <View style={styles.hoursInfo}>
            <Text style={styles.hoursText}>
              Horas trabajadas: {calculateHours(startTime, endTime).toFixed(1)}h
            </Text>
          </View>
        )}

        <Input
          label="Rendimiento Logrado"
          placeholder="Ej: 150"
          keyboardType="numeric"
          value={achievedPerformance}
          onChangeText={setAchievedPerformance}
        />

        <Input
          label="Notas (opcional)"
          placeholder="Agregar notas..."
          multiline={true}
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title="Guardar Registro"
          onPress={handleAddRecord}
          loading={isLoading}
        />
      </BottomSheet>

      <BottomSheet visible={showEditRecord} onClose={() => { resetForm(); setShowEditRecord(false); }}>
        <Text style={styles.sheetTitle}>Editar Registro</Text>
        
        <View style={styles.editInfo}>
          <Text style={styles.editInfoLabel}>Trabajador</Text>
          <Text style={styles.editInfoValue}>{editingRecord?.workerName}</Text>
        </View>

        <View style={styles.editInfo}>
          <Text style={styles.editInfoLabel}>Actividad</Text>
          <Text style={styles.editInfoValue}>{editingRecord?.activityName}</Text>
        </View>

        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            Meta: {editingRecord?.expectedPerformance} {editingRecord?.activityUnit}
          </Text>
        </View>

        <Input
          label="Rendimiento Logrado"
          placeholder="Ej: 150"
          keyboardType="numeric"
          value={achievedPerformance}
          onChangeText={setAchievedPerformance}
        />

        <Input
          label="Notas (opcional)"
          placeholder="Agregar notas..."
          multiline={true}
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title="Actualizar Registro"
          onPress={handleUpdateRecord}
          loading={isLoading}
        />
      </BottomSheet>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    zIndex: 1000,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  expandedHeader: {
    padding: 20,
    paddingTop: 45,
  },
  headerTop: {
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dateArrowTextDisabled: {
    color: colors.textLight,
  },
  dateTouchable: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  todayHint: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  exportButton: {
    padding: 4,
  },
  exportButtonFixed: {
    position: 'absolute',
    top: 38,
    right: 20,
    zIndex: 1001,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  percentageCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
  },
  percentageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  miniTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  miniStatItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  miniStatLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  miniStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: '300',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  metaInfo: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metaText: {
    color: colors.primary,
    fontWeight: '500',
  },
  editInfo: {
    marginBottom: 12,
  },
  editInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  editInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exportOptionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  hoursInfo: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hoursText: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
