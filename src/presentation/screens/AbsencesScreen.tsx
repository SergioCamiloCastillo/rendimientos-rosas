import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Button, BottomSheet, Select, Sidebar, MenuButton } from '../components';
import { useAbsenceStore, useWorkerStore } from '../../store';
import { AbsenceWithWorker } from '../../domain/entities';
import { useToast } from '../context/ToastContext';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const ABSENCE_TYPES = [
  { label: 'Falta', value: 'falta' },
  { label: 'Permiso', value: 'permiso' },
  { label: 'Incapacidad', value: 'incapacidad' },
  { label: 'Otro', value: 'otro' },
];

export const AbsencesScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddAbsence, setShowAddAbsence] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [absenceType, setAbsenceType] = useState('falta');
  const [reason, setReason] = useState('');
  const { showToast } = useToast();

  const {
    absences,
    selectedDate,
    isLoading,
    setSelectedDate,
    fetchAbsencesByDate,
    addAbsence,
    deleteAbsence,
  } = useAbsenceStore();

  const { workers, fetchWorkers } = useWorkerStore();

  useEffect(() => {
    fetchWorkers();
    fetchAbsencesByDate(selectedDate);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAbsencesByDate(selectedDate);
    setRefreshing(false);
  };

  const goToPreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const resetForm = () => {
    setSelectedWorker('');
    setAbsenceType('falta');
    setReason('');
  };

  const handleAddAbsence = async () => {
    if (!selectedWorker) {
      showToast('Selecciona un trabajador', 'error');
      return;
    }

    try {
      await addAbsence({
        workerId: selectedWorker,
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: absenceType as 'falta' | 'permiso' | 'incapacidad' | 'otro',
        reason,
      });
      showToast('Ausencia registrada', 'success');
      setShowAddAbsence(false);
      resetForm();
    } catch (error) {
      showToast((error as Error).message, 'error');
    }
  };

  const handleDeleteAbsence = (absence: AbsenceWithWorker) => {
    Alert.alert(
      'Eliminar Ausencia',
      `¿Eliminar la ausencia de ${absence.workerName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteAbsence(absence.id);
            showToast('Ausencia eliminada', 'success');
          },
        },
      ]
    );
  };

  const getTypeLabel = (type: string) => {
    const found = ABSENCE_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'falta': return colors.danger;
      case 'permiso': return colors.warning;
      case 'incapacidad': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const renderAbsenceItem = ({ item }: { item: AbsenceWithWorker }) => (
    <View style={styles.absenceCard}>
      <View style={styles.absenceHeader}>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>
            {item.workerCode ? `${item.workerCode} - ` : ''}{item.workerName}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
            <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
              {getTypeLabel(item.type)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDeleteAbsence(item)}>
          <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>
      {item.reason && (
        <Text style={styles.reasonText}>{item.reason}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.title}>Ausencias</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddAbsence(true)}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.dateArrow}>
          <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateTouchable}>
          <Text style={styles.dateText}>
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </Text>
          {!isToday && <Text style={styles.todayHint}>Toca para ir a hoy</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goToNextDay}
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          disabled={isToday}
        >
          <MaterialIcons name="chevron-right" size={28} color={isToday ? colors.textLight : colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{absences.length}</Text>
          <Text style={styles.statLabel}>Ausencias del día</Text>
        </View>
      </View>

      <FlatList
        data={absences}
        keyExtractor={item => item.id}
        renderItem={renderAbsenceItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={64} color={colors.success} />
            <Text style={styles.emptyText}>Sin ausencias</Text>
            <Text style={styles.emptySubtext}>No hay ausencias registradas para este día</Text>
          </View>
        }
      />

      <BottomSheet visible={showAddAbsence} onClose={() => { setShowAddAbsence(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Registrar Ausencia</Text>
        <Text style={styles.sheetDate}>
          {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </Text>

        <Select
          label="Trabajador"
          placeholder="Seleccionar trabajador"
          options={workers.map(w => ({ 
            label: w.code ? `${w.code} - ${w.name}` : w.name, 
            value: w.id 
          }))}
          value={selectedWorker}
          onChange={setSelectedWorker}
        />

        <Select
          label="Tipo de ausencia"
          placeholder="Seleccionar tipo"
          options={ABSENCE_TYPES}
          value={absenceType}
          onChange={setAbsenceType}
        />

        <Button
          title="Registrar Ausencia"
          onPress={handleAddAbsence}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  dateTouchable: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  todayHint: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  statsRow: {
    padding: 16,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.danger,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  absenceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  absenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sheetDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
});
