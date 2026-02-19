import { generateTotpSecret } from '../lib/helpers/2fa/totp';

const secret = generateTotpSecret();
console.log('Generated TOTP Secret:', secret);
