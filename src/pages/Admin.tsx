import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Settings, Users, Film, Megaphone, Bell, ArrowLeft, Server } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminContent from "@/components/admin/AdminContent";
import AdminAds from "@/components/admin/AdminAds";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminServers from "@/components/admin/AdminServers";

type Tab = "settings" | "users" | "content" | "servers" | "ads" | "notifications";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "servers", label: "Servers", icon: Server },
  { id: "content", label: "Content", icon: Film },
  { id: "users", label: "Users", icon: Users },
  { id: "ads", label: "Ads", icon: Megaphone },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, loading, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="p-2 rounded-full hover:bg-secondary/50">
            <ArrowLeft size={20} />
          </button>
          <Shield size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "settings" && <AdminSettings />}
        {activeTab === "servers" && <AdminServers />}
        {activeTab === "content" && <AdminContent />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "ads" && <AdminAds />}
        {activeTab === "notifications" && <AdminNotifications />}
      </motion.div>
    </div>
  );
};

export default Admin;
