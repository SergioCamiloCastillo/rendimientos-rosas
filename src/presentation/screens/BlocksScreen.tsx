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
import { useBlockStore } from '../../store';
import { Block } from '../../domain/entities';
import { useToast } from '../context/ToastContext';

export const BlocksScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showEditBlock, setShowEditBlock] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  const [name, setName] = useState('');
  const { showToast } = useToast();

  const {
    blocks,
    inactiveBlocks,
    isLoading,
    fetchBlocks,
    fetchInactiveBlocks,
    addBlock,
    updateBlock,
    deactivateBlock,
    restoreBlock,
    permanentDeleteBlock,
  } = useBlockStore();

  useEffect(() => {
    fetchBlocks();
    fetchInactiveBlocks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBlocks(), fetchInactiveBlocks()]);
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setSelectedBlock(null);
  };

  const handleAddBlock = async () => {
    if (!name.trim()) {
      showToast('El nombre del bloque es requerido', 'warning');
      return;
    }

    const exists = blocks.some(b => b.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      showToast('Ya existe un bloque con ese nombre', 'warning');
      return;
    }

    try {
      await addBlock({ name: name.trim() });
      resetForm();
      setShowAddBlock(false);
      showToast('Bloque agregado correctamente', 'success');
    } catch (error) {
      showToast('No se pudo agregar el bloque', 'error');
    }
  };

  const handleEditBlock = async () => {
    if (!selectedBlock || !name.trim()) {
      showToast('El nombre del bloque es requerido', 'warning');
      return;
    }

    const exists = blocks.some(
      b => b.id !== selectedBlock.id && b.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      showToast('Ya existe un bloque con ese nombre', 'warning');
      return;
    }

    try {
      await updateBlock(selectedBlock.id, { name: name.trim() });
      resetForm();
      setShowEditBlock(false);
      showToast('Bloque actualizado correctamente', 'success');
    } catch (error) {
      showToast('No se pudo actualizar el bloque', 'error');
    }
  };

  const handleDeactivate = (block: Block) => {
    Alert.alert(
      'Desactivar Bloque',
      `¿Deseas desactivar el bloque "${block.name}"? Podrás restaurarlo desde el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: () => deactivateBlock(block.id),
        },
      ]
    );
  };

  const handleRestore = (block: Block) => {
    Alert.alert(
      'Restaurar Bloque',
      `¿Deseas restaurar el bloque "${block.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => restoreBlock(block.id),
        },
      ]
    );
  };

  const handlePermanentDelete = (block: Block) => {
    Alert.alert(
      'Eliminar Permanentemente',
      `¿Estás seguro de eliminar permanentemente el bloque "${block.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => permanentDeleteBlock(block.id),
        },
      ]
    );
  };

  const openEditBlock = (block: Block) => {
    setSelectedBlock(block);
    setName(block.name);
    setShowEditBlock(true);
  };

  const renderBlockItem = ({ item }: { item: Block }) => (
    <ListItem
      title={`Bloque ${item.name}`}
      subtitle={`Creado: ${new Date(item.createdAt).toLocaleDateString('es')}`}
      leftIcon={
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📦</Text>
        </View>
      }
      rightIcon={
        <Text style={styles.chevron}>›</Text>
      }
      onPress={() => openEditBlock(item)}
      onLongPress={() => handleDeactivate(item)}
    />
  );

  const renderInactiveBlockItem = ({ item }: { item: Block }) => (
    <ListItem
      title={`Bloque ${item.name}`}
      subtitle={`Creado: ${new Date(item.createdAt).toLocaleDateString('es')}`}
      backgroundColor={colors.gray[100]}
      leftIcon={
        <View style={[styles.iconContainer, styles.iconInactive]}>
          <Text style={styles.icon}>📦</Text>
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
        <Text style={styles.title}>Bloques</Text>
        <View style={{ width: 32 }} />
      </View>

      <Sidebar visible={showMenu} onClose={() => setShowMenu(false)} />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, !showInactive && styles.tabActive]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.tabText, !showInactive && styles.tabTextActive]}>
            Activos ({blocks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showInactive && styles.tabActive]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.tabText, showInactive && styles.tabTextActive]}>
            Historial ({inactiveBlocks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {!showInactive ? (
        <FlatList
          data={blocks}
          keyExtractor={item => item.id}
          renderItem={renderBlockItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay bloques"
              message="Agrega bloques para organizar tus rendimientos"
            />
          }
        />
      ) : (
        <FlatList
          data={inactiveBlocks}
          keyExtractor={item => item.id}
          renderItem={renderInactiveBlockItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay historial"
              message="Los bloques desactivados aparecerán aquí"
            />
          }
        />
      )}

      {!showInactive && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddBlock(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <BottomSheet visible={showAddBlock} onClose={() => { setShowAddBlock(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Nuevo Bloque</Text>

        <Input
          label="Nombre del bloque"
          placeholder="Ej: 21, 17, 10"
          keyboardType="number-pad"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            💡 Los bloques se usan para organizar las metas semanales y registros de rendimiento
          </Text>
        </View>

        <Button
          title="Agregar Bloque"
          onPress={handleAddBlock}
          loading={isLoading}
        />
      </BottomSheet>

      <BottomSheet visible={showEditBlock} onClose={() => { setShowEditBlock(false); resetForm(); }}>
        <Text style={styles.sheetTitle}>Editar Bloque</Text>

        <Input
          label="Nombre del bloque"
          placeholder="Ej: 21, 17, 10"
          keyboardType="number-pad"
          value={name}
          onChangeText={setName}
        />

        <Button
          title="Guardar Cambios"
          onPress={handleEditBlock}
          loading={isLoading}
        />

        <View style={styles.deleteSection}>
          <Button
            title="Desactivar Bloque"
            variant="danger"
            onPress={() => {
              if (selectedBlock) {
                setShowEditBlock(false);
                handleDeactivate(selectedBlock);
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
