'use server';

export async function sendTestSms(phone: string) {
  try {
    // 1. Basic validation
    // Requirements: numeric and exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return {
        success: false,
        message: 'Invalid phone number. Must be exactly 10 digits.',
      };
    }

    // 2. Generate message string
    const timestamp = new Date().toLocaleString();
    const messageString = `Hi ! You got this - SMS working ;). We sent this at ${timestamp}`;

    // 3. Prepare payload
    // Note: The requirement strictly specified this structure.
    const payload = {
      username: process.env.MOBITEL_SMS_USER,
      password: process.env.MOBITEL_SMS_PASSWORD,
      from: 'Ruhunu Hosp',
      to: phone,
      text: messageString,
      messageType: 1, // Using corrected spelling 'messageType' as discussed in plan
    };

    // 4. Send POST request
    const apiUrl = process.env.MOBITEL_SMS_URL;

    if (!apiUrl) {
       return {
        success: false,
        message: 'Configuration Error: MOBITEL_SMS_URL is not defined.',
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // 5. Return raw response
    return {
      success: true, // We successfully *attempted* the send
      data: responseData,
    };

  } catch (error: any) {
    console.error('Error in sendTestSms:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
