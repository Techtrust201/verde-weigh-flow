export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getEmailError = (email: string): string | null => {
  if (!email) return null;
  if (!validateEmail(email)) {
    return "Format d'email invalide";
  }
  return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === "") {
    return `${fieldName} est requis`;
  }
  return null;
};