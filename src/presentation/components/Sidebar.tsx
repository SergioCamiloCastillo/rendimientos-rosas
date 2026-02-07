import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

const SIDEBAR_WIDTH = 280;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ visible, onClose }) => {
  const [showRendimientosSubmenu, setShowRendimientosSubmenu] = useState(true);
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible]);

  if (!isVisible && !visible) return null;

  const navigateTo = (screen: string) => {
    onClose();
    navigation.navigate(screen as never);
  };

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Menú</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content}>
          <TouchableOpacity 
            style={styles.menuSection} 
            onPress={() => setShowRendimientosSubmenu(!showRendimientosSubmenu)}
          >
            <View style={styles.menuSectionHeader}>
              <MaterialIcons name="trending-up" size={24} color={colors.primary} />
              <Text style={styles.menuSectionTitle}>Rendimientos</Text>
            </View>
            <MaterialIcons 
              name={showRendimientosSubmenu ? "expand-less" : "expand-more"} 
              size={24} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showRendimientosSubmenu && (
            <View style={styles.submenuContainer}>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Dashboard')}
              >
                <MaterialIcons name="home" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Inicio</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Workers')}
              >
                <MaterialIcons name="people" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Equipo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Activities')}
              >
                <MaterialIcons name="assignment" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Tareas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Records')}
              >
                <MaterialIcons name="history" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Historial</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Stats')}
              >
                <MaterialIcons name="bar-chart" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Estadísticas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Export')}
              >
                <MaterialIcons name="file-download" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Exportar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submenuItem} 
                onPress={() => navigateTo('Absences')}
              >
                <MaterialIcons name="event-busy" size={20} color={colors.textSecondary} />
                <Text style={styles.submenuItemText}>Ausencias</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
};

export const MenuButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuButton}>
    <MaterialIcons name="menu" size={24} color={colors.text} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surface,
    zIndex: 1001,
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  menuSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  submenuContainer: {
    backgroundColor: colors.gray[50],
    paddingLeft: 24,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  submenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  menuButton: {
    padding: 4,
  },
});
