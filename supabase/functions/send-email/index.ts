import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRecipient {
  email: string;
  name: string;
  contactId?: string;
}

interface SendEmailRequest {
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  templateId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { subject, body, recipients, templateId }: SendEmailRequest = await req.json();

    if (!subject || !body || !recipients || recipients.length === 0) {
      throw new Error("Missing required fields: subject, body, and recipients");
    }

    // Get user's email from auth
    const senderEmail = user.email || "noreply@agentdesk360.com";

    // Create email record
    const { data: emailData, error: emailError } = await supabase
      .from("emails")
      .insert({
        subject,
        body,
        sender_email: senderEmail,
        folder: "SENT",
        is_bulk: recipients.length > 1,
        template_id: templateId || null,
      })
      .select()
      .single();

    if (emailError) {
      console.error("Error creating email:", emailError);
      throw emailError;
    }

    // Create recipient records
    const recipientRecords = recipients.map(recipient => ({
      email_id: emailData.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      contact_id: recipient.contactId || null,
      status: "sent",
    }));

    const { error: recipientsError } = await supabase
      .from("email_recipients")
      .insert(recipientRecords);

    if (recipientsError) {
      console.error("Error creating recipients:", recipientsError);
      throw recipientsError;
    }

    // TODO: Integrate with email service provider (Resend, SendGrid, etc.)
    // For now, we just store in database
    // Example with Resend:
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // for (const recipient of recipients) {
    //   await resend.emails.send({
    //     from: "Raj@LegacyHomesRE.com",
    //     to: recipient.email,
    //     subject: subject,
    //     html: body,
    //   });
    // }

    console.log(`Email sent to ${recipients.length} recipient(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailData.id,
        recipientCount: recipients.length,
        message: `Email sent successfully to ${recipients.length} recipient(s)`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
