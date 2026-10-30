import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, fonts } from '../theme';
import { PREMIUM_ENABLED } from '../../config/features';
import { Button, Card, Sidebar, MenuButton } from '../components';
import { useToast } from '../context/ToastContext';
import {
  BackupCounts,
  createBackup,
  getCurrentCounts,
  getLastBackupDate,
  pickBackup,
  restoreBackup,
  BackupFile,
} from '../../utils/backup';
import {
  useWorkerStore,
  useActivityStore,
  useBlockStore,
  usePerformanceStore,
  useWeeklyGoalStore,
  useAbsenceStore,
} from '../../store';

const ALL_COUNT_LABELS: { key: keyof BackupCounts; one: string; many: string }[] = [
  { key: 'workers', one: 'trabajador', many: 'trabajadores' },
  { key: 'activities', one: 'actividad', many: 'actividades' },
  { key: 'blocks', one: 'bloque', many: 'bloques' },
  { key: 'records', one: 'registro', many: 'registros' },
  { key: 'weeklyGoals', one: 'meta semanal', many: 'metas semanales' },
  { key: 'absences', one: 'día con ausencias', many: 'días con ausencias' },
];

// Sin Premium la pantalla de metas está oculta: no se muestran en los conteos
const COUNT_LABELS = ALL_COUNT_LABELS.filter(({ key }) => PREMIUM_ENABLED || key !== 'weeklyGoals');

const summarize = (counts: BackupCounts) =>
  COUNT_LABELS.map(({ key, one, many }) => `${counts[key]} ${counts[key] === 1 ? one : many}`).join('\n');

// Después de restaurar, los stores tienen los datos viejos en memoria
const reloadStores = async () => {
  const perf = usePerformanceStore.getState();
  const absences = useAbsenceStore.getState();
  await Promise.all([
    useWorkerStore.getState().fetchWorkers(),
    useWorkerStore.getState().fetchInactiveWorkers(),
    useActivityStore.getState().fetchActivities(),
    useActivityStore.getState().fetchInactiveActivities(),
    useBlockStore.getState().fetchBlocks(),
    useBlockStore.getState().fetchInactiveBlocks(),
    useWeeklyGoalStore.getState().fetchGoals(),
    perf.fetchRecords(),
    perf.fetchRecordsByDate(perf.selectedDate),
    perf.fetchStatsByDate(perf.selectedDate),
    absences.fetchAbsenceByDate(absences.selectedDate),
  ]);
};

export const BackupScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [counts, setCounts] = useState<BackupCounts | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { showToast } = useToast();

  const loadStatus = useCallback(async () => {
    setCounts(await getCurrentCounts());
    setLastBackup(await getLastBackupDate());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBackup();
      await loadStatus();
    } catch (error: any) {
      showToast(error?.message || 'No se pudo crear el respaldo', 'error');
    } finally {
      setCreating(false);
    }
  };

  const doRestore = async (backup: BackupFile) => {
    setRestoring(true);
    try {
      await restoreBackup(backup);
      await reloadStores();
      await loadStatus();
      showToast('Respaldo restaurado', 'success');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo restaurar el respaldo', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleRestore = async () => {
    try {
      const picked = await pickBackup();
      if (!picked) return;

      const createdAt = new Date(picked.backup.createdAt);
      const when = isNaN(createdAt.getTime())
        ? ''
        : `Respaldo del ${format(createdAt, "d 'de' MMMM yyyy, h:mm a", { locale: es })}\n\n`;

      Alert.alert(
        '¿Restaurar este respaldo?',
        `${when}${summarize(picked.counts)}\n\nSe reemplazarán todos los datos que hay ahora en este celular. Esto no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restaurar', style: 'destructive', onPress: () => doRestore(picked.backup) },
        ]
      );
    } catch (error: any) {
      showToast(error?.message || 'No se pudo leer el archivo', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.title}>Respaldo</Text>
        <View style={{ width: 32 }} />
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Tus datos se guardan solo en este celular. Haz un respaldo cada semana y guárdalo en
          Google Drive, tu correo o WhatsApp para no perderlos si el celular se daña o se pierde.
        </Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="cloud-upload" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>Crear respaldo</Text>
          </View>
          <Text style={styles.cardText}>Guarda en un archivo todo lo que hay en la app:</Text>

          <View style={styles.countsGrid}>
            {COUNT_LABELS.map(({ key, one, many }) => (
              <View key={key} style={styles.countItem}>
                <Text style={styles.countValue}>{counts ? counts[key] : '–'}</Text>
                <Text style={styles.countLabel}>{counts && counts[key] === 1 ? one : many}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.lastBackup}>
            {lastBackup
              ? `Último respaldo: ${format(lastBackup, "d 'de' MMMM, h:mm a", { locale: es })}`
              : 'Todavía no has creado ningún respaldo.'}
          </Text>

          <Button
            title="Crear respaldo"
            onPress={handleCreate}
            loading={creating}
            disabled={restoring}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="settings-backup-restore" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>Restaurar respaldo</Text>
          </View>
          <Text style={styles.cardText}>
            Carga un archivo de respaldo de Rinde, por ejemplo al pasar la app a un celular nuevo.
          </Text>

          <View style={styles.warning}>
            <MaterialIcons name="warning-amber" size={18} color={colors.danger} />
            <Text style={styles.warningText}>
              Restaurar reemplaza todos los datos que hay ahora en este celular.
            </Text>
          </View>

          <Button
            title="Elegir archivo"
            variant="outline"
            onPress={handleRestore}
            loading={restoring}
            disabled={creating}
          />
        </Card>
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  countsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  countItem: {
    width: '33.33%',
    marginBottom: 16,
  },
  countValue: {
    fontSize: 24,
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  lastBackup: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
});
