import { useEffect, useMemo, useState } from "react";
import NotificationList from "../../Components/Notification";
import { fetchTraineeNotifications, markNotificationRead } from "../../api/traineeAPIservice";
import "../../utils/css/Trainee CSS/TraineeNotification.css";

function Toolbar({ unreadOnly, setUnreadOnly, onRefresh }) {
  return (
    <div className="notif-toolbar">
      <div className="notif-tabs">
        <button
          className={`notif-tab ${!unreadOnly ? "active" : ""}`}
          onClick={() => setUnreadOnly(false)}
        >
          All
        </button>
        <button
          className={`notif-tab ${unreadOnly ? "active" : ""}`}
          onClick={() => setUnreadOnly(true)}
        >
          Unread
        </button>
      </div>

      <div className="notif-toolbar-actions">
        <button className="notif-btn ghost" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}

export default function TraineeNotificationsPage({ onRefreshBadge }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetchTraineeNotifications({ unread: false });
    if (res.success && Array.isArray(res.data)) {
      // newest first
      const sorted = [...res.data].sort(
        (a, b) =>
          new Date(b.delivered_at || b.notification?.created_at || 0) -
          new Date(a.delivered_at || a.notification?.created_at || 0)
      );
      setItems(sorted);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (unreadOnly ? items.filter((r) => !r.is_read) : items),
    [items, unreadOnly]
  );

  const onMarkRead = async (notificationId) => {
    const res = await markNotificationRead(notificationId);
    if (res.success) {
      setItems((prev) =>
        prev.map((r) =>
          (r.notification?.id ?? r.id) === notificationId
            ? { ...r, is_read: true, read_at: new Date().toISOString() }
            : r
        )
      );
      onRefreshBadge?.();
    }
  };

  return (
    <div className="notif-container">
      <div className="notif-header">
        <h2>Notifications</h2>
        <p className="notif-subtitle">
          Updates from your trainer appear here. Click a link or mark as read.
        </p>
      </div>

      <Toolbar
        unreadOnly={unreadOnly}
        setUnreadOnly={setUnreadOnly}
        onRefresh={load}
      />

      {loading ? (
        <div className="notif-skeleton">
          <div className="notif-skel-card" />
          <div className="notif-skel-card" />
          <div className="notif-skel-card" />
        </div>
      ) : (
        <NotificationList items={filtered} onMarkRead={onMarkRead} />
      )}
    </div>
  );
}

