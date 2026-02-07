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
import { Button, Input, BottomSheet, ListItem, EmptyState, Sidebar, MenuButton } from '../components';
import { useActivityStore } from '../../store';
import { Activity } from '../../domain/entities';
import { useToast } from '../context/ToastContext';

export const ActivitiesScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [expectedPerformance, setExpectedPerformance] = useState('');
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
  };

  const handleAddActivity = async () => {
    if (!name.trim() || !unit.trim() || !expectedPerformance) {
      showToast('El nombre, unidad y meta son requeridos', 'warning');
      return;
    }

    const performance = parseFloat(expectedPerformance);
    if (isNaN(performance) || performance <= 0) {
      showToast('La meta debe ser un número positivo', 'warning');
      return;
    }

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
    if (!selectedActivity || !name.trim() || !unit.trim() || !expectedPerformance) {
      showToast('El nombre, unidad y meta son requeridos', 'warning');
      return;
    }

    const performance = parseFloat(expectedPerformance);
    if (isNaN(performance) || performance <= 0) {
      showToast('La meta debe ser un número positivo', 'warning');
      return;
    }

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
    } catch (error) {
      showToast('No se pudo actualizar la actividad', 'error');
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
          style={[styles.tab, !showInactive && styles.tabActive]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.tabText, !showInactive && styles.tabTextActive]}>
            Activas ({activities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showInactive && styles.tabActive]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.tabText, showInactive && styles.tabTextActive]}>
            Historial ({inactiveActivities.length})
          </Text>
        </TouchableOpacity>
      </View>

      {!showInactive ? (
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
      ) : (
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
              title="No hay historial"
              message="Las actividades desactivadas aparecerán aquí"
            />
          }
        />
      )}

      {!showInactive && (
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
        />

        <Input
          label="Meta de rendimiento (por hora)"
          value={expectedPerformance}
          onChangeText={(value) => setExpectedPerformance(value.replace(',', '.'))}
          keyboardType="decimal-pad"
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
        />

        <Input
          label="Meta de rendimiento (por hora)"
          placeholder="Ej: 200"
          value={expectedPerformance}
          onChangeText={(value) => setExpectedPerformance(value.replace(',', '.'))}
          keyboardType="decimal-pad"
        />

        <Button
          title="Guardar Cambios"
          onPress={handleEditActivity}
          loading={isLoading}
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
});
