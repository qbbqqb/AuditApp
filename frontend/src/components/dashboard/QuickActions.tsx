import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

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
  onRefresh?: () => void;
  loading?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  overdueCount = 0,
  pendingApprovalCount = 0,
  onCreateFinding,
  onBulkUpdate,
  onRefresh,
  loading
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
    <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-primary">Quick Actions</h3>
        <Button
          onClick={onRefresh}
          variant="secondary"
          size="sm"
          disabled={loading}
          className="transition-transform hover:scale-105"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            variant="secondary"
            className="h-auto p-4 flex flex-col items-center text-center hover:bg-surface-hover transition-all duration-200 group"
          >
            <div className={`w-8 h-8 mb-2 text-${action.color}-600 group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <span className="text-sm font-medium text-primary mb-1">{action.title}</span>
            <span className="text-xs text-secondary">{action.description}</span>
          </Button>
        ))}
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