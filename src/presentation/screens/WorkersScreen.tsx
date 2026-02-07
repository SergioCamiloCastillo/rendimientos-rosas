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
import { useWorkerStore } from '../../store';
import { Worker } from '../../domain/entities';
import { useToast } from '../context/ToastContext';

export const WorkersScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showEditWorker, setShowEditWorker] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const { showToast } = useToast();

  const {
    workers,
    inactiveWorkers,
    isLoading,
    fetchWorkers,
    fetchInactiveWorkers,
    addWorker,
    updateWorker,
    deactivateWorker,
    restoreWorker,
    permanentDeleteWorker,
  } = useWorkerStore();

  useEffect(() => {
    fetchWorkers();
    fetchInactiveWorkers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWorkers(), fetchInactiveWorkers()]);
    setRefreshing(false);
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setPosition('');
    setSelectedWorker(null);
  };

  const handleAddWorker = async () => {
    if (!code.trim() || !name.trim()) {
      showToast('El código y nombre son requeridos', 'warning');
      return;
    }

    try {
      await addWorker({
        code: code.trim(),
        name: name.trim(),
        identification: '',
        position: position.trim() || undefined,
      });
      resetForm();
      setShowAddWorker(false);
      showToast('Trabajador agregado correctamente', 'success');
    } catch (error: any) {
      const message = error?.message || 'No se pudo agregar el trabajador';
      showToast(message, 'error');
    }
  };

  const handleEditWorker = async () => {
    if (!selectedWorker || !code.trim() || !name.trim()) {
      showToast('El código y nombre son requeridos', 'warning');
      return;
    }

    try {
      await updateWorker(selectedWorker.id, {
        code: code.trim(),
        name: name.trim(),
        identification: '',
        position: position.trim() || undefined,
      });
      resetForm();
      setShowEditWorker(false);
      showToast('Trabajador actualizado correctamente', 'success');
    } catch (error: any) {
      const message = error?.message || 'No se pudo actualizar el trabajador';
      showToast(message, 'error');
    }
  };

  const handleDeactivate = (worker: Worker) => {
    Alert.alert(
      'Desactivar Trabajador',
      `¿Deseas desactivar a ${worker.name}? Podrás restaurarlo desde el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: () => deactivateWorker(worker.id),
        },
      ]
    );
  };

  const handleRestore = (worker: Worker) => {
    Alert.alert(
      'Restaurar Trabajador',
      `¿Deseas restaurar a ${worker.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => restoreWorker(worker.id),
        },
      ]
    );
  };

  const handlePermanentDelete = (worker: Worker) => {
    Alert.alert(
      'Eliminar Permanentemente',
      `¿Estás seguro de eliminar permanentemente a ${worker.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => permanentDeleteWorker(worker.id),
        },
      ]
    );
  };

  const openEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setCode(worker.code);
    setName(worker.name);
    setPosition(worker.position || '');
    setShowEditWorker(true);
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <ListItem
      title={item.name}
      subtitle={item.code ? `${item.code} • ${item.position || 'Sin cargo asignado'}` : (item.position || 'Sin cargo asignado')}
      leftIcon={
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      }
      rightIcon={
        <Text style={styles.chevron}>›</Text>
      }
      onPress={() => openEditWorker(item)}
      onLongPress={() => handleDeactivate(item)}
    />
  );

  const renderInactiveWorkerItem = ({ item }: { item: Worker }) => (
    <ListItem
      title={item.name}
      subtitle={item.position || 'Sin cargo'}
      backgroundColor={colors.gray[100]}
      leftIcon={
        <View style={[styles.avatar, styles.avatarInactive]}>
          <Text style={[styles.avatarText, styles.avatarTextInactive]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
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
        <Text style={styles.title}>Trabajadores</Text>
        <View style={{ width: 32 }} />
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, !showInactive && styles.tabActive]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.tabText, !showInactive && styles.tabTextActive]}>
            Activos ({workers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showInactive && styles.tabActive]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.tabText, showInactive && styles.tabTextActive]}>
            Historial ({inactiveWorkers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {!showInactive ? (
        <FlatList
          data={workers}
          keyExtractor={item => item.id}
          renderItem={renderWorkerItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay trabajadores"
              message="Agrega trabajadores para comenzar a registrar rendimientos"
            />
          }
        />
      ) : (
        <FlatList
          data={inactiveWorkers}
          keyExtractor={item => item.id}
          renderItem={renderInactiveWorkerItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay historial"
              message="Los trabajadores desactivados aparecerán aquí"
            />
          }
        />
      )}

      {!showInactive && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddWorker(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <BottomSheet visible={showAddWorker} onClose={() => { setShowAddWorker(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Nuevo Trabajador</Text>
        
        <Input
          label="Código"
          placeholder="Ej: 001"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        <Input
          label="Nombre completo"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Cargo (opcional)"
          placeholder="Ej: Operaria"
          value={position}
          onChangeText={setPosition}
        />

        <Button
          title="Agregar Trabajador"
          onPress={handleAddWorker}
          loading={isLoading}
        />
      </BottomSheet>

      <BottomSheet visible={showEditWorker} onClose={() => { setShowEditWorker(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Editar Trabajador</Text>
        
        <Input
          label="Código"
          placeholder="Ej: 001"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        <Input
          label="Nombre completo"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Cargo (opcional)"
          value={position}
          onChangeText={setPosition}
        />

        <Button
          title="Guardar Cambios"
          onPress={handleEditWorker}
          loading={isLoading}
        />

        <View style={styles.deleteSection}>
          <Button
            title="Desactivar Trabajador"
            variant="danger"
            onPress={() => {
              if (selectedWorker) {
                setShowEditWorker(false);
                handleDeactivate(selectedWorker);
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInactive: {
    backgroundColor: colors.gray[200],
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  avatarTextInactive: {
    color: colors.textSecondary,
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
  deleteSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
