import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Affiche les notifications même app au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }) as Notifications.NotificationBehavior,
});

export async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function openConversation(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined,
) {
  const id = data?.conversationId;
  if (id) router.push({ pathname: '/chat/[id]', params: { id: String(id) } });
}

// Configure le canal Android et la navigation au tap sur une notification.
export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    setupAndroidChannel();

    // App ouverte depuis une notification (démarrage à froid).
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      openConversation(router, resp?.notification.request.content.data);
    });

    // App déjà ouverte : tap sur une notification.
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      openConversation(router, resp.notification.request.content.data);
    });
    return () => sub.remove();
  }, [router]);
}
