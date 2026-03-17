import { useState } from "react";
import { useAppSettings, useUpdateSetting } from "@/hooks/useAppSettings";
import { Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const settingsConfig = [
  { key: "site_name", label: "Site Name", type: "text" },
  { key: "site_logo_url", label: "Logo URL", type: "text" },
  { key: "footer_text", label: "Footer Text", type: "text" },
  { key: "announcement_banner", label: "Announcement Banner", type: "text" },
  { key: "default_stream_server", label: "Default Stream Server", type: "text" },
  { key: "tmdb_api_base", label: "TMDB API Base URL", type: "text" },
  { key: "theme_primary_color", label: "Primary Color (HSL)", type: "text" },
  { key: "theme_accent_color", label: "Accent Color (HSL)", type: "text" },
  { key: "maintenance_mode", label: "Maintenance Mode", type: "toggle" },
  { key: "enable_ads", label: "Enable Ads", type: "toggle" },
  { key: "enable_notifications", label: "Enable Notifications", type: "toggle" },
  { key: "enable_downloads", label: "Enable Downloads", type: "toggle" },
];

const AdminSettings = () => {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const getValue = (key: string) => {
    if (key in localValues) return localValues[key];
    return settings?.[key] ?? "";
  };

  const handleSave = async (key: string) => {
    setSavingKey(key);
    try {
      await updateSetting.mutateAsync({ key, value: localValues[key] ?? settings?.[key] });
      toast({ title: "Setting saved", description: `${key} updated successfully.` });
      setLocalValues((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } catch {
      toast({ title: "Error", description: "Failed to save setting.", variant: "destructive" });
    }
    setSavingKey(null);
  };

  const handleToggle = async (key: string) => {
    const current = settings?.[key] ?? false;
    setSavingKey(key);
    try {
      await updateSetting.mutateAsync({ key, value: !current });
      toast({ title: "Setting toggled" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setSavingKey(null);
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading settings...</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Configure your app's branding, streaming servers, theme, and feature toggles.
      </p>
      {settingsConfig.map((s) => (
        <div key={s.key} className="glass rounded-2xl p-4 border border-border/30">
          <label className="text-xs text-muted-foreground block mb-1">{s.label}</label>
          {s.type === "toggle" ? (
            <button
              onClick={() => handleToggle(s.key)}
              disabled={savingKey === s.key}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                getValue(s.key) ? "bg-primary" : "bg-secondary"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${
                  getValue(s.key) ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={getValue(s.key)}
                onChange={(e) => setLocalValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              {s.key in localValues && (
                <button
                  onClick={() => handleSave(s.key)}
                  disabled={savingKey === s.key}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
                >
                  {savingKey === s.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminSettings;
