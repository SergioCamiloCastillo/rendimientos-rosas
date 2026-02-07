import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Sidebar, MenuButton, BottomSheet, Select, Input, Button } from '../components';
import { useActivityStore, useWeeklyGoalStore } from '../../store';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

export const WeeklyGoalsScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const { activities, fetchActivities } = useActivityStore();
  const { goals, fetchGoals, addGoal, setSelectedWeekStart, isLoading } = useWeeklyGoalStore();
  const { showToast } = useToast();

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  useEffect(() => {
    fetchActivities();
  }, []);

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

  const handleAddGoal = async () => {
    if (!selectedActivity || !goalAmount) {
      showToast('Selecciona una actividad y define la meta', 'warning');
      return;
    }

    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('La meta debe ser un número positivo', 'warning');
      return;
    }

    try {
      await addGoal({
        activityId: selectedActivity,
        weekStartDate: weekStartStr,
        goalAmount: amount,
      });
      setSelectedActivity('');
      setGoalAmount('');
      setShowAddGoal(false);
      showToast('Meta semanal agregada', 'success');
    } catch {
      showToast('Error al agregar la meta', 'error');
    }
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
          goals.map((item) => (
            <View key={item.id} style={styles.progressCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.activityName}>{item.activityName}</Text>
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

        <Input
          label={`Meta semanal${selectedActivity ? ` (${activities.find(a => a.id === selectedActivity)?.unit || ''})` : ''}`}
          value={goalAmount}
          onChangeText={(value) => setGoalAmount(value.replace(',', '.'))}
          keyboardType="decimal-pad"
        />

        <Button
          title="Agregar Meta"
          onPress={handleAddGoal}
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
    flex: 1,
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
});
