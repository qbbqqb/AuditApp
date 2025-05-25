import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailData {
  recipient_email: string;
  recipient_name: string;
  finding_title?: string;
  finding_id?: string;
  due_date?: string;
  severity?: string;
  project_name?: string;
  escalation_level?: number;
}

interface EmailRequest {
  type: string;
  email_data: EmailData;
  title: string;
  message: string;
}

// Email templates for different notification types
const getEmailTemplate = (type: string, data: EmailData, title: string, message: string) => {
  const baseUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
  const findingUrl = data.finding_id ? `${baseUrl}/findings/${data.finding_id}` : baseUrl;

  const commonStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9fafb; }
      .finding-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .severity-high { border-left: 4px solid #dc2626; }
      .severity-medium { border-left: 4px solid #f59e0b; }
      .severity-low { border-left: 4px solid #10b981; }
      .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      .escalation { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
  `;

  switch (type) {
    case 'new_finding':
      return `
        ${commonStyles}
        <div class="container">
          <div class="header">
            <h1>🔍 New Finding Assigned</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipient_name},</p>
            <p>You have been assigned a new safety finding that requires your attention.</p>
            
            <div class="finding-details severity-${data.severity?.toLowerCase()}">
              <h3>${data.finding_title}</h3>
              <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Due Date:</strong> ${data.due_date ? new Date(data.due_date).toLocaleDateString() : 'Not set'}</p>
            </div>
            
            <p>Please review this finding and take appropriate action as soon as possible.</p>
            
            <a href="${findingUrl}" class="button">View Finding Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;

    case 'status_update':
      return `
        ${commonStyles}
        <div class="container">
          <div class="header">
            <h1>📋 Finding Status Updated</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipient_name},</p>
            <p>A finding you're involved with has been updated.</p>
            
            <div class="finding-details severity-${data.severity?.toLowerCase()}">
              <h3>${data.finding_title}</h3>
              <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Update:</strong> ${message}</p>
            </div>
            
            <a href="${findingUrl}" class="button">View Finding Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;

    case 'deadline_reminder':
      return `
        ${commonStyles}
        <div class="container">
          <div class="header">
            <h1>⏰ Finding Deadline Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipient_name},</p>
            <p>This is a reminder that a finding is approaching its due date.</p>
            
            <div class="finding-details severity-${data.severity?.toLowerCase()}">
              <h3>${data.finding_title}</h3>
              <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Due Date:</strong> ${data.due_date ? new Date(data.due_date).toLocaleDateString() : 'Not set'}</p>
            </div>
            
            <p>Please ensure this finding is addressed before the deadline.</p>
            
            <a href="${findingUrl}" class="button">View Finding Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;

    case 'overdue_alert':
      return `
        ${commonStyles}
        <div class="container">
          <div class="header" style="background: #dc2626;">
            <h1>🚨 OVERDUE FINDING ALERT</h1>
          </div>
          <div class="content">
            <div class="escalation">
              <h2>⚠️ URGENT: Finding is Overdue</h2>
              <p>This finding has exceeded its due date and requires immediate attention.</p>
            </div>
            
            <p>Hello ${data.recipient_name},</p>
            
            <div class="finding-details severity-${data.severity?.toLowerCase()}">
              <h3>${data.finding_title}</h3>
              <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Due Date:</strong> ${data.due_date ? new Date(data.due_date).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Status:</strong> OVERDUE</p>
            </div>
            
            <p>This finding is now overdue and requires immediate action to ensure compliance and safety.</p>
            
            <a href="${findingUrl}" class="button" style="background: #dc2626;">Take Action Now</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;

    case 'escalation':
      return `
        ${commonStyles}
        <div class="container">
          <div class="header" style="background: #dc2626;">
            <h1>🚨 ESCALATION ALERT</h1>
          </div>
          <div class="content">
            <div class="escalation">
              <h2>⚠️ ESCALATION: ${data.escalation_level} Day${data.escalation_level && data.escalation_level > 1 ? 's' : ''} Overdue</h2>
              <p>This finding has been escalated due to extended overdue status.</p>
            </div>
            
            <p>Hello ${data.recipient_name},</p>
            <p>A critical finding has been escalated to your attention due to extended overdue status.</p>
            
            <div class="finding-details severity-${data.severity?.toLowerCase()}">
              <h3>${data.finding_title}</h3>
              <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Due Date:</strong> ${data.due_date ? new Date(data.due_date).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Escalation Level:</strong> ${data.escalation_level} day${data.escalation_level && data.escalation_level > 1 ? 's' : ''} overdue</p>
            </div>
            
            <p>As a supervisor, your immediate intervention is required to address this overdue finding and ensure compliance.</p>
            
            <a href="${findingUrl}" class="button" style="background: #dc2626;">Review & Take Action</a>
          </div>
          <div class="footer">
            <p>This is an automated escalation from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;

    default:
      return `
        ${commonStyles}
        <div class="container">
          <div class="header">
            <h1>📧 ${title}</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipient_name},</p>
            <p>${message}</p>
            
            ${data.finding_title ? `
              <div class="finding-details">
                <h3>${data.finding_title}</h3>
                <p><strong>Project:</strong> ${data.project_name || 'N/A'}</p>
              </div>
            ` : ''}
            
            <a href="${findingUrl}" class="button">View Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Health & Safety Audit System.</p>
          </div>
        </div>
      `;
  }
};

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

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { type, email_data, title, message }: EmailRequest = await req.json();

    if (!email_data?.recipient_email || !email_data?.recipient_name) {
      return new Response('Missing required email data', { status: 400 });
    }

    // Get email configuration from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@auditapp.com';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response('Email service not configured', { status: 500 });
    }

    // Generate email content
    const htmlContent = getEmailTemplate(type, email_data, title, message);
    
    // Determine subject line based on type
    let subject = title;
    if (type === 'escalation') {
      subject = `🚨 ESCALATION: ${email_data.finding_title || 'Finding'} - ${email_data.escalation_level} Day${email_data.escalation_level && email_data.escalation_level > 1 ? 's' : ''} Overdue`;
    } else if (type === 'overdue_alert') {
      subject = `🚨 OVERDUE: ${email_data.finding_title || 'Finding'} - Immediate Action Required`;
    } else if (type === 'new_finding') {
      subject = `🔍 New Finding Assigned: ${email_data.finding_title || 'Safety Finding'}`;
    } else if (type === 'deadline_reminder') {
      subject = `⏰ Reminder: ${email_data.finding_title || 'Finding'} Due Soon`;
    }

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email_data.recipient_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send email:', errorText);
      return new Response(`Failed to send email: ${errorText}`, { status: 500 });
    }

    const result = await emailResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(JSON.stringify({ success: true, email_id: result.id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in send-notification-email function:', error);
    return new Response(`Internal server error: ${error.message}`, { status: 500 });
  }
}); 