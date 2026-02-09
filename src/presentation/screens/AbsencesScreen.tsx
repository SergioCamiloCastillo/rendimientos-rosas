import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Input, Button, Sidebar, MenuButton } from '../components';
import { useAbsenceStore } from '../../store';
import { useToast } from '../context/ToastContext';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const AbsencesScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleCount, setPeopleCount] = useState('');
  const [hoursPerPerson, setHoursPerPerson] = useState('');
  const { showToast } = useToast();

  const {
    absence,
    selectedDate,
    isLoading,
    setSelectedDate,
    fetchAbsenceByDate,
    saveAbsence,
    deleteAbsence,
  } = useAbsenceStore();

  useEffect(() => {
    fetchAbsenceByDate(selectedDate);
  }, []);

  useEffect(() => {
    if (absence) {
      setPeopleCount((absence.peopleCount ?? 0).toString());
      setHoursPerPerson((absence.hoursPerPerson ?? 0).toString());
    } else {
      setPeopleCount('');
      setHoursPerPerson('');
    }
  }, [absence]);

  const countNum = parseInt(peopleCount) || 0;
  const hppNum = parseFloat(hoursPerPerson.replace(',', '.')) || 0;
  const totalHours = Math.round(countNum * hppNum * 100) / 100;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAbsenceByDate(selectedDate);
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

  const handleSave = async () => {
    if (countNum <= 0) {
      showToast('Ingresa un número válido de personas', 'warning');
      return;
    }
    if (hppNum <= 0) {
      showToast('Ingresa las horas por persona', 'warning');
      return;
    }

    try {
      await saveAbsence({
        date: format(selectedDate, 'yyyy-MM-dd'),
        peopleCount: countNum,
        hoursPerPerson: hppNum,
        hoursLost: totalHours,
      });
      showToast(absence ? 'Ausencia actualizada' : 'Ausencia registrada', 'success');
    } catch {
      showToast('Error al guardar la ausencia', 'error');
    }
  };

  const handleDelete = () => {
    if (!absence) return;
    Alert.alert(
      'Eliminar Ausencia',
      '¿Eliminar el registro de ausencia de este día?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAbsence();
              showToast('Ausencia eliminada', 'success');
            } catch {
              showToast('Error al eliminar', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.title}>Ausencias</Text>
        <View style={{ width: 40 }} />
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

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person-off" size={24} color={colors.danger} />
            <Text style={styles.cardTitle}>Registro del día</Text>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputField}>
              <Input
                label="Personas ausentes"
                placeholder="0"
                value={peopleCount}
                onChangeText={setPeopleCount}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputField}>
              <Input
                label="Horas por persona"
                placeholder="0"
                value={hoursPerPerson}
                onChangeText={(v) => setHoursPerPerson(v.replace(',', '.'))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {countNum > 0 && hppNum > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{countNum} personas × {hppNum} hrs =</Text>
              <Text style={styles.totalValue}>{totalHours} hrs perdidas</Text>
            </View>
          )}

          <Button
            title={absence ? 'Actualizar' : 'Guardar'}
            onPress={handleSave}
            loading={isLoading}
          />

          {absence && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <MaterialIcons name="delete" size={20} color={colors.danger} />
              <Text style={styles.deleteText}>Eliminar registro</Text>
            </TouchableOpacity>
          )}
        </View>

        {absence && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{absence.peopleCount}</Text>
                <Text style={styles.summaryLabel}>Personas</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{absence.hoursPerPerson ?? 0}</Text>
                <Text style={styles.summaryLabel}>Hrs/persona</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{absence.hoursLost}</Text>
                <Text style={styles.summaryLabel}>Total hrs</Text>
              </View>
            </View>
          </View>
        )}

        {!absence && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={64} color={colors.success} />
            <Text style={styles.emptyText}>Sin ausencias</Text>
            <Text style={styles.emptySubtext}>No hay ausencias registradas para este día</Text>
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  inputField: {
    flex: 1,
  },
  totalRow: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.danger,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
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
});
