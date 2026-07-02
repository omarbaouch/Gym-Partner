import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { markConversationRead } from '@/features/chat/markRead';
import { useAuth } from '@/features/auth/AuthProvider';
import { useConversations, type ConversationSummary } from '@/features/chat/useConversations';
import {
  useConversationSession,
  useProposeSession,
  useRespondSession,
  type Session,
} from '@/features/sessions/useSessions';
import { formatDayLabel, formatSessionDate } from '@/lib/time';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import type { Message } from '@/types/database';

// Messages « système » (match, séance) affichés en pilule, pas en bulle.
const SYSTEM_PREFIXES = ['🤝 ', '📅 ', '✅ ', '❌ '];

// Créneaux proposables : 5 prochains jours × heures habituelles de salle.
const PROPOSAL_HOURS = [7, 9, 12, 17, 18, 19, 20];

function SessionCard({
  session,
  me,
  conversationId,
}: {
  session: Session;
  me: string | undefined;
  conversationId: string;
}) {
  const respond = useRespondSession();
  const mine = session.proposer === me;
  const when = formatSessionDate(session.scheduled_at);

  if (session.status === 'confirmee') {
    return (
      <View className="mb-2 flex-row items-center gap-3 rounded-4xl border border-primary/40 bg-surface p-4">
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text className="flex-1 font-bold text-white">Séance confirmée · {when}</Text>
      </View>
    );
  }
  return (
    <View className="mb-2 gap-3 rounded-4xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Ionicons name="calendar-outline" size={20} color={colors.muted} />
        <Text className="flex-1 font-semibold text-white">
          Séance proposée · {when}
        </Text>
      </View>
      {mine ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">En attente de confirmation…</Text>
          <Pressable
            onPress={() =>
              respond.mutate({ sessionId: session.id, accept: false, conversationId })
            }
            accessibilityRole="button"
            accessibilityLabel="Annuler la proposition"
          >
            <Text className="text-sm text-muted underline">Annuler</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label="Confirmer"
              icon="checkmark"
              onPress={() =>
                respond.mutate({ sessionId: session.id, accept: true, conversationId })
              }
              loading={respond.isPending}
            />
          </View>
          <Pressable
            onPress={() =>
              respond.mutate({ sessionId: session.id, accept: false, conversationId })
            }
            accessibilityRole="button"
            accessibilityLabel="Décliner la proposition"
            className="h-14 items-center justify-center rounded-4xl border border-border px-5"
          >
            <Text className="font-semibold text-muted">Décliner</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

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

  // Séance : carte épinglée + panneau de proposition (jour × heure).
  const { data: activeSession } = useConversationSession(conversationId);
  const propose = useProposeSession();
  const [planning, setPlanning] = useState(false);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const dayOptions = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  async function onPropose() {
    if (dayOffset === null || hour === null || !conversationId) return;
    const at = new Date();
    at.setDate(at.getDate() + dayOffset);
    at.setHours(hour, 0, 0, 0);
    try {
      await propose.mutateAsync({ conversationId, at });
      setPlanning(false);
      setDayOffset(null);
      setHour(null);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Proposition impossible.');
    }
  }

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
          <Ionicons name="chevron-back" size={22} color={colors.text} />
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
        {activeSession && conversationId && (
          <SessionCard session={activeSession} me={me} conversationId={conversationId} />
        )}
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
              // Message « système » (match, séance) : pilule centrée, pas une bulle.
              if (SYSTEM_PREFIXES.some((p) => item.content.startsWith(p))) {
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
                  className={`max-w-[80%] rounded-4xl px-4 py-2.5 ${
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

        {planning && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            className="mb-2 gap-3 rounded-4xl border border-border bg-surface p-4"
          >
            <Text className="font-head text-xs uppercase tracking-widest text-muted">
              Proposer une séance
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {dayOptions.map((d, i) => (
                <Chip
                  key={i}
                  label={formatDayLabel(d)}
                  active={dayOffset === i}
                  onPress={() => setDayOffset(i)}
                />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {PROPOSAL_HOURS.map((h) => {
                const past = dayOffset === 0 && h <= new Date().getHours();
                if (past) return null;
                return (
                  <Chip key={h} label={`${h} h`} active={hour === h} onPress={() => setHour(h)} />
                );
              })}
            </View>
            <Button
              label="Proposer"
              icon="calendar"
              onPress={onPropose}
              loading={propose.isPending}
              disabled={dayOffset === null || hour === null}
            />
          </Animated.View>
        )}

        <View className="flex-row items-center gap-2 pb-3 pt-2">
          <Pressable
            onPress={() => setPlanning((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Proposer une séance"
            accessibilityState={{ expanded: planning }}
            className={`h-14 w-14 items-center justify-center rounded-4xl border ${
              planning ? 'border-primary bg-primary/10' : 'border-border bg-surface'
            }`}
          >
            <Ionicons
              name={planning ? 'close' : 'calendar-outline'}
              size={20}
              color={planning ? colors.primary : colors.muted}
            />
          </Pressable>
          <TextInput
            className="h-14 flex-1 rounded-4xl border border-border bg-surface px-5 text-white"
            placeholder="Écris un message..."
            placeholderTextColor={colors.placeholder}
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
            <Ionicons name="send" size={20} color={colors.background} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
