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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-surface shadow-sm border-b border-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">
                  Safety Audit System
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'border-primary text-primary'
                        : 'border-transparent text-secondary hover:text-primary hover:border-border'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-6">
                  {/* Theme Toggle */}
                  <SimpleThemeToggle />
                  
                  {/* Role Switcher for testing different permissions */}
                  <RoleSwitcher />
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-primary">
                      {user?.first_name} {user?.last_name}
                    </span>
                    
                    <div className="h-4 border-l border-border"></div>
                    
                    <button
                      onClick={handleSignOut}
                      className="text-sm text-secondary hover:text-primary transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 