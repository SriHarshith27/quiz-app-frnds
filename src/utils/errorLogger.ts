// Error logger utility for tracking and reporting errors

interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  context?: any;
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private maxErrors = 50; // Keep last 50 errors

  log(error: Error | string, context?: any) {
    const errorLog: ErrorLog = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context
    };

    this.errors.push(errorLog);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error logged:', errorLog);
    }

    // In production, you could send to a service like Sentry
    // this.sendToMonitoring(errorLog);
  }

  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  // Future: Send to monitoring service
  // private sendToMonitoring(errorLog: ErrorLog) {
  //   // Implement Sentry, LogRocket, etc.
  // }
}

export const errorLogger = new ErrorLogger();
