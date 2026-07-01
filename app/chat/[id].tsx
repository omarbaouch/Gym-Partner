import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { markConversationRead } from '@/features/chat/markRead';
import { useAuth } from '@/features/auth/AuthProvider';
import { useConversations, type ConversationSummary } from '@/features/chat/useConversations';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';

export default function Chat() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Interlocuteur (nom/avatar) : déjà chargé par l'onglet Messages, réutilisé
  // ici sans nouvelle requête. Marche aussi en arrivant par notification push.
  const { data: conversations } = useConversations();
  const partner = conversations?.find(
    (c: ConversationSummary) => c.conversation_id === conversationId,
  );
  const initials = partner?.other_name?.slice(0, 2).toUpperCase() ?? '';

  useEffect(() => {
    if (!conversationId) return;

    setLoadingMessages(true);

    // Historique.
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoadingMessages(false);
        if (me) markConversationRead(conversationId, me);
      });

    // Temps réel : nouveaux messages de cette conversation.
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          // Marque lu immédiatement si le message vient de l'interlocuteur.
          if (me && msg.sender_id !== me) markConversationRead(conversationId, me);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, me]);

  async function send() {
    const content = text.trim();
    if (!content || !me || !conversationId) return;
    setText('');
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: me,
      content,
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      {/* En-tête sombre : retour + interlocuteur (cohérent avec le reste de l'app). */}
      <View className="flex-row items-center gap-3 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        {partner?.other_avatar ? (
          <Image
            source={partner.other_avatar}
            style={{ height: 40, width: 40, borderRadius: 20 }}
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surfaceHigh">
            <Text className="font-bold text-primary">{initials}</Text>
          </View>
        )}
        <Text className="flex-1 font-display text-lg text-white" numberOfLines={1}>
          {partner?.other_name ?? 'Conversation'}
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!loadingMessages && messages.length === 0 ? (
          <EmptyState
            icon="chatbubble-ellipses"
            title="Dites bonjour !"
            subtitle="Lancez la conversation pour organiser votre prochaine séance."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerClassName="gap-2 pb-4"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              // Message « système » de match : pilule centrée, pas une bulle.
              if (item.content.startsWith('🤝 ')) {
                return (
                  <View className="my-1 self-center rounded-full border border-primary/40 bg-primary/10 px-4 py-2">
                    <Text className="text-center text-xs font-semibold text-primary">
                      {item.content}
                    </Text>
                  </View>
                );
              }
              const mine = item.sender_id === me;
              return (
                <View
                  className={`max-w-[80%] rounded-3xl px-4 py-2.5 ${
                    mine
                      ? 'self-end rounded-br-md bg-primary'
                      : 'self-start rounded-bl-md border border-border bg-surface'
                  }`}
                >
                  <Text className={mine ? 'font-medium text-background' : 'text-white'}>
                    {item.content}
                  </Text>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-center gap-2 pb-3 pt-2">
          <TextInput
            className="h-14 flex-1 rounded-4xl border border-border bg-surface px-5 text-white"
            placeholder="Écris un message..."
            placeholderTextColor="#8A8A99"
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            accessibilityLabel="Message"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Envoyer le message"
            accessibilityState={{ disabled: !text.trim() }}
            className={`h-14 w-14 items-center justify-center rounded-4xl bg-primary ${
              !text.trim() ? 'opacity-50' : ''
            }`}
          >
            <Ionicons name="send" size={20} color="#160E0B" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
