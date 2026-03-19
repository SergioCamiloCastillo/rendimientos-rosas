import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Drawer as PaperDrawer, Portal, Modal, Appbar, Divider, List } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ visible, onClose }) => {
  const [expanded, setExpanded] = useState(true);
  const navigation = useNavigation();

  const navigateTo = (screen: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen as never);
    }, 100);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
        dismissable={true}
      >
        <View style={styles.drawerContainer}>
          <Appbar.Header style={styles.header} elevated>
            <Appbar.Content 
              title="Menú Principal" 
              titleStyle={styles.headerTitle}
            />
            <Appbar.Action 
              icon="close" 
              onPress={onClose}
              iconColor={colors.white}
            />
          </Appbar.Header>
          <Divider />
          <ScrollView>
            <List.Accordion
              title="Rendimientos"
              titleStyle={styles.accordionTitle}
              left={props => <List.Icon {...props} icon="trending-up" color={colors.primary} />}
              expanded={expanded}
              onPress={() => setExpanded(!expanded)}
            >
              <PaperDrawer.Item
                label="Inicio"
                icon={() => <MaterialIcons name="home" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Dashboard')}
              />
              <PaperDrawer.Item
                label="Equipo"
                icon={() => <MaterialIcons name="people" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Workers')}
              />
              <PaperDrawer.Item
                label="Tareas"
                icon={() => <MaterialIcons name="assignment" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Activities')}
              />
               <PaperDrawer.Item
                label="Bloques"
                icon={() => <MaterialIcons name="grid-view" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Blocks')}
              />
              <PaperDrawer.Item
                label="Historial"
                icon={() => <MaterialIcons name="history" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Records')}
              />
              
              <PaperDrawer.Item
                label="Estadísticas"
                icon={() => <MaterialIcons name="bar-chart" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Stats')}
              />
              <PaperDrawer.Item
                label="Exportar"
                icon={() => <MaterialIcons name="file-download" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Export')}
              />
              <PaperDrawer.Item
                label="Metas Semanales"
                icon={() => <MaterialIcons name="flag" size={24} color={colors.primary} />}
                onPress={() => navigateTo('WeeklyGoals')}
              />
              <PaperDrawer.Item
                label="Ausencias"
                icon={() => <MaterialIcons name="event-busy" size={24} color={colors.primary} />}
                onPress={() => navigateTo('Absences')}
              />
             
            </List.Accordion>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

export const MenuButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuButton}>
    <MaterialIcons name="menu" size={24} color={colors.text} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primary,
    elevation: 4,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuButton: {
    padding: 4,
  },
});
