import crypto from "crypto";


export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


export const hashOtp = (
  otp: string,
) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};