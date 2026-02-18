import { generateTotpSecret } from '../lib/2fa/totp';

const secret = generateTotpSecret();
console.log('Generated TOTP Secret:', secret);
