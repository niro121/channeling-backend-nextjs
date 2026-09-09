import crypto from 'crypto';

interface SendSmsParams {
  phoneNumber: string;
  message: string;
}

interface ApiLog {
  endpoint: string;
  request: any;
  response: any;
  status: number;
  success: boolean;
}

export const sendSmsService = async ({ phoneNumber, message }: SendSmsParams) => {
  // Extract environment variables
  const apiUser = process.env.SMS_USER;
  const apiPassword = process.env.SMS_API_PASSWORD;
  const apiUrl = process.env.SMS_API_URL || 'https://richcommunication.dialog.lk/api/sms/send';
  const appendText = process.env.SMS_APPEND_TEXT || '';
  const mask = process.env.SMS_MASK;
  const countryPrefix = process.env.SMS_COUNTRY_PREFIX || '94';

  if (!apiUser || !apiPassword) {
    console.error('Missing SMS_USER or SMS_API_PASSWORD in environment variables');
    return { success: false, message: 'SMS configuration missing' };
  }

  // Normalization: Ensure phone number handles country prefix
  let normalizedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
  
  // Check if it already starts with the country prefix
  if (!normalizedNumber.startsWith(countryPrefix)) {
      // If it starts with 0 (e.g., 077...), remove it and prepend prefix
      if (normalizedNumber.startsWith('0')) {
          normalizedNumber = countryPrefix + normalizedNumber.substring(1);
      } else {
          // Otherwise just prepend prefix (e.g. 77...)
          normalizedNumber = countryPrefix + normalizedNumber;
      }
  }

  // Construct final message with append text
  const finalMessage = `${message}${appendText}`;

  // Generate Digest: MD5 hash of the password
  const digest = crypto.createHash('md5').update(apiPassword).digest('hex');

  const payload: any = {
    messages: [
      {
        number: normalizedNumber,
        text: finalMessage
      }
    ]
  };

  // Add source address (mask) if configured. 
  // Note: API implementation for mask might vary, putting it at root level as common practice
  if (mask) {
    payload.sourceAddress = mask;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'USER': apiUser,
        'DIGEST': digest
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    
    // Simple logging
    const log: ApiLog = {
      endpoint: apiUrl,
      request: payload,
      response: responseData,
      status: response.status,
      success: response.status === 200
    };
    
    // In production, you might want to hide sensitive data in logs
    console.log('SMS API Log:', JSON.stringify(log, null, 2));

    if (!response.ok) {
       return { success: false, message: responseData.message || 'Failed to send SMS' };
    }

    return { success: true, data: responseData };

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

