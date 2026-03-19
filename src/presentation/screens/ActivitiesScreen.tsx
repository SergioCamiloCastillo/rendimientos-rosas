import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Button, Input, BottomSheet, ListItem, EmptyState, Sidebar, MenuButton } from '../components';
import { useActivityStore } from '../../store';
import { Activity } from '../../domain/entities';
import { ActivityRepository } from '../../data/repositories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

export const ActivitiesScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'history'>('active');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [expectedPerformance, setExpectedPerformance] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [performanceLockedThisWeek, setPerformanceLockedThisWeek] = useState(false);
  const { showToast } = useToast();

  const {
    activities,
    inactiveActivities,
    isLoading,
    fetchActivities,
    fetchInactiveActivities,
    addActivity,
    updateActivity,
    deactivateActivity,
    restoreActivity,
    permanentDeleteActivity,
  } = useActivityStore();

  useEffect(() => {
    fetchActivities();
    fetchInactiveActivities();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActivities(), fetchInactiveActivities()]);
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setUnit('');
    setExpectedPerformance('');
    setSelectedActivity(null);
    setAttempted(false);
    setPerformanceLockedThisWeek(false);
  };

  const formErrors = useMemo(() => {
    const errors: { name?: string; unit?: string; performance?: string } = {};
    if (!name.trim()) errors.name = 'Requerido';
    if (!unit.trim()) errors.unit = 'Requerido';
    if (!expectedPerformance || isNaN(parseFloat(expectedPerformance)) || parseFloat(expectedPerformance) <= 0) {
      errors.performance = 'Debe ser un número positivo';
    }
    return errors;
  }, [name, unit, expectedPerformance]);

  const hasFormErrors = Object.keys(formErrors).length > 0;

  const hasEditChanges = useMemo(() => {
    if (!selectedActivity) return false;
    return (
      name.trim() !== selectedActivity.name ||
      (description.trim() || '') !== (selectedActivity.description || '') ||
      unit.trim() !== selectedActivity.unit ||
      expectedPerformance !== selectedActivity.expectedPerformance.toString()
    );
  }, [selectedActivity, name, description, unit, expectedPerformance]);

  const handleAddActivity = async () => {
    setAttempted(true);
    if (hasFormErrors) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }

    const performance = parseFloat(expectedPerformance);

    try {
      await addActivity({
        name: name.trim(),
        description: description.trim() || undefined,
        unit: unit.trim(),
        expectedPerformance: performance,
      });
      resetForm();
      setShowAddActivity(false);
      showToast('Actividad agregada correctamente', 'success');
    } catch (error) {
      showToast('No se pudo agregar la actividad', 'error');
    }
  };

  const handleEditActivity = async () => {
    setAttempted(true);
    if (!selectedActivity || hasFormErrors) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }

    const performance = parseFloat(expectedPerformance);

    try {
      await updateActivity(selectedActivity.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        unit: unit.trim(),
        expectedPerformance: performance,
      });
      resetForm();
      setShowEditActivity(false);
      showToast('Actividad actualizada correctamente', 'success');
    } catch (error: any) {
      const message = error?.message || 'No se pudo actualizar la actividad';
      showToast(message, 'error');
    }
  };

  const handleDeactivate = (activity: Activity) => {
    Alert.alert(
      'Desactivar Actividad',
      `¿Deseas desactivar "${activity.name}"? Podrás restaurarla desde el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: () => deactivateActivity(activity.id),
        },
      ]
    );
  };

  const handleRestore = (activity: Activity) => {
    Alert.alert(
      'Restaurar Actividad',
      `¿Deseas restaurar "${activity.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => restoreActivity(activity.id),
        },
      ]
    );
  };

  const handlePermanentDelete = (activity: Activity) => {
    Alert.alert(
      'Eliminar Permanentemente',
      `¿Estás seguro de eliminar permanentemente "${activity.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => permanentDeleteActivity(activity.id),
        },
      ]
    );
  };

  const openEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setName(activity.name);
    setDescription(activity.description || '');
    setUnit(activity.unit);
    setExpectedPerformance(activity.expectedPerformance.toString());
    setPerformanceLockedThisWeek(ActivityRepository.wasPerformanceChangedThisWeek(activity));
    setShowEditActivity(true);
  };

  const getActivityIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cama')) return '🛏️';
    if (lowerName.includes('tallo') || lowerName.includes('corte')) return '🌹';
    if (lowerName.includes('siembra')) return '🌱';
    if (lowerName.includes('riego')) return '💧';
    if (lowerName.includes('fumig')) return '🧪';
    if (lowerName.includes('empaque') || lowerName.includes('packing')) return '📦';
    return '🌿';
  };

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <ListItem
      title={item.name}
      subtitle={`Meta: ${item.expectedPerformance} ${item.unit}`}
      leftIcon={
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getActivityIcon(item.name)}</Text>
        </View>
      }
      rightIcon={
        <Text style={styles.chevron}>›</Text>
      }
      onPress={() => openEditActivity(item)}
      onLongPress={() => handleDeactivate(item)}
    />
  );

  const renderInactiveActivityItem = ({ item }: { item: Activity }) => (
    <ListItem
      title={item.name}
      subtitle={`Meta: ${item.expectedPerformance} ${item.unit}`}
      backgroundColor={colors.gray[100]}
      leftIcon={
        <View style={[styles.iconContainer, styles.iconInactive]}>
          <Text style={styles.icon}>{getActivityIcon(item.name)}</Text>
        </View>
      }
      rightIcon={
        <View style={styles.inactiveActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRestore(item)}
          >
            <Text style={styles.restoreText}>Restaurar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePermanentDelete(item)}
          >
            <Text style={styles.deleteText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MenuButton onPress={() => setShowMenu(true)} />
        <Text style={styles.title}>Actividades</Text>
        <View style={{ width: 32 }} />
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Activas ({activities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
          onPress={() => setActiveTab('inactive')}
        >
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>
            Desactivadas ({inactiveActivities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'active' && (
        <FlatList
          data={activities}
          keyExtractor={item => item.id}
          renderItem={renderActivityItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay actividades"
              message="Agrega actividades con sus metas de rendimiento"
            />
          }
        />
      )}

      {activeTab === 'inactive' && (
        <FlatList
          data={inactiveActivities}
          keyExtractor={item => item.id}
          renderItem={renderInactiveActivityItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay desactivadas"
              message="Las actividades desactivadas aparecerán aquí"
            />
          }
        />
      )}

      {activeTab === 'history' && (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
        >
          {[...activities, ...inactiveActivities].filter(a => a.performanceHistory && a.performanceHistory.length > 0).length === 0 ? (
            <EmptyState
              title="Sin cambios registrados"
              message="Aquí aparecerán los cambios de meta de las actividades"
            />
          ) : (
            [...activities, ...inactiveActivities]
              .filter(a => a.performanceHistory && a.performanceHistory.length > 0)
              .sort((a, b) => {
                const lastA = [...(a.performanceHistory || [])].sort((x, y) => y.changedAt.localeCompare(x.changedAt))[0];
                const lastB = [...(b.performanceHistory || [])].sort((x, y) => y.changedAt.localeCompare(x.changedAt))[0];
                return (lastB?.changedAt || '').localeCompare(lastA?.changedAt || '');
              })
              .map(activity => (
                <View key={activity.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCardTitle}>{activity.name}</Text>
                    <Text style={styles.historyCardSubtitle}>
                      Meta actual: {activity.expectedPerformance} {activity.unit}
                    </Text>
                  </View>
                  {[...(activity.performanceHistory || [])]
                    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
                    .map((entry, idx) => {
                      const changeDate = new Date(entry.changedAt);
                      return (
                        <View key={idx} style={styles.historyEntry}>
                          <View style={styles.historyEntryDot} />
                          <View style={styles.historyEntryContent}>
                            <Text style={styles.historyEntryDate}>
                              {format(changeDate, "d 'de' MMMM yyyy, h:mm a", { locale: es })}
                            </Text>
                            <Text style={styles.historyEntryText}>
                              Semana del {entry.weekStart}
                            </Text>
                            <View style={styles.historyEntryValues}>
                              {entry.previousPerformance != null && (
                                <>
                                  <Text style={styles.historyEntryOld}>
                                    {entry.previousPerformance} {activity.unit}
                                  </Text>
                                  <Text style={styles.historyEntryArrow}>→</Text>
                                </>
                              )}
                              <Text style={styles.historyEntryNew}>
                                {entry.expectedPerformance} {activity.unit}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              ))
          )}
        </ScrollView>
      )}

      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddActivity(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <BottomSheet visible={showAddActivity} onClose={() => { setShowAddActivity(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Nueva Actividad</Text>
        
        <Input
          label="Nombre de la actividad"
          placeholder="Ej: Corte de tallos"
          value={name}
          onChangeText={setName}
          error={attempted ? formErrors.name : undefined}
        />

        <Input
          label="Descripción (opcional)"
          placeholder="Ej: Corte de tallos de rosa para exportación"
          value={description}
          onChangeText={setDescription}
          multiline={true}
        />

        <Input
          label="Unidad de medida"
          placeholder="Ej: tallos/hora, camas, plantas"
          value={unit}
          onChangeText={setUnit}
          error={attempted ? formErrors.unit : undefined}
        />

        <Input
          label="Meta de rendimiento (por hora)"
          value={expectedPerformance}
          onChangeText={(value) => setExpectedPerformance(value.replace(',', '.'))}
          keyboardType="decimal-pad"
          error={attempted ? formErrors.performance : undefined}
        />

        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            💡 La meta es el rendimiento mínimo esperado por trabajador
          </Text>
        </View>

        <Button
          title="Agregar Actividad"
          onPress={handleAddActivity}
          loading={isLoading}
        />
      </BottomSheet>

      <BottomSheet visible={showEditActivity} onClose={() => { setShowEditActivity(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Editar Actividad</Text>
        
        <Input
          label="Nombre de la actividad"
          placeholder="Ej: Corte de tallos"
          value={name}
          onChangeText={setName}
          error={attempted ? formErrors.name : undefined}
        />

        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline={true}
        />

        <Input
          label="Unidad de medida"
          placeholder="Ej: tallos/hora, camas, plantas"
          value={unit}
          onChangeText={setUnit}
          error={attempted ? formErrors.unit : undefined}
        />

        <Input
          label="Meta de rendimiento (por hora)"
          placeholder="Ej: 200"
          value={expectedPerformance}
          onChangeText={(value) => setExpectedPerformance(value.replace(',', '.'))}
          keyboardType="decimal-pad"
          editable={!performanceLockedThisWeek}
          error={performanceLockedThisWeek 
            ? 'La meta ya fue modificada esta semana' 
            : (attempted ? formErrors.performance : undefined)}
        />

        <Button
          title="Guardar Cambios"
          onPress={handleEditActivity}
          loading={isLoading}
          disabled={!hasEditChanges}
        />

        <View style={styles.deleteSection}>
          <Button
            title="Desactivar Actividad"
            variant="danger"
            onPress={() => {
              if (selectedActivity) {
                setShowEditActivity(false);
                handleDeactivate(selectedActivity);
              }
            }}
          />
        </View>
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
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIcon: {
    fontSize: 20,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInactive: {
    backgroundColor: colors.gray[200],
  },
  icon: {
    fontSize: 20,
  },
  chevron: {
    fontSize: 24,
    color: colors.textLight,
  },
  inactiveActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  restoreText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '500',
    fontSize: 14,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  helpText: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  helpTextContent: {
    color: colors.primary,
    fontSize: 14,
  },
  deleteSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  historyCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  historyEntry: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  historyEntryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  historyEntryContent: {
    flex: 1,
  },
  historyEntryDate: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  historyEntryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyEntryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  historyEntryOld: {
    fontSize: 14,
    color: colors.danger,
    textDecorationLine: 'line-through',
  },
  historyEntryArrow: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyEntryNew: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
});
