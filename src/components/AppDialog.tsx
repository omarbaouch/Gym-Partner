import { Modal, Pressable, Text, View } from 'react-native';
import { create } from 'zustand';

import { colors } from '@/theme/colors';

// Dialogue maison au thème de l'app — remplace Alert.alert (popups système
// blanches, hors charte). API impérative identique dans l'esprit :
//   showDialog({ title, message, actions: [...] })
//   showError('...') / showInfo('titre', 'message')
// Fermeture : bouton retour Android (onRequestClose), tap sur le fond, ou
// action de style 'cancel'.

export type DialogAction = {
  label: string;
  style?: 'default' | 'destructive' | 'cancel';
  onPress?: () => void | Promise<void>;
};

export type DialogOptions = {
  title: string;
  message?: string;
  actions?: DialogAction[]; // défaut : un simple « OK »
};

type DialogState = {
  current: DialogOptions | null;
  show: (opts: DialogOptions) => void;
  hide: () => void;
};

const useDialogStore = create<DialogState>((set) => ({
  current: null,
  show: (opts) => set({ current: opts }),
  hide: () => set({ current: null }),
}));

export function showDialog(opts: DialogOptions) {
  useDialogStore.getState().show(opts);
}

export function showError(message: string, title = 'Oups') {
  showDialog({ title, message });
}

export function showInfo(title: string, message?: string) {
  showDialog({ title, message });
}

function actionColor(style?: DialogAction['style']) {
  if (style === 'destructive') return colors.danger;
  if (style === 'cancel') return colors.muted;
  return colors.primary;
}

// À monter UNE fois à la racine (app/_layout.tsx).
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const hide = useDialogStore((s) => s.hide);
  if (!current) return null;

  const actions: DialogAction[] =
    current.actions && current.actions.length > 0
      ? current.actions
      : [{ label: 'OK', style: 'cancel' }];

  function run(action: DialogAction) {
    hide();
    // Après la fermeture : évite qu'un dialogue ouvert par l'action
    // (ex. « Merci » après un signalement) soit aussitôt écrasé.
    setTimeout(() => action.onPress?.(), 50);
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hide} // bouton retour Android = annuler
    >
      {/* Fond : tap = annuler */}
      <Pressable
        onPress={hide}
        accessibilityLabel="Fermer"
        className="flex-1 items-center justify-center bg-black/60 px-8"
      >
        {/* Carte : stoppe la propagation du tap */}
        <Pressable
          onPress={() => {}}
          className="w-full max-w-sm overflow-hidden rounded-4xl border border-border bg-surface"
        >
          <View className="gap-2 p-5 pb-4">
            <Text className="font-display text-xl text-white">{current.title}</Text>
            {current.message ? (
              <Text className="text-sm leading-5 text-muted">{current.message}</Text>
            ) : null}
          </View>

          <View className="border-t border-border">
            {actions.map((a, i) => (
              <Pressable
                key={`${a.label}-${i}`}
                onPress={() => run(a)}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                className={`items-center px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
                android_ripple={{ color: colors.border }}
              >
                <Text
                  className={a.style === 'cancel' ? 'font-semibold' : 'font-bold'}
                  style={{ color: actionColor(a.style) }}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
