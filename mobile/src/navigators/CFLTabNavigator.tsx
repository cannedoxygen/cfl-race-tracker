import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Import screens
import { RaceScreen } from '../screens/cfl/RaceScreen';
import { JackpotScreen } from '../screens/cfl/JackpotScreen';
import { ReferralScreen } from '../screens/cfl/ReferralScreen';

const Tab = createBottomTabNavigator();

// Lightning bolt icon for Race
function RaceIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Star icon for Jackpot
function JackpotIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Gift icon for Referrals
function ReferralIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="8" width="18" height="13" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M12 8V21" stroke={color} strokeWidth={2} />
      <Path d="M3 12H21" stroke={color} strokeWidth={2} />
      <Path
        d="M12 8C12 8 12 5 9 5C6 5 6 8 9 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 8C12 8 12 5 15 5C18 5 18 8 15 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Custom tab bar icon component
function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const size = 24;
  const iconColor = focused ? color : COLORS.textMuted;

  switch (name) {
    case 'Race':
      return (
        <View style={styles.iconContainer}>
          <RaceIcon color={iconColor} size={size} />
        </View>
      );
    case 'Jackpot':
      return (
        <View style={styles.iconContainer}>
          <JackpotIcon color={iconColor} size={size} />
        </View>
      );
    case 'Referrals':
      return (
        <View style={styles.iconContainer}>
          <ReferralIcon color={iconColor} size={size} />
        </View>
      );
    default:
      return null;
  }
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
    height: 65,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
