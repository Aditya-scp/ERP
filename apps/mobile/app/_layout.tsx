import { Stack } from 'expo-router';
import '../global.css';

export default function RootNavigationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)/login" options={{ title: 'Sign In' }} />
    </Stack>
  );
}
