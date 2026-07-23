"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import {
  createZedperaErrorFromUnknown,
  normalizeZedperaLanguage,
  type ZedperaErrorInfo,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";

type Props = {
  children: ReactNode;
  language?:
    | ZedperaLanguage
    | string
    | null;
  fallback?: ReactNode;
};

type State = {
  error:
    | ZedperaErrorInfo
    | null;
};

export default class ZedperaErrorBoundary extends Component<
  Props,
  State
> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): State {
    return {
      error:
        createZedperaErrorFromUnknown(
          error,
          {
            language: "sk",
            module: "client-render",
          },
        ),
    };
  }

  componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo,
  ) {
    console.error(
      "ZEDPERA_RENDER_ERROR:",
      {
        error,
        componentStack:
          errorInfo.componentStack,
      },
    );

    this.setState({
      error:
        createZedperaErrorFromUnknown(
          error,
          {
            language:
              normalizeZedperaLanguage(
                this.props.language,
              ),
            module:
              "client-render",
          },
        ),
    });
  }

  private reset = () => {
    this.setState({
      error: null,
    });

    window.dispatchEvent(
      new CustomEvent(
        "zedpera:retry-last-action",
      ),
    );
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#03050d] p-5 text-white">
        <div className="w-full max-w-4xl">
          <ZedperaErrorAlert
            error={this.state.error}
            language={
              this.props.language
            }
            variant="modal"
            onRetry={this.reset}
            showAdminDetails={
              process.env.NODE_ENV !==
              "production"
            }
          />
        </div>
      </main>
    );
  }
}
