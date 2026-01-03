
import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="
        relative flex items-center justify-center p-spacing_0_0px_ rounded-radius_full border border-colors_border_border_secondary shadow-sm transition-all duration-300
        hover:opacity-80 focus:outline-none active:scale-95 bg-colors_background_bg_secondary text-colors_text_text_primary_900_ w-spacing_5xl h-spacing_5xl min-w-[40px]
      "
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-spacing_xl h-spacing_xl">
        <Sun 
          size={16} 
          className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} 
        />
        <Moon 
          size={16} 
          className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} 
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
