import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { PerformanceCard, Button, BottomSheet, Input, Select, TimePicker, Sidebar, MenuButton } from '../components';
import { useWorkerStore, useActivityStore, usePerformanceStore } from '../../store';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

const { width } = Dimensions.get('window');
const HEADER_BASE_HEIGHT = 290;
const HEADER_ACTIVITY_ROW_HEIGHT = 24;
const HEADER_MIN_HEIGHT = 60;

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
  const [block, setBlock] = useState('');
  const [notes, setNotes] = useState('');
  const [editingShifts, setEditingShifts] = useState<any[]>([]);
  const [shiftErrors, setShiftErrors] = useState<number[]>([]);

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

  // Calcular número de actividades únicas del día
  const uniqueActivitiesCount = useMemo(() => {
    const uniqueActivities = new Set(selectedDateRecords.map(r => r.activityId));
    return Math.max(uniqueActivities.size, 1);
  }, [selectedDateRecords]);

  // Altura dinámica del header basada en número de actividades
  const headerMaxHeight = HEADER_BASE_HEIGHT + (uniqueActivitiesCount * HEADER_ACTIVITY_ROW_HEIGHT);
  const headerScrollDistance = headerMaxHeight - HEADER_MIN_HEIGHT;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, headerScrollDistance],
    outputRange: [headerMaxHeight, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  // El header expandido se oculta rápidamente al hacer scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // El mini header aparece cuando el expandido se oculta
  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const statsScale = scrollY.interpolate({
    inputRange: [0, headerScrollDistance],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Refrescar datos cuando el Dashboard recibe foco (al volver de otras pantallas)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDate])
  );

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

  // Convertir hora 24h a formato 12h AM/PM
  const formatTimeToAMPM = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
    if (!selectedWorker || !selectedActivity || !achievedPerformance || !startTime || !endTime || !block) {
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

    // Determinar el expectedPerformance a usar:
    // - Si es HOY: usar siempre la meta actual de la actividad
    // - Si es otro día: mantener la meta del registro existente
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const existingRecordWithActivity = selectedDateRecords.find(
      r => r.activityId === selectedActivity && !r.isDeleted
    );
    const expectedPerformanceToUse = isToday 
      ? activity.expectedPerformance 
      : (existingRecordWithActivity?.expectedPerformance || activity.expectedPerformance);

    const shift = {
      startTime,
      endTime,
      block: block || undefined,
      achievedPerformance: parseFloat(achievedPerformance),
    };

    try {
      await addRecord({
        workerId: selectedWorker,
        activityId: selectedActivity,
        date: format(selectedDate, 'yyyy-MM-dd'),
        achievedPerformance: parseFloat(achievedPerformance),
        expectedPerformance: expectedPerformanceToUse,
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
    setBlock('');
    setNotes('');
    setEditingRecord(null);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setSelectedWorker(record.workerId);
    setSelectedActivity(record.activityId);
    setAchievedPerformance(record.achievedPerformance.toString());
    setBlock(record.block || '');
    setNotes(record.notes || '');
    setEditingShifts(record.shifts ? [...record.shifts] : []);
    setShiftErrors([]);
    setShowEditRecord(true);
  };

  const handleUpdateShift = (index: number, field: string, value: any) => {
    const newShifts = [...editingShifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    setEditingShifts(newShifts);
    // Limpiar errores cuando el usuario modifica un turno
    if (shiftErrors.includes(index)) {
      setShiftErrors(shiftErrors.filter(i => i !== index));
    }
  };

  const handleDeleteShift = (index: number) => {
    const newShifts = editingShifts.filter((_, i) => i !== index);
    setEditingShifts(newShifts);
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) {
      showToast('Error al actualizar', 'error');
      return;
    }

    if (editingShifts.length === 0) {
      showToast('Debe haber al menos un turno', 'error');
      return;
    }

    // Validar que todos los turnos tengan datos válidos
    for (const shift of editingShifts) {
      if (!shift.startTime || !shift.endTime || !shift.achievedPerformance || !shift.block) {
        showToast('Todos los turnos deben tener bloque, horarios y rendimiento', 'error');
        return;
      }
      const hours = calculateHours(shift.startTime, shift.endTime);
      if (hours <= 0) {
        showToast('La hora de fin debe ser mayor a la hora de inicio', 'error');
        return;
      }
    }

    // Validar que no haya solapamiento entre turnos
    const overlappingShifts: number[] = [];
    for (let i = 0; i < editingShifts.length; i++) {
      for (let j = i + 1; j < editingShifts.length; j++) {
        if (checkTimeOverlap(editingShifts[i].startTime, editingShifts[i].endTime, [editingShifts[j]])) {
          if (!overlappingShifts.includes(i)) overlappingShifts.push(i);
          if (!overlappingShifts.includes(j)) overlappingShifts.push(j);
        }
      }
    }
    
    if (overlappingShifts.length > 0) {
      setShiftErrors(overlappingShifts);
      showToast('Los turnos no pueden solaparse entre sí', 'error');
      return;
    }

    // Convertir achievedPerformance a números y calcular totales
    const shiftsWithNumbers = editingShifts.map(s => ({
      startTime: s.startTime,
      endTime: s.endTime,
      block: s.block || undefined,
      achievedPerformance: parseFloat(s.achievedPerformance.toString()) || 0,
    }));
    const totalAchieved = shiftsWithNumbers.reduce((sum, s) => sum + s.achievedPerformance, 0);
    const totalHours = shiftsWithNumbers.reduce((sum, s) => {
      return sum + calculateHours(s.startTime, s.endTime);
    }, 0);

    try {
      await updateRecord(editingRecord.id, {
        shifts: shiftsWithNumbers,
        achievedPerformance: totalAchieved,
        totalHours,
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

  const [showMenu, setShowMenu] = useState(false);
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Mini Header Fijo */}
      <View style={styles.fixedMiniHeader}>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
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
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing === true} 
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header Expandido */}
        <View style={styles.expandedHeader}>
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

          <View style={styles.bottomStatsRow}>
            <View style={styles.percentageCard}>
              <Text style={styles.percentageLabel}>Porcentaje de cumplimiento</Text>
              <Text style={styles.percentageValue}>{stats.percentage}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats.percentage}%` }]} />
              </View>
            </View>
            <View style={styles.totalUnitsCard}>
              <Text style={styles.percentageLabel}>Total del día</Text>
              <View style={styles.activityTotalsList}>
                {Object.entries(
                  selectedDateRecords.reduce((acc, r) => {
                    const key = r.activityName;
                    if (!acc[key]) acc[key] = { total: 0, unit: r.activityUnit };
                    acc[key].total += r.achievedPerformance;
                    return acc;
                  }, {} as Record<string, { total: number; unit: string }>)
                ).map(([activity, data]) => (
                  <View key={activity} style={styles.activityTotalRow}>
                    <Text style={styles.activityTotalName} numberOfLines={1}>{activity}</Text>
                    <Text style={styles.activityTotalValue}>{data.total} {data.unit}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
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
            [...selectedDateRecords]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(record => (
                <PerformanceCard
                  key={record.id}
                  record={record}
                  onPress={() => handleEditRecord(record)}
                  onDelete={() => handleDeleteRecord(record.id)}
                />
              ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddRecord(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <BottomSheet visible={showAddRecord} onClose={() => { resetForm(); setShowAddRecord(false); }}>
        <Text style={styles.sheetTitle}>Nuevo Registro</Text>
        <Text style={styles.sheetDate}>
          {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </Text>
        
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
              onChange={(time) => {
                if (startTime && calculateHours(startTime, time) <= 0) {
                  showToast('La hora fin debe ser mayor a la hora inicio', 'error');
                  return;
                }
                setEndTime(time);
              }}
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
          keyboardType="decimal-pad"
          value={achievedPerformance}
          onChangeText={(value) => setAchievedPerformance(value.replace(',', '.'))}
        />

        <Text style={styles.blockSelectorLabel}>Bloque</Text>
        <View style={styles.blockSelectorRow}>
          {['21', '17', '16', '15', '10'].map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.blockBtn, block === b && styles.blockBtnActive]}
              onPress={() => setBlock(block === b ? '' : b)}
            >
              <Text style={[styles.blockBtnText, block === b && styles.blockBtnTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
        
        <View style={styles.editInfoCard}>
          <View style={styles.editInfoRow}>
            <View style={styles.editInfoItem}>
              <Text style={styles.editInfoLabel}>Trabajador</Text>
              <Text style={styles.editInfoValue}>
                {editingRecord?.workerCode ? `${editingRecord.workerCode} - ` : ''}{editingRecord?.workerName}
              </Text>
            </View>
            <View style={styles.editInfoItem}>
              <Text style={styles.editInfoLabel}>Actividad</Text>
              <Text style={styles.editInfoValue}>{editingRecord?.activityName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            Meta: {editingRecord?.expectedPerformance} {editingRecord?.activityUnit}/hora
          </Text>
        </View>

        <Text style={styles.editSectionTitle}>Turnos</Text>
        {editingShifts.map((shift: any, index: number) => (
          <View key={index} style={[styles.editShiftCard, shiftErrors.includes(index) && styles.editShiftCardError]}>
            <View style={styles.editShiftHeader}>
              <Text style={styles.editShiftLabel}>Turno {index + 1}</Text>
              {editingShifts.length > 1 && (
                <TouchableOpacity 
                  onPress={() => handleDeleteShift(index)}
                  style={styles.deleteShiftBtn}
                >
                  <MaterialIcons name="close" size={20} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.editShiftFields}>
              <View style={styles.editShiftTimeRow}>
                <View style={styles.editShiftTimeField}>
                  <TimePicker
                    label="Hora Inicio"
                    placeholder="08:00"
                    value={shift.startTime}
                    onChange={(value) => handleUpdateShift(index, 'startTime', value)}
                  />
                </View>
                <View style={styles.editShiftTimeField}>
                  <TimePicker
                    label="Hora Fin"
                    placeholder="17:00"
                    value={shift.endTime}
                    onChange={(value) => handleUpdateShift(index, 'endTime', value)}
                  />
                </View>
              </View>
              
              <View style={styles.editShiftTimeRow}>
                <View style={styles.editShiftTimeField}>
                  <Text style={styles.blockSelectorLabel}>Bloque</Text>
                  <View style={styles.blockSelectorRow}>
                    {['21', '17', '16', '15', '10'].map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.blockBtnSmall, shift.block === b && styles.blockBtnActive]}
                        onPress={() => handleUpdateShift(index, 'block', shift.block === b ? '' : b)}
                      >
                        <Text style={[styles.blockBtnTextSmall, shift.block === b && styles.blockBtnTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.editShiftTimeField}>
                  <Input
                    label="Rendimiento"
                    placeholder="Ej: 340"
                    keyboardType="decimal-pad"
                    value={shift.achievedPerformance.toString()}
                    onChangeText={(value) => handleUpdateShift(index, 'achievedPerformance', value.replace(',', '.'))}
                  />
                </View>
              </View>
            </View>
          </View>
        ))}

        <Input
          label="Notas (opcional)"
          placeholder="Agregar notas..."
          multiline={true}
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title="Guardar Cambios"
          onPress={handleUpdateRecord}
          loading={isLoading}
        />

        <TouchableOpacity
          style={styles.deleteRecordBtn}
          onPress={() => {
            if (editingRecord) {
              setShowEditRecord(false);
              handleDeleteRecord(editingRecord.id);
            }
          }}
        >
          <MaterialIcons name="delete" size={20} color={colors.danger} />
          <Text style={styles.deleteRecordText}>Eliminar registro</Text>
        </TouchableOpacity>
      </BottomSheet>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedMiniHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: 4,
  },
  menuList: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  submenuContainer: {
    backgroundColor: colors.gray[50],
    paddingLeft: 24,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  submenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surface,
    zIndex: 1001,
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sidebarContent: {
    flex: 1,
  },
  expandedHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
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
    padding: 8,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  percentageCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
  },
  totalUnitsCard: {
    flex: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
  },
  totalUnitsLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  activityTotalsList: {
    marginTop: 4,
    paddingBottom: 8,
  },
  activityTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activityTotalName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  activityTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  percentageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '700',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  sheetDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
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
  editInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  editInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  editInfoItem: {
    flex: 1,
  },
  editInfoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  editInfoValue: {
    fontSize: 15,
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
  shiftDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  shiftDetailTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  shiftDetailPerf: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editShiftCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editShiftCardError: {
    borderColor: colors.danger,
    borderWidth: 2,
    backgroundColor: colors.dangerLight,
  },
  editShiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editShiftLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteShiftBtn: {
    padding: 4,
  },
  editShiftFields: {
    gap: 12,
  },
  editShiftTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editShiftTimeField: {
    flex: 1,
  },
  deleteRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteRecordText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  blockSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  blockSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  blockBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  blockBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  blockBtnTextActive: {
    color: colors.primary,
  },
  blockBtnSmall: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockBtnTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
