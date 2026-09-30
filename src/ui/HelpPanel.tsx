import { useEffect, useLayoutEffect, useRef } from "react";
import { guideHtml } from "./guide.ts";

/**
 * The user guide, shown in front of the app. It stays mounted while closed,
 * and its scroll position is restored on every open, so a reviewer can switch
 * between the guide and the form without losing their place.
 */
export function HelpPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);

  useLayoutEffect(() => {
    if (!open || !content.current) return;
    content.current.scrollTop = scrollTop.current;
    content.current.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className="help-overlay"
      hidden={!open}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        id="help-panel"
        className="help-panel"
        role="dialog"
        aria-labelledby="help-title"
      >
        <div className="help-header">
          <h2 id="help-title">User guide</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div
          ref={content}
          className="help-content"
          tabIndex={-1}
          onScroll={(event) => {
            scrollTop.current = event.currentTarget.scrollTop;
          }}
          dangerouslySetInnerHTML={{ __html: guideHtml }}
        />
      </section>
    </div>
  );
}
