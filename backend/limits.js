// Input size limits (the frontend sets matching maxLength attributes).
export const LIMITS = {
  username: 50,
  passwordBytes: 72,   // bcrypt only uses the first 72 bytes
  projectName: 100,
  title: 200,
  content: 20000,
  obstacles: 10000
};

// Control characters have no place in names.
export const hasControlChars = s => /[\u0000-\u001f\u007f]/.test(s);
