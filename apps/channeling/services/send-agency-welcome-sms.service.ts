import { sendSmsService } from './send-sms.service';
import { agencyWelcomeSmsTemplate } from '@/lib/templates/sms/agency-creation/agency-welcome';

interface SendAgencyWelcomeSmsParams {
  agencyName: string;
  mobile: string;
  contactPersonMobile?: string;
  loginEmail?: string;
}

export const sendAgencyWelcomeSmsService = async ({
  agencyName,
  mobile,
  contactPersonMobile,
  loginEmail
}: SendAgencyWelcomeSmsParams) => {
  // 1. Determine the mobile number to use
  // Priority: Mobile -> Contact Person Mobile
  let targetNumber = mobile;
  if (!targetNumber && contactPersonMobile) {
    targetNumber = contactPersonMobile;
  }

  if (!targetNumber) {
    console.warn('No mobile number available for Agency Welcome SMS');
    return { success: false, message: 'No mobile number provided' };
  }

  // 2. Generate content
  const message = agencyWelcomeSmsTemplate(agencyName, loginEmail);

  // 3. Send SMS
  // Trigger: Initiated by Agency Creation
  return await sendSmsService({
    phoneNumber: targetNumber,
    message
  });
};
