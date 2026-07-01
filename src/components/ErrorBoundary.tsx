import { Component, type ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

import { colors } from '@/theme/colors';

type Props = {
  children: ReactNode;
  // Si fourni, affiché à la place de l'erreur (mode silencieux pour un sous-arbre non critique).
  fallback?: ReactNode;
};

type State = { error: Error | null };

// Capture les erreurs de rendu JS pour éviter un écran figé/blanc.
// Sans `fallback`, affiche le message d'erreur (diagnostic sur appareil).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return <>{this.props.fallback}</>;
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 12 }}
        >
          <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '800' }}>
            Une erreur est survenue
          </Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {this.state.error.stack?.slice(0, 1500)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}
