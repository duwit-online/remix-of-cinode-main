import { useNavigate } from "react-router-dom";
import { Film, X } from "lucide-react";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthGateModal = ({ open, onClose }: AuthGateModalProps) => {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-3xl p-6 border border-border/30 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 text-muted-foreground"><X size={18} /></button>
        <Film size={40} className="text-primary mx-auto mb-3" />
        <h2 className="font-display font-bold text-lg mb-1">Sign in to start watching 🎬</h2>
        <p className="text-sm text-muted-foreground mb-5">Create a free account to stream movies and TV shows.</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => { onClose(); navigate("/auth"); }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            Sign In
          </button>
          <button onClick={() => { onClose(); navigate("/auth?mode=signup"); }} className="w-full py-3 rounded-xl border border-border/30 text-sm font-medium hover:bg-secondary/50 transition-colors">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthGateModal;
