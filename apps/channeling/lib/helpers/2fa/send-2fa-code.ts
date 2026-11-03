import { sendSms } from "@/lib/helpers/sms/send-sms";
import { twoFaCodeSmsTemplate } from "@/lib/templates/sms/2FA";

/**
 * Send 2FA verification code via SMS using the shared sendSms helper and template.
 */
export async function send2faSms(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const text = twoFaCodeSmsTemplate(code);
  const result = await sendSms(phoneNumber, text, { logName: "2FA" });
  return { success: result.status };
}

/**
 * Send 2FA verification code via Email.
 * Email method is currently unavailable — implementation commented out.
 */
export async function send2faEmail(email: string, code: string): Promise<{ success: boolean }> {
  // --- Email currently unavailable: real SMTP not implemented ---
  // const transporter = nodemailer.createTransport(...);
  // await transporter.sendMail({
  //   from: process.env.SMTP_FROM,
  //   to: email,
  //   subject: 'Your verification code',
  //   text: twoFaCodeEmailTemplate(code),
  // });
  // return { success: true };
  console.log("[2FA Email - unavailable] Would send code to", email, "| Code:", code);
  return { success: false };
}
