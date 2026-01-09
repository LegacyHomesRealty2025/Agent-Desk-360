import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { Resend } from "npm:resend@3.2.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { subject, body, recipients, templateId }: SendEmailRequest = await req.json();

    if (!subject || !body || !recipients || recipients.length === 0) {
      throw new Error("Missing required fields: subject, body, and recipients");
    }

    const senderEmail = user.email || "noreply@agentdesk360.com";

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const emailResults = [];
    for (const recipient of recipients) {
      try {
        const result = await resend.emails.send({
          from: "Raj@LegacyHomesRE.com",
          to: recipient.email,
          subject: subject,
          html: body,
        });
        emailResults.push({ email: recipient.email, success: true, id: result.data?.id });
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
        emailResults.push({ email: recipient.email, success: false, error: emailError.message });

        await supabase
          .from("email_recipients")
          .update({ status: "failed" })
          .eq("email_id", emailData.id)
          .eq("recipient_email", recipient.email);
      }
    }

    console.log(`Email sent to ${recipients.length} recipient(s)`, emailResults);

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
