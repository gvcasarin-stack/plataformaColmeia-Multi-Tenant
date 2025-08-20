"use client";

import React from 'react';
import { Button } from './ui/button';
import logger from '@/lib/utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">Algo deu errado</h2>
          <p className="text-gray-600 mt-2">Ocorreu um erro ao carregar este componente.</p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4"
          >
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
} 