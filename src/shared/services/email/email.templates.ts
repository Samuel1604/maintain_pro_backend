

export const verificationOtpTemplate = (
  otp: string,
) => `
<div>
  <h2>Verify Your Email</h2>

  <p>Your verification code is:</p>

  <h1>${otp}</h1>

  <p>
    This code expires in 10 minutes.
  </p>
</div>
`;

export const passwordResetTemplate = (
  otp: string,
) => `
<div>
  <h2>Password Reset</h2>

  <p>Your reset code is:</p>

  <h1>${otp}</h1>

  <p>
    This code expires in 10 minutes.
  </p>
</div>
`;


export const emailChangeTemplate = (
  otp: string,
) => `
<div>
  <h2>Change Email</h2> 

  <p>Your verification code is:</p>

  <h1>${otp}</h1>

  <p>
    This code expires in 10 minutes.
  </p>
</div>
`;

export const invitationEmail = (
  token: string
) => `
<div>
  <h2>Invitation</h2>

  <p>Click the link below to accept the invitation:</p>

  <a href="${process.env.CLIENT_URL}/accept-invitation?token=${token}">Accept Invitation</a>
</div>
`;  