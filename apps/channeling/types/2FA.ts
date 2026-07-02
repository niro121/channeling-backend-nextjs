type Option = {
  id: string
  option: string
}

// EMAIL ('3') is currently unavailable — commented out in UI; re-enable when email sending is implemented
export const TWO_FACTOR_AUTH: Option[] = [
  { id: '1', option: 'AUTH-APP' },
  { id: '2', option: 'SMS' },
  // { id: '3', option: 'EMAIL' },
]