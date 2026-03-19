import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Sidebar, MenuButton, BottomSheet, Select, Input, Button } from '../components';
import { useActivityStore, useWeeklyGoalStore, useBlockStore } from '../../store';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

export const WeeklyGoalsScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [editBlock, setEditBlock] = useState('');
  const [editGoalAmount, setEditGoalAmount] = useState('');
  const [editActivityName, setEditActivityName] = useState('');
  const [editActivityUnit, setEditActivityUnit] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const { activities, fetchActivities } = useActivityStore();
  const { goals, fetchGoals, addGoalForBlocks, updateGoal, deleteGoal, setSelectedWeekStart, isLoading } = useWeeklyGoalStore();
  const { blocks: blockList, fetchBlocks } = useBlockStore();
  const BLOCKS = blockList.map(b => b.name);
  const [blockGoals, setBlockGoals] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  useEffect(() => {
    fetchActivities();
    fetchBlocks();
  }, []);

  useEffect(() => {
    setBlockGoals(Object.fromEntries(BLOCKS.map(b => [b, ''])));
  }, [blockList]);

  useEffect(() => {
    setSelectedWeekStart(weekStartStr);
  }, [weekStartStr]);

  useFocusEffect(
    React.useCallback(() => {
      fetchGoals();
    }, [weekStartStr])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActivities(), fetchGoals()]);
    setRefreshing(false);
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const updateBlockGoal = (block: string, value: string) => {
    setBlockGoals(prev => ({ ...prev, [block]: value.replace(',', '.') }));
  };

  const handleAddGoal = async () => {
    if (!selectedActivity) {
      showToast('Selecciona una actividad', 'warning');
      return;
    }

    // Recoger bloques con meta válida
    const entries = BLOCKS
      .filter(b => (blockGoals[b] || '').trim() !== '')
      .map(b => ({ block: b, amount: parseFloat(blockGoals[b] || '0') }));

    if (entries.length === 0) {
      showToast('Ingresa la meta en al menos un bloque', 'warning');
      return;
    }

    const invalid = entries.find(e => isNaN(e.amount) || e.amount <= 0);
    if (invalid) {
      showToast(`La meta del bloque ${invalid.block} debe ser un número positivo`, 'warning');
      return;
    }

    try {
      // Crear una meta por cada bloque con su cantidad individual
      for (const entry of entries) {
        await addGoalForBlocks(
          { activityId: selectedActivity, weekStartDate: weekStartStr, goalAmount: entry.amount },
          [entry.block],
        );
      }
      showToast(`Meta agregada para ${entries.length} bloque(s)`, 'success');
      setSelectedActivity('');
      setBlockGoals(prev => Object.fromEntries(BLOCKS.map(b => [b, ''])));
      setShowAddGoal(false);
    } catch {
      showToast('Error al agregar la meta', 'error');
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingGoalId(item.id);
    setEditBlock(item.block || '');
    setEditGoalAmount(item.goalAmount.toString());
    setEditActivityName(item.activityName);
    setEditActivityUnit(item.activityUnit);
    setShowEditGoal(true);
  };

  const handleEditGoal = async () => {
    if (!editGoalAmount.trim()) {
      showToast('Ingresa la meta', 'warning');
      return;
    }
    const amount = parseFloat(editGoalAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('La meta debe ser un número positivo', 'warning');
      return;
    }
    try {
      await updateGoal(editingGoalId, { goalAmount: amount });
      setShowEditGoal(false);
      showToast('Meta actualizada', 'success');
    } catch {
      showToast('Error al actualizar la meta', 'error');
    }
  };

  const handleDeleteGoal = (id: string, activityName: string, block?: string) => {
    Alert.alert(
      'Eliminar meta',
      `¿Eliminar la meta de ${activityName}${block ? ` - Bloque ${block}` : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(id);
              showToast('Meta eliminada', 'success');
            } catch {
              showToast('Error al eliminar la meta', 'error');
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return colors.success;
    if (percentage >= 75) return colors.primary;
    if (percentage >= 50) return colors.warning;
    return colors.danger;
  };

  const isCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') === weekStartStr;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.title}>Metas Semanales</Text>
        <TouchableOpacity onPress={() => setShowAddGoal(true)}>
          <MaterialIcons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekArrow}>
          <MaterialIcons name="chevron-left" size={28} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.weekInfo}>
          <Text style={styles.weekLabel}>{isCurrentWeek ? 'Semana actual' : 'Semana'}</Text>
          <Text style={styles.weekDates}>
            {format(currentWeekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNextWeek} style={styles.weekArrow}>
          <MaterialIcons name="chevron-right" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Sin metas para esta semana</Text>
            <Text style={styles.emptySubtitle}>
              Toca el botón + para agregar una meta semanal
            </Text>
          </View>
        ) : (
          [...goals].sort((a, b) => (a.block || '').localeCompare(b.block || '')).map((item) => (
            <View key={item.id} style={styles.progressCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityName}>{item.activityName}</Text>
                  <Text style={styles.blockLabel}>Bloque {item.block}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.cardActionBtn}>
                    <MaterialIcons name="edit" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGoal(item.id, item.activityName, item.block)} style={styles.cardActionBtn}>
                    <MaterialIcons name="delete" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.percentageRow}>
                <View style={[styles.percentageBadge, { backgroundColor: getProgressColor(item.percentage) }]}>
                  <Text style={styles.percentageText}>{item.percentage}%</Text>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${Math.min(100, item.percentage)}%`,
                      backgroundColor: getProgressColor(item.percentage),
                    }
                  ]} 
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Meta</Text>
                  <Text style={styles.statValue}>{item.goalAmount.toLocaleString()} {item.activityUnit}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Logrado</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {item.achieved.toLocaleString()} {item.activityUnit}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Faltante</Text>
                  <Text style={[styles.statValue, { color: item.remaining > 0 ? colors.danger : colors.success }]}>
                    {item.remaining.toLocaleString()} {item.activityUnit}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={showAddGoal} onClose={() => setShowAddGoal(false)}>
        <Text style={styles.sheetTitle}>Nueva Meta Semanal</Text>
        <Text style={styles.sheetSubtitle}>
          Semana: {format(currentWeekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </Text>

        <Select
          label="Actividad"
          placeholder="Seleccionar actividad"
          options={activities.map(a => ({ label: a.name, value: a.id }))}
          value={selectedActivity}
          onChange={setSelectedActivity}
        />

        <Text style={styles.gridLabel}>
          Meta por bloque{selectedActivity ? ` (${activities.find(a => a.id === selectedActivity)?.unit || ''})` : ''}
        </Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {BLOCKS.map(b => (
              <View key={`label-${b}`} style={styles.gridCell}>
                <Text style={styles.gridBlockLabel}>B{b}</Text>
              </View>
            ))}
          </View>
          <View style={styles.gridRow}>
            {BLOCKS.map(b => (
              <View key={`input-${b}`} style={styles.gridCell}>
                <TextInput
                  style={styles.gridInput}
                  value={blockGoals[b] || ''}
                  onChangeText={(v) => updateBlockGoal(b, v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.gray[400]}
                  textAlign="center"
                />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sheetHint}>
          Ingresa la meta solo en los bloques que necesites
        </Text>

        <Button
          title={`Agregar Meta (${BLOCKS.filter(b => (blockGoals[b] || '').trim() !== '').length} bloques)`}
          onPress={handleAddGoal}
          loading={isLoading}
        />
      </BottomSheet>

      <BottomSheet visible={showEditGoal} onClose={() => setShowEditGoal(false)}>
        <Text style={styles.sheetTitle}>Editar Meta</Text>
        <Text style={styles.sheetSubtitle}>
          {editActivityName} - Bloque {editBlock}
        </Text>

        <Input
          label={`Meta semanal (${editActivityUnit})`}
          value={editGoalAmount}
          onChangeText={(value) => setEditGoalAmount(value.replace(',', '.'))}
          keyboardType="decimal-pad"
        />

        <Button
          title="Guardar Cambios"
          onPress={handleEditGoal}
          loading={isLoading}
        />
      </BottomSheet>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  weekArrow: {
    padding: 8,
  },
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  weekDates: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  cardActionBtn: {
    padding: 6,
  },
  percentageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  sheetHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  gridContainer: {
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
  },
  gridBlockLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    paddingVertical: 8,
  },
  gridInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: '100%',
    height: 44,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
