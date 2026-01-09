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

    const userEmail = user.email || "noreply@agentdesk360.com";

    const { data: emailData, error: emailError } = await supabase
      .from("emails")
      .insert({
        subject,
        body,
        sender_email: userEmail,
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
      throw new Error("RESEND_API_KEY is not configured in Supabase Edge Function secrets. Please add it in your Supabase Dashboard under Settings > Edge Functions > Manage secrets.");
    }

    const senderEmail = Deno.env.get("SENDER_EMAIL") || "onboarding@resend.dev";
    console.log(`Using sender email: ${senderEmail}`);

    const resend = new Resend(resendApiKey);

    const emailResults = [];
    for (const recipient of recipients) {
      try {
        const result = await resend.emails.send({
          from: senderEmail,
          to: recipient.email,
          subject: subject,
          html: body,
        });
        console.log(`Email sent successfully to ${recipient.email}. Resend ID: ${result.data?.id}`);
        emailResults.push({ email: recipient.email, success: true, id: result.data?.id });
      } catch (emailError: any) {
        const errorMessage = emailError?.message || String(emailError);
        console.error(`Failed to send email to ${recipient.email}:`, {
          error: errorMessage,
          details: emailError,
        });
        emailResults.push({ email: recipient.email, success: false, error: errorMessage });

        await supabase
          .from("email_recipients")
          .update({ status: "failed" })
          .eq("email_id", emailData.id)
          .eq("recipient_email", recipient.email);
      }
    }

    console.log(`Email sent to ${recipients.length} recipient(s)`, emailResults);

    const failedEmails = emailResults.filter(r => !r.success);
    const successfulEmails = emailResults.filter(r => r.success);

    if (failedEmails.length === recipients.length) {
      const firstError = failedEmails[0]?.error || "Unknown error";
      throw new Error(`All emails failed to send. Error: ${firstError}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailData.id,
        recipientCount: recipients.length,
        successCount: successfulEmails.length,
        failureCount: failedEmails.length,
        message: failedEmails.length > 0
          ? `Email sent to ${successfulEmails.length} of ${recipients.length} recipients. ${failedEmails.length} failed.`
          : `Email sent successfully to ${recipients.length} recipient(s)`,
        results: emailResults,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    console.error("Error type:", typeof error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    let errorMessage = "Failed to send email";

    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.error) {
      errorMessage = error.error;
    } else if (error) {
      errorMessage = String(error);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error?.stack || error?.toString?.() || "No additional details available",
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