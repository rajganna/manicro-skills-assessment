import { useEffect, useState } from "react";

const TEN_MINUTES_MS = 10 * 60 * 1000;

const RuntimeGuard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [showError, setShowError] = useState<boolean>(false);

  // Timeout logic
  useEffect(() => {
    const timeoutId: number = window.setTimeout(() => {
      setLoading(false);
      setShowError(true);
    }, TEN_MINUTES_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Scroll lock while spinner or error modal is visible
  useEffect(() => {
    const shouldLockScroll = loading || showError;
    document.body.style.overflow = shouldLockScroll ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [loading, showError]);

  // Cancel button handler
  const handleCancel = (): void => {
    setShowError(false);
    setLoading(false);
  };

  return (
    <>
      {/* Full-screen spinner */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {/* Error modal */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
            <h2 className="mb-2 text-lg font-semibold text-red-600">
              Runtime Error
            </h2>

            <p className="mb-6 text-sm text-gray-700">
              Encountered an unexpected runtime error.
              Please reinstall the runtime or try on a different system.
            </p>

            <div className="flex justify-center gap-4">
              <button
                className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RuntimeGuard;
