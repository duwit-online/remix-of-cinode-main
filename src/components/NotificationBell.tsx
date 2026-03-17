import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return (
    <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
      <Bell size={18} />
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto glass rounded-2xl border border-border/30 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-border/20">
              <p className="text-sm font-display font-bold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-[10px] text-primary font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications?.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">No notifications</p>
            ) : (
              notifications?.slice(0, 20).map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) markAsRead.mutate(n.id); }}
                  className={`p-3 border-b border-border/10 cursor-pointer transition-colors ${
                    n.is_read ? "opacity-60" : "hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    <p className="text-xs font-medium">{n.title}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-3.5">{n.message}</p>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
