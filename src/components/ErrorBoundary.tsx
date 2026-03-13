import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>💥</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
          {this.state.message}
        </Text>
        <TouchableOpacity
          onPress={() => this.setState({ hasError: false, message: '' })}
          style={{ backgroundColor: '#0ea5e9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
