import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  DashboardScreen,
  WorkersScreen,
  ActivitiesScreen,
  RecordsScreen,
  ExportScreen,
  StatsScreen,
  AbsencesScreen,
} from '../screens';

const Tab = createBottomTabNavigator();

type IconName = keyof typeof MaterialIcons.glyphMap;

const TabIcon = ({ icon, focused }: { icon: IconName; focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
    <MaterialIcons 
      name={icon} 
      size={24} 
      color={focused ? colors.primary : colors.textSecondary} 
    />
  </View>
);

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false as const,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ focused }) => <TabIcon icon="home" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Workers"
          component={WorkersScreen}
          options={{
            tabBarLabel: 'Equipo',
            tabBarIcon: ({ focused }) => <TabIcon icon="people" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Activities"
          component={ActivitiesScreen}
          options={{
            tabBarLabel: 'Tareas',
            tabBarIcon: ({ focused }) => <TabIcon icon="assignment" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Records"
          component={RecordsScreen}
          options={{
            tabBarLabel: 'Historial',
            tabBarIcon: ({ focused }) => <TabIcon icon="history" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Export"
          component={ExportScreen}
          options={{
            tabBarLabel: 'Exportar',
            tabBarIcon: ({ focused }) => <TabIcon icon="file-download" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="Absences"
          component={AbsencesScreen}
          options={{
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    height: 105,
    paddingBottom: 30,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.primaryLight,
  },
});
