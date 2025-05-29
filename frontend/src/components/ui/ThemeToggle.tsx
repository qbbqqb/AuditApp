import React from 'react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export function ThemeToggle({ 
  className = '', 
  showLabel = false, 
  variant = 'button' 
}: ThemeToggleProps) {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();

  const getThemeIcon = (themeName: Theme) => {
    const iconClass = "w-4 h-4";
    switch (themeName) {
      case 'light':
        return <SunIcon className={iconClass} />;
      case 'dark':
        return <MoonIcon className={iconClass} />;
      case 'system':
        return <ComputerDesktopIcon className={iconClass} />;
    }
  };

  const getThemeLabel = (themeName: Theme) => {
    switch (themeName) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <div className="dropdown">
          <button
            className="btn btn-ghost flex items-center gap-2"
            title="Change theme"
          >
            {getThemeIcon(theme)}
            {showLabel && <span>{getThemeLabel(theme)}</span>}
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          
          <div className="dropdown-content absolute right-0 mt-2 w-48 bg-surface border border-default rounded-lg shadow-lg z-50">
            <div className="py-1">
              {(['light', 'dark', 'system'] as Theme[]).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={`
                    w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-secondary transition-colors
                    ${theme === themeName ? 'bg-secondary text-primary' : 'text-primary'}
                  `}
                >
                  {getThemeIcon(themeName)}
                  <span className="text-sm">{getThemeLabel(themeName)}</span>
                  {themeName === 'system' && (
                    <span className="ml-auto text-xs text-tertiary">
                      ({effectiveTheme})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        btn btn-ghost flex items-center gap-2 transition-all duration-200
        hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {getThemeIcon(theme)}
      {showLabel && <span>{getThemeLabel(theme)}</span>}
    </button>
  );
}

export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-8 h-8 rounded-full flex items-center justify-center
        transition-all duration-300 ease-in-out
        bg-surface hover:bg-surface-hover
        border border-default shadow-sm
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-4 h-4">
        {/* Sun icon */}
        <SunIcon 
          className={`
            absolute inset-0 w-4 h-4 transition-all duration-300
            ${effectiveTheme === 'light' 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-90 scale-0 opacity-0'
            }
          `}
        />
        {/* Moon icon */}
        <MoonIcon 
          className={`
            absolute inset-0 w-4 h-4 transition-all duration-300
            ${effectiveTheme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0'
            }
          `}
        />
      </div>
    </button>
  );
}

export function AnimatedThemeToggle({ className = '' }: { className?: string }) {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${effectiveTheme === 'dark' 
          ? 'bg-primary' 
          : 'bg-border'
        }
        ${className}
      `}
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div
        className={`
          absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ease-in-out
          flex items-center justify-center shadow-sm
          ${effectiveTheme === 'dark' 
            ? 'left-6 bg-background' 
            : 'left-0.5 bg-surface'
          }
        `}
      >
        {effectiveTheme === 'light' ? (
          <SunIcon className="w-3 h-3 text-warning" />
        ) : (
          <MoonIcon className="w-3 h-3 text-primary" />
        )}
      </div>
    </button>
  );
} 