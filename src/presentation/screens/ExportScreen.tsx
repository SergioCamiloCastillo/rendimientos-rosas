import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePerformanceStore } from '../../store';
import { exportToExcel, exportByActivity, exportByWorker } from '../../utils/excelExport';
import { useToast } from '../context/ToastContext';

export const ExportScreen: React.FC = () => {
  const { records, fetchRecords } = usePerformanceStore();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleExport = async (type: 'all' | 'byActivity' | 'byWorker') => {
    if (records.length === 0) {
      showToast('No hay registros para exportar', 'warning');
      return;
    }

    setExporting(true);
    try {
      if (type === 'all') {
        await exportToExcel(records);
      } else if (type === 'byActivity') {
        await exportByActivity(records);
      } else {
        await exportByWorker(records);
      }
      showToast('Archivo exportado correctamente', 'success');
    } catch (error) {
      console.log('Export error:', error);
      showToast('No se pudo exportar los datos', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Exportar</Text>
        <Text style={styles.subtitle}>Exporta tus datos a Excel</Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity 
          style={styles.exportOption}
          onPress={() => handleExport('all')}
          activeOpacity={0.7}
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
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.warningLight || '#FEF3C7' }]}>
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
          Los archivos se exportarán en formato Excel (.xlsx) y podrás compartirlos o guardarlos en tu dispositivo.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
