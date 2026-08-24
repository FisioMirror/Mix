import { Component, type ReactNode, type ErrorInfo } from 'react';
import MascotAnimation from './MascotAnimation';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass-card max-w-md w-full p-8 text-center">
            <MascotAnimation type="error" size="md" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary-800 mb-2">Algo salió mal</h2>
            <p className="text-sm text-primary-500 mb-4">
              {this.state.error?.message ?? 'Ocurrió un error inesperado.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-primary-700 text-white text-sm font-medium hover:bg-primary-800"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
