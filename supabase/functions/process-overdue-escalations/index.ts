import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface EscalationRule {
  hours_overdue: number;
  escalate_to_role: string;
  notification_type: 'deadline_reminder' | 'overdue_alert' | 'escalation';
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting overdue escalation processing...');

    // Define escalation rules
    const escalationRules: EscalationRule[] = [
      { hours_overdue: 24, escalate_to_role: 'gc_project_manager', notification_type: 'deadline_reminder' },
      { hours_overdue: 48, escalate_to_role: 'gc_site_director', notification_type: 'overdue_alert' },
      { hours_overdue: 72, escalate_to_role: 'client_project_manager', notification_type: 'escalation' }
    ];

    // Get overdue findings
    const { data: overdueFindings, error: findingsError } = await supabase
      .from('findings')
      .select('id, title, severity, due_date, project_id')
      .not('status', 'eq', 'closed')
      .lt('due_date', new Date().toISOString());

    if (findingsError) {
      console.error('Error fetching overdue findings:', findingsError);
      return new Response(`Error fetching findings: ${findingsError.message}`, { status: 500 });
    }

    if (!overdueFindings || overdueFindings.length === 0) {
      console.log('No overdue findings found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No overdue findings found',
        processed: 0 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${overdueFindings.length} overdue findings`);

    let processedCount = 0;
    let escalationsSent = 0;

    for (const finding of overdueFindings) {
      try {
        const hoursOverdue = Math.floor(
          (new Date().getTime() - new Date(finding.due_date).getTime()) / (1000 * 60 * 60)
        );

        console.log(`Processing finding ${finding.id}: ${hoursOverdue} hours overdue`);

        // Find applicable escalation rule
        const applicableRule = escalationRules
          .filter(rule => hoursOverdue >= rule.hours_overdue)
          .sort((a, b) => b.hours_overdue - a.hours_overdue)[0];

        if (applicableRule) {
          const escalated = await escalateFinding(supabase, finding, applicableRule, hoursOverdue);
          if (escalated) {
            escalationsSent++;
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing finding ${finding.id}:`, error);
      }
    }

    console.log(`Escalation processing complete. Processed: ${processedCount}, Escalations sent: ${escalationsSent}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      escalations_sent: escalationsSent,
      total_overdue: overdueFindings.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-overdue-escalations function:', error);
    return new Response(`Internal server error: ${error.message}`, { status: 500 });
  }
});

/**
 * Escalate a finding to the appropriate role
 */
async function escalateFinding(supabase: any, finding: any, rule: EscalationRule, hoursOverdue: number): Promise<boolean> {
  try {
    // Check if we've already sent this escalation level for this finding in the last 24 hours
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('finding_id', finding.id)
      .eq('type', rule.notification_type)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingNotification) {
      console.log(`Escalation already sent for finding ${finding.id} in the last 24 hours`);
      return false;
    }

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', finding.project_id)
      .single();

    // Get users with the escalation role in the same project
    const { data: projectAssignments, error: assignmentError } = await supabase
      .from('project_assignments')
      .select('user_id')
      .eq('project_id', finding.project_id);

    if (assignmentError || !projectAssignments) {
      console.error('Error fetching project assignments:', assignmentError);
      return false;
    }

    const userIds = projectAssignments.map((pa: any) => pa.user_id);

    if (userIds.length === 0) {
      console.log(`No users assigned to project ${finding.project_id}`);
      return false;
    }

    const { data: escalationUsers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .in('id', userIds)
      .eq('role', rule.escalate_to_role);

    if (!escalationUsers || escalationUsers.length === 0) {
      console.log(`No users with role ${rule.escalate_to_role} found for project ${finding.project_id}`);
      return false;
    }

    // Send escalation notifications
    let notificationsSent = 0;
    for (const user of escalationUsers) {
      const escalationLevel = Math.ceil(rule.hours_overdue / 24); // Convert to days
      
      try {
        // Create notification record
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            finding_id: finding.id,
            type: rule.notification_type,
            title: `Overdue Finding Escalation - ${escalationLevel} Day${escalationLevel > 1 ? 's' : ''}`,
            message: `ESCALATION: Finding "${finding.title}" is ${hoursOverdue} hours overdue and requires immediate attention.`,
            is_read: false,
            email_sent: false
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          continue;
        }

        // Send email notification
        const emailData = {
          recipient_email: user.email,
          recipient_name: `${user.first_name} ${user.last_name}`,
          finding_title: finding.title,
          finding_id: finding.id,
          due_date: finding.due_date,
          severity: finding.severity,
          project_name: project?.name,
          escalation_level: escalationLevel
        };

        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: {
            type: rule.notification_type,
            email_data: emailData,
            title: `Overdue Finding Escalation - ${escalationLevel} Day${escalationLevel > 1 ? 's' : ''}`,
            message: `ESCALATION: Finding "${finding.title}" is ${hoursOverdue} hours overdue and requires immediate attention.`
          }
        });

        if (emailError) {
          console.error('Error sending escalation email:', emailError);
        } else {
          console.log(`Escalation email sent to ${user.email} for finding ${finding.id}`);
          notificationsSent++;
        }

      } catch (error) {
        console.error(`Error sending notification to user ${user.id}:`, error);
      }
    }

    console.log(`Sent ${notificationsSent} escalation notifications for finding ${finding.id}`);
    return notificationsSent > 0;

  } catch (error) {
    console.error('Error escalating finding:', error);
    return false;
  }
} 