// Create src/components/StartupErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface StartupErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class StartupErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  StartupErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    console.log('🚨 Startup Error Boundary caught:', error);
    return { 
      hasError: true, 
      error,
      errorInfo: error.message || 'App startup failed'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Startup Error Details:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App Startup Failed</Text>
          <Text style={styles.subtitle}>
            The Triage System encountered a startup error.
          </Text>
          
          {__DEV__ && this.state.errorInfo && (
            <Text style={styles.errorText}>
              {this.state.errorInfo}
            </Text>
          )}
          
          <TouchableOpacity 
            style={styles.restartButton}
            onPress={this.handleRestart}
          >
            <Text style={styles.restartButtonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F2419',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  restartButton: {
    backgroundColor: '#388E3C',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});