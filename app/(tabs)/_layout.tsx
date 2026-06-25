import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0B0B0F' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#16161D', borderTopColor: '#16161D' },
        tabBarActiveTintColor: '#7C5CFF',
        tabBarInactiveTintColor: '#8A8A99',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ma salle' }} />
      <Tabs.Screen name="chats" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
