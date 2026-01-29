import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme';
import { usePerformanceStore, useWorkerStore, useActivityStore } from '../../store';
import { exportToExcel, exportByActivity, exportByWorker, exportWeeklyReport } from '../../utils/excelExport';
import { useToast } from '../context/ToastContext';
import { PerformanceRepository } from '../../data/repositories';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Select } from '../components';

export const ExportScreen: React.FC = () => {
  const { showToast } = useToast();
  const { workers, fetchWorkers } = useWorkerStore();
  const { activities, fetchActivities } = useActivityStore();
  const [exporting, setExporting] = useState(false);
  
  // Filtros de fecha
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Filtros específicos
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');

  useEffect(() => {
    fetchWorkers();
    fetchActivities();
  }, []);

  const getFilteredRecords = async () => {
    const filters: any = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
    
    if (selectedWorker) {
      filters.workerId = selectedWorker;
    }
    
    if (selectedActivity) {
      filters.activityId = selectedActivity;
    }
    
    return await PerformanceRepository.getWithDetails(filters);
  };

  const handleExport = async (type: 'all' | 'byActivity' | 'byWorker' | 'weekly') => {
    setExporting(true);
    try {
      const records = await getFilteredRecords();
      
      if (records.length === 0) {
        showToast('No hay registros en el rango seleccionado', 'warning');
        setExporting(false);
        return;
      }

      if (type === 'all') {
        await exportToExcel(records);
      } else if (type === 'byActivity') {
        await exportByActivity(records);
      } else if (type === 'byWorker') {
        await exportByWorker(records);
      } else if (type === 'weekly') {
        await exportWeeklyReport(
          records, 
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd')
        );
      }
      showToast('Archivo exportado correctamente', 'success');
    } catch (error) {
      console.log('Export error:', error);
      showToast('No se pudo exportar los datos', 'error');
    } finally {
      setExporting(false);
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

  const workerOptions = workers
    .filter(w => !w.isDeleted)
    .map(w => ({
      label: w.code ? `${w.code} - ${w.name}` : w.name,
      value: w.id,
    }));

  const activityOptions = activities
    .filter(a => !a.isDeleted)
    .map(a => ({
      label: a.name,
      value: a.id,
    }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Exporta tus datos a Excel</Text>
        </View>

        {/* Filtros de fecha */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Rango de fechas</Text>
          
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
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.dateText}>
                {format(startDate, 'dd/MM/yyyy', { locale: es })}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.dateSeparator}>a</Text>
            
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={() => setShowEndPicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.dateText}>
                {format(endDate, 'dd/MM/yyyy', { locale: es })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros opcionales */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filtros opcionales</Text>
          
          <Select
            label="Trabajador (opcional)"
            placeholder="Todos los trabajadores"
            options={[{ label: 'Todos los trabajadores', value: '' }, ...workerOptions]}
            value={selectedWorker}
            onChange={setSelectedWorker}
          />
          
          <Select
            label="Actividad (opcional)"
            placeholder="Todas las actividades"
            options={[{ label: 'Todas las actividades', value: '' }, ...activityOptions]}
            value={selectedActivity}
            onChange={setSelectedActivity}
          />
        </View>

        {/* Opciones de exportación */}
        <View style={styles.options}>
          <Text style={styles.sectionTitle}>Tipo de reporte</Text>
          
          <TouchableOpacity 
            style={styles.exportOption}
            onPress={() => handleExport('weekly')}
            activeOpacity={0.7}
            disabled={exporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#E0F2FE' }]}>
              <MaterialIcons name="date-range" size={24} color="#0284C7" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Reporte Semanal</Text>
              <Text style={styles.optionSubtitle}>Resumen + detalle por trabajador</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.exportOption}
            onPress={() => handleExport('all')}
            activeOpacity={0.7}
            disabled={exporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
              <MaterialIcons name="description" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Todos los registros</Text>
              <Text style={styles.optionSubtitle}>Exportar todos los datos en una hoja</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.exportOption}
            onPress={() => handleExport('byActivity')}
            activeOpacity={0.7}
            disabled={exporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.successLight }]}>
              <MaterialIcons name="category" size={24} color={colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Por Actividad</Text>
              <Text style={styles.optionSubtitle}>Una hoja por cada actividad</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.exportOption}
            onPress={() => handleExport('byWorker')}
            activeOpacity={0.7}
            disabled={exporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="people" size={24} color="#F59E0B" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Por Trabajador</Text>
              <Text style={styles.optionSubtitle}>Una hoja por cada trabajador</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Los archivos incluyen: Nombre, Código, Labor, Hora Inicio, Hora Fin, Total Horas, Rendimiento Establecido, Total, % Cumplimiento.
          </Text>
        </View>
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
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
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
    gap: 12,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    color: colors.text,
  },
  dateSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  options: {
    paddingHorizontal: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: colors.textLight,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
});
