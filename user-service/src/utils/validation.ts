export const isRegistrationDataValid = (
  firstName?: string,
  lastName?: string,
  login?: string,
  password?: string,
  role?: string,
): boolean => {
  return Boolean(firstName && lastName && login && password && role);
};
