import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Bookmark, Trash2 } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  items: { id: number; type: "movie" | "tv"; title: string; poster: string }[];
}

const Collections = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cinode_collections");
    if (stored) setCollections(JSON.parse(stored));
  }, []);

  const save = (cols: Collection[]) => {
    setCollections(cols);
    localStorage.setItem("cinode_collections", JSON.stringify(cols));
  };

  const createCollection = () => {
    if (!newName.trim()) return;
    save([...collections, { id: Date.now(), name: newName.trim(), items: [] }]);
    setNewName("");
    setShowCreate(false);
  };

  const deleteCollection = (id: number) => {
    save(collections.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-black">Collections</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        {showCreate && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="mb-4 overflow-hidden">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name..."
                className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                autoFocus
              />
              <button onClick={createCollection} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                Create
              </button>
            </div>
          </motion.div>
        )}

        {collections.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">No collections yet. Create one to start organizing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((col) => (
              <div key={col.id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm">{col.name}</h3>
                  <p className="text-muted-foreground text-xs">{col.items.length} items</p>
                </div>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Collections;
