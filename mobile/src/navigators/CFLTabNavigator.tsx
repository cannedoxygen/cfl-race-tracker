import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS } from '../constants/theme';

// Import screens
import { RaceScreen } from '../screens/cfl/RaceScreen';
import { JackpotScreen } from '../screens/cfl/JackpotScreen';
import { ReferralScreen } from '../screens/cfl/ReferralScreen';

const Tab = createBottomTabNavigator();

// Custom tab bar icon component
function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    Race: '🏎️',
    Jackpot: '🎰',
    Referrals: '🎁',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, { opacity: focused ? 1 : 0.6 }]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

export function CFLTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Race"
        component={RaceScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="Race" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Jackpot"
        component={JackpotScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="Jackpot" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Referrals"
        component={ReferralScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="Referrals" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 2,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
