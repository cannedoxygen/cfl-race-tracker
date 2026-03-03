// Polyfills - must be first for Solana wallet
import "./src/polyfills";

import React from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';

import { CFLTabNavigator } from './src/navigators/CFLTabNavigator';
import { COLORS } from './src/constants/theme';

// Custom CFL Dark Theme
const CFLTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.gold,
    background: COLORS.bg,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.orange,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.bg}
        translucent={false}
      />
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <NavigationContainer theme={CFLTheme}>
          <CFLTabNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
