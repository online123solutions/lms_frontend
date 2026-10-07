import React, { useEffect } from "react";
import { createPortal } from "react-dom";

// Portal to <body> so dashboard stacking contexts (and the mobile menu button) can't cover it
export default function Modal({ title, onClose, children, footer, size }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="qm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`qm-modal ${size || ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="qm-modal-head">
          <h3 className="qm-modal-title">{title}</h3>
          <button className="qm-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="qm-modal-body">{children}</div>
        {footer && <div className="qm-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Delete", onConfirm, onClose, busy }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="qm-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="qm-btn danger-solid" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{message}</div>
    </Modal>
  );
}
