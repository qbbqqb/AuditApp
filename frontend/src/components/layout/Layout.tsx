import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SimpleThemeToggle } from '../ui/ThemeToggle';
import RoleSwitcher from '../admin/RoleSwitcher';

const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Findings', href: '/findings', icon: '📋' },
    { name: 'Reports', href: '/reports', icon: '📈' },
  ];

  // Add role-specific navigation
  if (user?.role === 'admin') {
    navigationItems.push({ name: 'Admin Panel', href: '/admin', icon: '⚙️' });
  }
  
  if (user?.role === 'client_safety_manager') {
    navigationItems.push({ name: 'Create Finding', href: '/findings/new', icon: '➕' });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left section - Logo and Nav */}
            <div className="flex items-center gap-8">
              {/* Logo/Brand */}
              <div className="flex-shrink-0">
                <h1
                  className="text-2xl font-extrabold tracking-tight"
                  style={{
                    color: 'var(--color-primary)',
                    letterSpacing: 'var(--letter-spacing-tight)'
                  }}
                >
                  Safety Audit
                </h1>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'nav-link-active'
                        : 'nav-link'
                    }`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      transition: 'all var(--transition-base)',
                      color: isActive(item.href) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      backgroundColor: isActive(item.href) ? 'var(--color-primary-light)' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right section - Actions */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <div className="flex items-center">
                <SimpleThemeToggle />
              </div>

              {/* Role Switcher */}
              <div className="hidden lg:flex items-center">
                <RoleSwitcher />
              </div>

              {/* User section */}
              <div
                className="flex items-center gap-4 pl-4"
                style={{ borderLeft: '1px solid var(--color-border)' }}
              >
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--color-background-secondary)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)'
                    }}
                  >
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <span
                    className="text-sm font-semibold hidden xl:block"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {user?.first_name} {user?.last_name}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  style={{
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-danger)';
                    e.currentTarget.style.backgroundColor = 'var(--color-danger-light)';
                    e.currentTarget.style.borderColor = 'var(--color-danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-8 px-6 sm:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 