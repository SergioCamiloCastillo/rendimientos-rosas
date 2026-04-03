import React, { useEffect, useState, useMemo } from 'react';
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

interface AbsenceEntryForm {
  peopleCount: string;
  hoursPerPerson: string;
}

const emptyEntry: AbsenceEntryForm = { peopleCount: '', hoursPerPerson: '' };

export const AbsencesScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<AbsenceEntryForm[]>([{ ...emptyEntry }]);
  const [saveAttempted, setSaveAttempted] = useState(false);
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
      // Si tiene entries guardadas, cargarlas; sino crear una entrada con los datos legacy
      if (absence.entries && absence.entries.length > 0) {
        setEntries(absence.entries.map(e => ({
          peopleCount: e.peopleCount.toString(),
          hoursPerPerson: e.hoursPerPerson.toString(),
        })));
      } else {
        setEntries([{
          peopleCount: (absence.peopleCount ?? 0).toString(),
          hoursPerPerson: (absence.hoursPerPerson ?? 0).toString(),
        }]);
      }
    } else {
      setEntries([{ ...emptyEntry }]);
    }
    setSaveAttempted(false);
  }, [absence]);

  // Helpers
  const isEntryEmpty = (entry: AbsenceEntryForm) => !entry.peopleCount && !entry.hoursPerPerson;
  const isEntryFilled = (entry: AbsenceEntryForm) => !isEntryEmpty(entry);

  const handleUpdateEntry = (index: number, field: keyof AbsenceEntryForm, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value.replace(',', '.') };
    setEntries(updated);
  };

  const handleAddEntry = () => {
    setEntries([...entries, { ...emptyEntry }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  // Validación por entrada (solo para las que tienen datos)
  const entryValidation = useMemo(() => {
    return entries.map((entry) => {
      if (isEntryEmpty(entry)) return {};
      const errors: { peopleCount?: string; hoursPerPerson?: string } = {};
      const count = parseInt(entry.peopleCount);
      const hours = parseFloat(entry.hoursPerPerson);
      if (!entry.peopleCount || isNaN(count) || count <= 0) errors.peopleCount = 'Requerido';
      if (!entry.hoursPerPerson || isNaN(hours) || hours <= 0) errors.hoursPerPerson = 'Requerido';
      return errors;
    });
  }, [entries]);

  // Totales calculados
  const totals = useMemo(() => {
    let totalPeople = 0;
    let totalHoursLost = 0;
    entries.forEach(entry => {
      const count = parseInt(entry.peopleCount) || 0;
      const hours = parseFloat(entry.hoursPerPerson) || 0;
      if (count > 0 && hours > 0) {
        totalPeople += count;
        totalHoursLost += Math.round(count * hours * 100) / 100;
      }
    });
    return { totalPeople, totalHoursLost };
  }, [entries]);

  const filledEntries = entries.filter(e => isEntryFilled(e));
  const hasErrors = filledEntries.length === 0 || entryValidation.some(e => Object.keys(e).length > 0);

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
    setSaveAttempted(true);

    const validEntries = entries.filter(e => isEntryFilled(e));

    if (validEntries.length === 0) {
      showToast('Agrega al menos una entrada de ausencia', 'warning');
      return;
    }

    // Verificar que las entradas con datos estén completas
    const filledIndices = entries.map((e, i) => isEntryFilled(e) ? i : -1).filter(i => i >= 0);
    const hasFieldErrors = filledIndices.some(i => Object.keys(entryValidation[i]).length > 0);
    if (hasFieldErrors) {
      showToast('Completa todos los campos de las entradas', 'warning');
      return;
    }

    // Construir entries para guardar
    const entriesToSave = validEntries.map(e => ({
      peopleCount: parseInt(e.peopleCount),
      hoursPerPerson: parseFloat(e.hoursPerPerson),
    }));

    // Calcular totales
    const totalPeople = entriesToSave.reduce((sum, e) => sum + e.peopleCount, 0);
    const totalHoursLost = entriesToSave.reduce((sum, e) => sum + Math.round(e.peopleCount * e.hoursPerPerson * 100) / 100, 0);
    // hoursPerPerson promedio para compatibilidad
    const avgHoursPerPerson = totalPeople > 0 ? Math.round((totalHoursLost / totalPeople) * 100) / 100 : 0;

    try {
      await saveAbsence({
        date: format(selectedDate, 'yyyy-MM-dd'),
        entries: entriesToSave,
        peopleCount: totalPeople,
        hoursPerPerson: avgHoursPerPerson,
        hoursLost: totalHoursLost,
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

          {entries.map((entry, index) => {
            const count = parseInt(entry.peopleCount) || 0;
            const hours = parseFloat(entry.hoursPerPerson) || 0;
            const entryTotal = Math.round(count * hours * 100) / 100;
            const showFieldErrors = saveAttempted && isEntryFilled(entry);
            return (
              <View key={index} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryLabel}>
                    {entries.length > 1 ? `Entrada ${index + 1}` : 'Ausencia'}
                  </Text>
                  {entries.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveEntry(index)}
                      style={styles.removeEntryBtn}
                    >
                      <MaterialIcons name="close" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputField}>
                    <Input
                      label="Personas"
                      placeholder="0"
                      value={entry.peopleCount}
                      onChangeText={(v) => handleUpdateEntry(index, 'peopleCount', v)}
                      keyboardType="number-pad"
                      error={showFieldErrors ? entryValidation[index]?.peopleCount : undefined}
                    />
                  </View>
                  <View style={styles.inputField}>
                    <Input
                      label="Horas/persona"
                      placeholder="0"
                      value={entry.hoursPerPerson}
                      onChangeText={(v) => handleUpdateEntry(index, 'hoursPerPerson', v)}
                      keyboardType="decimal-pad"
                      error={showFieldErrors ? entryValidation[index]?.hoursPerPerson : undefined}
                    />
                  </View>
                </View>

                {count > 0 && hours > 0 && (
                  <View style={styles.entryTotalRow}>
                    <Text style={styles.entryTotalLabel}>
                      {count} {count === 1 ? 'persona' : 'personas'} × {hours} hrs
                    </Text>
                    <Text style={styles.entryTotalValue}>= {entryTotal} hrs</Text>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addEntryButton}
            onPress={handleAddEntry}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addEntryButtonText}>Agregar otra entrada</Text>
          </TouchableOpacity>

          {totals.totalPeople > 0 && (
            <View style={styles.grandTotalRow}>
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{totals.totalPeople}</Text>
                <Text style={styles.grandTotalLabel}>
                  {totals.totalPeople === 1 ? 'persona' : 'personas'}
                </Text>
              </View>
              <View style={styles.grandTotalDivider} />
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{totals.totalHoursLost}</Text>
                <Text style={styles.grandTotalLabel}>hrs perdidas</Text>
              </View>
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
  entryCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  removeEntryBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputField: {
    flex: 1,
  },
  entryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  entryTotalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  entryTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
  },
  addEntryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 20,
  },
  grandTotalItem: {
    alignItems: 'center',
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.danger,
  },
  grandTotalLabel: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
    marginTop: 2,
  },
  grandTotalDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.danger,
    opacity: 0.3,
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
