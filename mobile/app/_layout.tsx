import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/AppProviders';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor={colors.background} translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background
          }
        }}
      />
    </AppProviders>
  );
}
