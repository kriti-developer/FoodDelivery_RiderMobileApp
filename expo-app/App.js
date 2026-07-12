import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RiderProvider } from './src/context/RiderContext';
import RootNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <RiderProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </RiderProvider>
    </SafeAreaProvider>
  );
}
