export const agencyWelcomeSmsTemplate = (agencyName: string, loginEmail?: string) => {
  if (loginEmail) {
    return `Welcome! Your agency ${agencyName} has been registered. You can login using ${loginEmail}.`;
  }
  return `Welcome! Your agency ${agencyName} has been registered successfully.`;
};
