// Reusable Modal component with consistent styling & accessibility
// Props:
//  - title: string heading
//  - onClose: function to close modal (backdrop & close button)
//  - children: modal body content
//  - footer: React node rendered in sticky footer area (actions)
//  - size: sm | md | lg (controls max width)
//  - initialFocusRef: optional ref for focusing first interactive element
//  - hideClose: optionally hide the X button

// Extend studentFormSchema to cover all fields (add/edit).
// Replace manual register rules with zod + error mapping.
// Extract Student form into a reusable component.
import { useEffect, useRef } from "react";

const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl" };

const Modal = ({
  title,
  onClose,
  children,
  footer,
  size = "md",
  initialFocusRef,
  hideClose = false,
}) => {
  const dialogRef = useRef(null);

  // Focus trapping (minimal) & initial focus
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusTarget = initialFocusRef?.current || dialogRef.current;
    focusTarget && focusTarget.focus?.();

    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Tab") {
        // Basic focus trap
        const focusable = dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || !focusable.length) return;
        const list = Array.from(focusable);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused && previouslyFocused.focus?.();
    };
  }, [onClose, initialFocusRef]);

  const maxWidth = sizeMap[size] || sizeMap.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/70 via-gray-900/60 to-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-white/95 backdrop-blur-xl animate-scaleIn flex flex-col`}
      >
        <div className="relative px-6 py-4 border-b border-gray-100/60 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white">
          <h2 className="text-lg font-semibold tracking-wide drop-shadow-sm">
            {title}
          </h2>
          {!hideClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 text-white/80 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="px-6 pt-5 pb-4 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100/60 bg-gray-50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
