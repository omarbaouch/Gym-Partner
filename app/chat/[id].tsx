import { Stack, useLocalSearchParams } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';

export default function Chat() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Historique.
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));

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
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: true, title: 'Conversation' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-2 p-4"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            return (
              <View
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  mine ? 'self-end bg-primary' : 'self-start bg-surface'
                }`}
              >
                <Text className="text-white">{item.content}</Text>
              </View>
            );
          }}
        />

        <View className="flex-row items-center gap-2 border-t border-surface p-3">
          <TextInput
            className="h-11 flex-1 rounded-2xl bg-surface px-4 text-white"
            placeholder="Écris un message..."
            placeholderTextColor="#8A8A99"
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            className="h-11 items-center justify-center rounded-2xl bg-primary px-4"
          >
            <Text className="font-semibold text-white">Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
