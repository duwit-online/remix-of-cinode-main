import { useState } from "react";
import { Search, Bell, User, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = ["Home", "Movies", "Series", "My List"];

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b-0">
      <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
        {/* Logo */}
        <h1 className="text-2xl font-display font-black tracking-tight text-gradient">CINODE

        </h1>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) =>
          <button
            key={item}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group">

              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full transition-all group-hover:w-full" />
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {searchOpen &&
            <motion.input
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-secondary/50 text-foreground text-sm px-4 py-2 rounded-full outline-none border border-border/50 focus:border-primary/50"
              placeholder="Search..."
              autoFocus />

            }
          </AnimatePresence>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">

            <Search size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
            <Bell size={18} />
          </button>
          <button className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <User size={14} className="text-primary-foreground" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground md:hidden">

            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden overflow-hidden glass border-t border-border/30">

            <div className="px-6 py-4 flex flex-col gap-4">
              {navItems.map((item) =>
            <button
              key={item}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">

                  {item}
                </button>
            )}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </nav>);

};

export default Navbar;