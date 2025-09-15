import PropTypes from "prop-types";
import "./Notification.css"; // Assuming you have a CSS file for styling

const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "";
  }
};

export default function NotificationList({ items, onMarkRead, compact = false }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="notif-empty">
        <div className="notif-empty-icon">🔔</div>
        <div className="notif-empty-title">You’re all caught up</div>
        <div className="notif-empty-desc">No notifications to show.</div>
      </div>
    );
  }

  return (
    <div className="notif-list">
      {items.map((rec, idx) => {
        const n = rec.notification ?? rec; // supports both shapes
        const key = rec.id ?? n.id ?? idx;
        const unread = typeof rec.is_read === "boolean" ? !rec.is_read : false;
        const when = fmt(n?.created_at || rec?.delivered_at || rec?.read_at);

        return (
          <article
            key={key}
            className={`notif-card ${unread ? "is-unread" : ""}`}
          >
            <div className="notif-accent" />
            <div className="notif-content">
              <header className="notif-row">
                <div className="notif-title">
                  <span className={`notif-dot ${unread ? "" : "read"}`} />
                  <strong>{n?.subject || "Notification"}</strong>
                </div>
                <time className="notif-when">{when}</time>
              </header>

              {!compact && n?.message && (
                <p className="notif-text">{n.message}</p>
              )}

              <footer className="notif-row">
                <span className="notif-from">From: {n?.sent_by ?? "—"}</span>
                <div className="notif-actions">
                  {n?.link && (
                    <a
                      className="notif-btn link"
                      href={n.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open link
                    </a>
                  )}
                  {unread && typeof onMarkRead === "function" && n?.id && (
                    <button className="notif-btn" onClick={() => onMarkRead(n.id)}>
                      Mark as read
                    </button>
                  )}
                </div>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}

NotificationList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onMarkRead: PropTypes.func,
  compact: PropTypes.bool,
};
