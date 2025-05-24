import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface TestUser {
  email: string;
  password: string;
  role: string;
  name: string;
  company: string;
}

const testUsers: TestUser[] = [
  {
    email: 'admin@example.com',
    password: 'SecurePass123',
    role: 'client_safety_manager',
    name: 'Admin User',
    company: 'Test Company'
  },
  {
    email: 'safety.manager@example.com',
    password: 'SecurePass123',
    role: 'client_safety_manager', 
    name: 'Sarah Johnson',
    company: 'ABC Construction Client'
  },
  {
    email: 'project.manager@example.com',
    password: 'SecurePass123',
    role: 'client_project_manager',
    name: 'Michael Chen', 
    company: 'ABC Construction Client'
  },
  {
    email: 'ehs.officer@example.com',
    password: 'SecurePass123',
    role: 'gc_ehs_officer',
    name: 'Lisa Rodriguez',
    company: 'XYZ Contracting'
  },
  {
    email: 'gc.project.manager@example.com',
    password: 'SecurePass123',
    role: 'gc_project_manager',
    name: 'David Thompson',
    company: 'XYZ Contracting'
  },
  {
    email: 'site.director@example.com',
    password: 'SecurePass123',
    role: 'gc_site_director',
    name: 'Jennifer Williams',
    company: 'XYZ Contracting'
  }
];

const roleDescriptions: Record<string, string> = {
  'client_safety_manager': 'Full admin access - can view/edit everything',
  'client_project_manager': 'Project management - can manage projects and findings',
  'gc_ehs_officer': 'EHS Officer - safety-focused access and reporting',
  'gc_project_manager': 'Contractor PM - limited to assigned projects',
  'gc_site_director': 'Site Director - site-level oversight and control'
};

const RoleSwitcher: React.FC = () => {
  const { signIn, user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleSwitch = async (testUser: TestUser) => {
    setIsLoading(true);
    try {
      await signOut();
      await signIn(testUser.email, testUser.password);
      setIsOpen(false);
    } catch (error) {
      console.error('Role switch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {/* Current Role Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm min-w-0"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            user.role === 'client_safety_manager' ? 'bg-red-500' :
            user.role === 'client_project_manager' ? 'bg-blue-500' :
            user.role === 'gc_ehs_officer' ? 'bg-green-500' :
            user.role === 'gc_project_manager' ? 'bg-yellow-500' :
            user.role === 'gc_site_director' ? 'bg-purple-500' : 'bg-gray-500'
          }`} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">{user.role.replace(/_/g, ' ').toUpperCase()}</span>
            <span className="text-xs text-gray-500">({user.first_name})</span>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Switch User Role</h3>
            <p className="text-xs text-gray-500">Test different permission levels</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {testUsers.map((testUser) => (
              <button
                key={testUser.email}
                onClick={() => handleRoleSwitch(testUser)}
                disabled={isLoading || user.email === testUser.email}
                className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                  user.email === testUser.email ? 'bg-blue-50 cursor-not-allowed' : ''
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    testUser.role === 'client_safety_manager' ? 'bg-red-500' :
                    testUser.role === 'client_project_manager' ? 'bg-blue-500' :
                    testUser.role === 'gc_ehs_officer' ? 'bg-green-500' :
                    testUser.role === 'gc_project_manager' ? 'bg-yellow-500' :
                    testUser.role === 'gc_site_director' ? 'bg-purple-500' : 'bg-gray-500'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{testUser.name}</span>
                      {user.email === testUser.email && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Current</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mt-1">
                      {testUser.role.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {roleDescriptions[testUser.role]}
                    </p>
                    
                    <p className="text-xs text-gray-400 mt-1">
                      {testUser.company} • {testUser.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Switching user role...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher; 