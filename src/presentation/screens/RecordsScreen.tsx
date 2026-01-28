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
import { colors } from '../theme';
import { PerformanceCard, BottomSheet, Select, Button, EmptyState } from '../components';
import { useWorkerStore, useActivityStore, usePerformanceStore } from '../../store';
import { exportToExcel, exportByActivity, exportByWorker } from '../../utils/excelExport';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

export const RecordsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterMetGoal, setFilterMetGoal] = useState<string>('');

  const { workers, fetchWorkers } = useWorkerStore();
  const { activities, fetchActivities } = useActivityStore();
  const { 
    records, 
    stats,
    fetchRecords, 
    fetchStats,
    setFilters,
    clearFilters,
    deleteRecord,
    isLoading 
  } = usePerformanceStore();

  useEffect(() => {
    fetchWorkers();
    fetchActivities();
    fetchRecords();
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRecords(), fetchStats()]);
    setRefreshing(false);
  };

  const applyFilters = () => {
    const today = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined = format(today, 'yyyy-MM-dd');

    switch (filterPeriod) {
      case 'today':
        startDate = format(today, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        break;
      default:
        startDate = undefined;
        endDate = undefined;
    }

    setFilters({
      startDate,
      endDate,
      workerId: filterWorker || undefined,
      activityId: filterActivity || undefined,
      metGoal: filterMetGoal === '' ? undefined : filterMetGoal === 'true',
    });

    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilterPeriod('all');
    setFilterWorker('');
    setFilterActivity('');
    setFilterMetGoal('');
    clearFilters();
    setShowFilters(false);
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
          onPress: () => deleteRecord(id),
        },
      ]
    );
  };

  const handleExport = async (type: 'all' | 'byActivity' | 'byWorker') => {
    try {
      setShowExportOptions(false);
      if (type === 'all') {
        await exportToExcel(records);
      } else if (type === 'byActivity') {
        await exportByActivity(records);
      } else {
        await exportByWorker(records);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar los datos');
    }
  };

  const hasActiveFilters = filterPeriod !== 'all' || filterWorker || filterActivity || filterMetGoal !== '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, hasActiveFilters && styles.headerButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.headerIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowExportOptions(true)}
          >
            <Text style={styles.headerIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{records.length}</Text>
          <Text style={styles.statLabel}>Registros</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.metGoal}</Text>
          <Text style={styles.statLabel}>Cumplieron</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{stats.notMetGoal}</Text>
          <Text style={styles.statLabel}>No cumplieron</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.percentage}%</Text>
          <Text style={styles.statLabel}>Éxito</Text>
        </View>
      </View>

      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>Filtros activos</Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PerformanceCard
            record={item}
            onDelete={() => handleDeleteRecord(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No hay registros"
            message={hasActiveFilters 
              ? "No se encontraron registros con los filtros aplicados" 
              : "Comienza a registrar rendimientos desde el Dashboard"
            }
          />
        }
      />

      <BottomSheet visible={showFilters} onClose={() => setShowFilters(false)}>
        <Text style={styles.sheetTitle}>Filtrar Registros</Text>

        <Text style={styles.filterLabel}>Período</Text>
        <View style={styles.periodButtons}>
          {[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mes' },
            { value: 'all', label: 'Todo' },
          ].map(period => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                filterPeriod === period.value && styles.periodButtonActive,
              ]}
              onPress={() => setFilterPeriod(period.value as FilterPeriod)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  filterPeriod === period.value && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Select
          label="Trabajador"
          placeholder="Todos los trabajadores"
          options={[
            { label: 'Todos los trabajadores', value: '' },
            ...workers.map(w => ({ label: w.name, value: w.id })),
          ]}
          value={filterWorker}
          onChange={setFilterWorker}
        />

        <Select
          label="Actividad"
          placeholder="Todas las actividades"
          options={[
            { label: 'Todas las actividades', value: '' },
            ...activities.map(a => ({ label: a.name, value: a.id })),
          ]}
          value={filterActivity}
          onChange={setFilterActivity}
        />

        <Select
          label="Cumplimiento de meta"
          placeholder="Todos"
          options={[
            { label: 'Todos', value: '' },
            { label: 'Cumplieron meta', value: 'true' },
            { label: 'No cumplieron meta', value: 'false' },
          ]}
          value={filterMetGoal}
          onChange={setFilterMetGoal}
        />

        <View style={styles.filterActions}>
          <Button
            title="Limpiar"
            variant="outline"
            onPress={resetFilters}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Aplicar"
            onPress={applyFilters}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={showExportOptions} onClose={() => setShowExportOptions(false)}>
        <Text style={styles.sheetTitle}>Exportar a Excel</Text>
        <Text style={styles.exportSubtitle}>
          Se exportarán {records.length} registros con los filtros actuales
        </Text>
        
        <TouchableOpacity 
          style={styles.exportOption}
          onPress={() => handleExport('all')}
        >
          <Text style={styles.exportOptionIcon}>📑</Text>
          <View style={styles.exportOptionContent}>
            <Text style={styles.exportOptionTitle}>Todos los registros</Text>
            <Text style={styles.exportOptionSubtitle}>Exportar todos los datos en una hoja</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exportOption}
          onPress={() => handleExport('byActivity')}
        >
          <Text style={styles.exportOptionIcon}>📊</Text>
          <View style={styles.exportOptionContent}>
            <Text style={styles.exportOptionTitle}>Por Actividad</Text>
            <Text style={styles.exportOptionSubtitle}>Una hoja por cada actividad</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exportOption}
          onPress={() => handleExport('byWorker')}
        >
          <Text style={styles.exportOptionIcon}>👥</Text>
          <View style={styles.exportOptionContent}>
            <Text style={styles.exportOptionTitle}>Por Trabajador</Text>
            <Text style={styles.exportOptionSubtitle}>Una hoja por cada trabajador</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  headerIcon: {
    fontSize: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  activeFiltersText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  exportSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    marginTop: 8,
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
});
