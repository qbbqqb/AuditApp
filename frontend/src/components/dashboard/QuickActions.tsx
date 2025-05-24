import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  badge?: string | number;
  disabled?: boolean;
}

interface QuickActionsProps {
  overdueCount?: number;
  pendingApprovalCount?: number;
  onCreateFinding?: () => void;
  onBulkUpdate?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  overdueCount = 0,
  pendingApprovalCount = 0,
  onCreateFinding,
  onBulkUpdate
}) => {
  const { user } = useAuth();

  const getQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    if (user?.role === 'client_safety_manager') {
      actions.push(
        {
          id: 'create-finding',
          title: 'Create Finding',
          description: 'Report a new safety issue',
          icon: '➕',
          href: '/findings/new',
          color: 'blue'
        },
        {
          id: 'pending-approvals',
          title: 'Review & Approve',
          description: 'Evidence waiting for approval',
          icon: '👔',
          href: '/findings?status=completed_pending_approval',
          color: 'yellow',
          badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined
        },
        {
          id: 'bulk-update',
          title: 'Bulk Actions',
          description: 'Update multiple findings',
          icon: '📋',
          onClick: onBulkUpdate,
          color: 'purple'
        }
      );
    }

    if (user?.role === 'gc_ehs_officer') {
      actions.push(
        {
          id: 'my-assignments',
          title: 'My Assignments',
          description: 'Findings assigned to me',
          icon: '🎯',
          href: `/findings?assignedTo=${user.id}`,
          color: 'green'
        },
        {
          id: 'submit-evidence',
          title: 'Submit Evidence',
          description: 'Upload completion photos/docs',
          icon: '📸',
          href: '/findings?status=in_progress',
          color: 'blue'
        }
      );
    }

    // Common actions for all roles
    actions.push(
      {
        id: 'overdue-items',
        title: 'Overdue Items',
        description: 'Items past due date',
        icon: '⚠️',
        href: '/findings?status=overdue',
        color: 'red',
        badge: overdueCount > 0 ? overdueCount : undefined,
        disabled: overdueCount === 0
      },
      {
        id: 'recent-activity',
        title: 'Recent Activity',
        description: 'Latest updates and changes',
        icon: '🔔',
        href: '/notifications',
        color: 'blue'
      }
    );

    return actions;
  };

  const getColorClasses = (color: QuickAction['color']) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
      green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700',
      yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-700',
      red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
    };
    return colors[color];
  };

  const actions = getQuickActions();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <span className="text-sm text-gray-500">
          Based on your role: {user?.role?.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const baseClassName = `
            relative p-4 border-2 rounded-lg transition-all duration-200 
            ${getColorClasses(action.color)}
            ${action.disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-md cursor-pointer'
            }
          `;

          const content = (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{action.icon}</span>
                    <h4 className="font-medium">{action.title}</h4>
                  </div>
                  <p className="text-sm opacity-75">{action.description}</p>
                </div>
                
                {action.badge && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {action.badge}
                  </span>
                )}
              </div>

              {/* Hover effect arrow */}
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </>
          );

          if (action.href) {
            return (
              <Link
                key={action.id}
                to={action.href}
                className={`${baseClassName} block`}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${baseClassName} w-full text-left`}
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> Actions are personalized based on your role and current work. 
          Badge numbers update in real-time.
        </p>
      </div>
    </div>
  );
};

export default QuickActions; 