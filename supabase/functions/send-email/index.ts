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
  type?: 'to' | 'cc';
}

interface SendEmailRequest {
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
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
      console.error("Auth error:", authError);
      throw new Error("Unauthorized - invalid or expired token");
    }

    console.log("Authenticated user:", user.email);

    const { subject, body, recipients, ccRecipients, templateId }: SendEmailRequest = await req.json();

    if (!subject || !body || !recipients || recipients.length === 0) {
      throw new Error("Missing required fields: subject, body, and recipients");
    }

    const allRecipients = [
      ...recipients.map(r => ({ ...r, type: 'to' as const })),
      ...(ccRecipients || []).map(r => ({ ...r, type: 'cc' as const }))
    ];

    const senderEmail = "Josephine Sharma <josephine@legacyhomesre.com>";

    const emailSignature = `
<br><br>
<p>Thank you,</p>
<p><strong>Josephine Sharma</strong><br>
BROKER/REALTOR®<br>
GRI, e-PRO, SFR, PSA<br>
Legacy Homes Realty<br>
DRE# 01507253<br>
Direct: (951) 314-4204<br>
E-mail: JSharmaREO@yahoo.com</p>

<p><strong>BEWARE OF CYBER-FRAUD</strong> Before wiring any funds, call the intended recipient at a number you know is valid to confirm the instructions - and be very wary of any request to change wire instructions you already received. A Legacy Homes Realty personnel will neither provide nor confirm wire instructions.</p>

<p><strong>DISCLAIMER:</strong> The information contained in this email may be CONFIDENTIAL and PRIVILEGED. It is intended for the individual or entity named above. If you are not the intended recipient, please be notified that any use, review, distribution, or copying of this email is strictly prohibited. If you have received this email by error, please delete it and notify the sender immediately. Thank you.</p>
`;

    const bodyWithSignature = body + emailSignature;

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

    const recipientRecords = allRecipients.map(recipient => ({
      email_id: emailData.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      contact_id: recipient.contactId || null,
      recipient_type: recipient.type,
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

    console.log(`Using sender email: ${senderEmail}`);

    const resend = new Resend(resendApiKey);

    const toEmails = recipients.map(r => r.email);
    const ccEmails = ccRecipients?.map(r => r.email) || [];

    const emailResults = [];
    try {
      const result = await resend.emails.send({
        from: senderEmail,
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: subject,
        html: bodyWithSignature,
      });
      console.log(`Email sent successfully. Resend ID: ${result.data?.id}`);

      allRecipients.forEach(recipient => {
        emailResults.push({ email: recipient.email, type: recipient.type, success: true, id: result.data?.id });
      });
    } catch (emailError: any) {
      const errorMessage = emailError?.message || String(emailError);
      console.error(`Failed to send email:`, {
        error: errorMessage,
        details: emailError,
      });

      allRecipients.forEach(recipient => {
        emailResults.push({ email: recipient.email, type: recipient.type, success: false, error: errorMessage });
      });

      await supabase
        .from("email_recipients")
        .update({ status: "failed" })
        .eq("email_id", emailData.id);
    }

    console.log(`Email sent to ${allRecipients.length} recipient(s) (${recipients.length} TO, ${ccEmails.length} CC)`, emailResults);

    const failedEmails = emailResults.filter(r => !r.success);
    const successfulEmails = emailResults.filter(r => r.success);

    if (failedEmails.length === allRecipients.length) {
      const firstError = failedEmails[0]?.error || "Unknown error";
      throw new Error(`All emails failed to send. Error: ${firstError}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailData.id,
        recipientCount: allRecipients.length,
        toCount: recipients.length,
        ccCount: ccEmails.length,
        successCount: successfulEmails.length,
        failureCount: failedEmails.length,
        message: failedEmails.length > 0
          ? `Email sent to ${successfulEmails.length} of ${allRecipients.length} recipients. ${failedEmails.length} failed.`
          : `Email sent successfully to ${allRecipients.length} recipient(s)`,
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