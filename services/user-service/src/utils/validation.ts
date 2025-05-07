export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateUsername = (username: string): boolean => {
  return username.length >= 3;
};

export const isRegistrationDataValid = (
  firstName: string,
  lastName: string,
  login: string,
  password: string,
  role: string
): boolean => {
  return (
    Boolean(firstName?.trim()) &&
    Boolean(lastName?.trim()) &&
    Boolean(login?.trim()) &&
    Boolean(password?.trim()) &&
    Boolean(role?.trim())
  );
}; 