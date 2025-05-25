import { supabase } from '../config/supabase';

export interface NotificationData {
  user_id: string;
  finding_id?: string;
  type: 'new_finding' | 'status_update' | 'deadline_reminder' | 'overdue_alert' | 'escalation' | 'comment_added' | 'evidence_submitted';
  title: string;
  message: string;
  email_data?: {
    recipient_email: string;
    recipient_name: string;
    finding_title?: string;
    finding_id?: string;
    due_date?: string;
    severity?: string;
    project_name?: string;
    escalation_level?: number;
  };
}

export interface EscalationRule {
  hours_overdue: number;
  escalate_to_role: string;
  notification_type: 'deadline_reminder' | 'overdue_alert' | 'escalation';
}

export class NotificationService {
  
  /**
   * Create a notification and optionally send email
   */
  static async createNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Insert notification into database
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          finding_id: notificationData.finding_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          is_read: false,
          email_sent: false
        });

      if (notificationError) {
        throw new Error(`Failed to create notification: ${notificationError.message}`);
      }

      // Send email if email data is provided
      if (notificationData.email_data) {
        await this.sendEmail(notificationData);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification using Supabase Edge Function
   */
  static async sendEmail(notificationData: NotificationData): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: notificationData.type,
          email_data: notificationData.email_data,
          title: notificationData.title,
          message: notificationData.message
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        // Don't throw error for email failures - notification is still created
      }
    } catch (error) {
      console.error('Error invoking email function:', error);
    }
  }

  /**
   * Notify when a finding is assigned
   */
  static async notifyFindingAssignment(findingId: string, assignedToUserId: string, assignedByUserId: string): Promise<void> {
    try {
      // Get finding details
      const { data: finding, error: findingError } = await supabase
        .from('findings')
        .select('id, title, severity, due_date, project_id')
        .eq('id', findingId)
        .single();

      if (findingError || !finding) {
        throw new Error('Finding not found');
      }

      // Get assigned user details
      const { data: assignedUser, error: userError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', assignedToUserId)
        .single();

      if (userError || !assignedUser) {
        throw new Error('Assigned user not found');
      }

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', finding.project_id)
        .single();

      await this.createNotification({
        user_id: assignedToUserId,
        finding_id: findingId,
        type: 'new_finding',
        title: 'New Finding Assigned',
        message: `You have been assigned a new ${finding.severity} severity finding: "${finding.title}"`,
        email_data: {
          recipient_email: assignedUser.email,
          recipient_name: `${assignedUser.first_name} ${assignedUser.last_name}`,
          finding_title: finding.title,
          finding_id: findingId,
          due_date: finding.due_date,
          severity: finding.severity,
          project_name: project?.name
        }
      });
    } catch (error) {
      console.error('Error notifying finding assignment:', error);
    }
  }

  /**
   * Notify when finding status changes
   */
  static async notifyStatusChange(findingId: string, newStatus: string, updatedByUserId: string): Promise<void> {
    try {
      // Get finding details
      const { data: finding, error: findingError } = await supabase
        .from('findings')
        .select('id, title, severity, status, created_by, assigned_to, project_id')
        .eq('id', findingId)
        .single();

      if (findingError || !finding) return;

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', finding.project_id)
        .single();

      // Get stakeholder user details
      const stakeholderIds = [finding.created_by, finding.assigned_to]
        .filter(id => id && id !== updatedByUserId);

      if (stakeholderIds.length === 0) return;

      const { data: stakeholders } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', stakeholderIds);

      if (!stakeholders) return;

      // Send notifications to stakeholders
      for (const stakeholder of stakeholders) {
        await this.createNotification({
          user_id: stakeholder.id,
          finding_id: findingId,
          type: 'status_update',
          title: 'Finding Status Updated',
          message: `Finding "${finding.title}" status changed to ${newStatus.replace('_', ' ')}`,
          email_data: {
            recipient_email: stakeholder.email,
            recipient_name: `${stakeholder.first_name} ${stakeholder.last_name}`,
            finding_title: finding.title,
            finding_id: findingId,
            severity: finding.severity,
            project_name: project?.name
          }
        });
      }
    } catch (error) {
      console.error('Error notifying status change:', error);
    }
  }

  /**
   * Check for overdue findings and send escalation notifications
   */
  static async processOverdueEscalations(): Promise<void> {
    try {
      // Define escalation rules
      const escalationRules: EscalationRule[] = [
        { hours_overdue: 24, escalate_to_role: 'gc_project_manager', notification_type: 'deadline_reminder' },
        { hours_overdue: 48, escalate_to_role: 'gc_site_director', notification_type: 'overdue_alert' },
        { hours_overdue: 72, escalate_to_role: 'client_project_manager', notification_type: 'escalation' }
      ];

      // Get overdue findings
      const { data: overdueFindings, error } = await supabase
        .from('findings')
        .select('id, title, severity, due_date, project_id')
        .not('status', 'eq', 'closed')
        .lt('due_date', new Date().toISOString());

      if (error || !overdueFindings) return;

      for (const finding of overdueFindings) {
        const hoursOverdue = Math.floor(
          (new Date().getTime() - new Date(finding.due_date).getTime()) / (1000 * 60 * 60)
        );

        // Find applicable escalation rule
        const applicableRule = escalationRules
          .filter(rule => hoursOverdue >= rule.hours_overdue)
          .sort((a, b) => b.hours_overdue - a.hours_overdue)[0];

        if (applicableRule) {
          await this.escalateFinding(finding, applicableRule, hoursOverdue);
        }
      }
    } catch (error) {
      console.error('Error processing overdue escalations:', error);
    }
  }

  /**
   * Escalate a finding to the appropriate role
   */
  private static async escalateFinding(finding: any, rule: EscalationRule, hoursOverdue: number): Promise<void> {
    try {
      // Check if we've already sent this escalation level for this finding
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('finding_id', finding.id)
        .eq('type', rule.notification_type)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
        .single();

      if (existingNotification) return; // Already escalated recently

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', finding.project_id)
        .single();

      // Get users with the escalation role in the same project
      const { data: projectAssignments, error } = await supabase
        .from('project_assignments')
        .select('user_id')
        .eq('project_id', finding.project_id);

      if (error || !projectAssignments) return;

      const userIds = projectAssignments.map(pa => pa.user_id);

      const { data: escalationUsers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds)
        .eq('role', rule.escalate_to_role);

      if (!escalationUsers) return;

      // Send escalation notifications
      for (const user of escalationUsers) {
        const escalationLevel = Math.ceil(rule.hours_overdue / 24); // Convert to days
        
        await this.createNotification({
          user_id: user.id,
          finding_id: finding.id,
          type: rule.notification_type,
          title: `Overdue Finding Escalation - ${escalationLevel} Day${escalationLevel > 1 ? 's' : ''}`,
          message: `ESCALATION: Finding "${finding.title}" is ${hoursOverdue} hours overdue and requires immediate attention.`,
          email_data: {
            recipient_email: user.email,
            recipient_name: `${user.first_name} ${user.last_name}`,
            finding_title: finding.title,
            finding_id: finding.id,
            due_date: finding.due_date,
            severity: finding.severity,
            project_name: project?.name,
            escalation_level: escalationLevel
          }
        });
      }
    } catch (error) {
      console.error('Error escalating finding:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }
} 