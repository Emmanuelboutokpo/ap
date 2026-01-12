import { Resend } from "resend";
 
const resend = new Resend(process.env.RESEND_API_KEY);
 const getEmailTemplate = (
  subject: string,
  content: string,
  user: { name: string }
) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="
  margin:0;
  padding:0;
  background-color:#f4f4f4;
  font-family:Arial, Helvetica, sans-serif;
">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="
          background-color:#ffffff;
          border-radius:8px;
          overflow:hidden;
          box-shadow:0 2px 8px rgba(0,0,0,0.05);
        ">

          <!-- Header -->
          <tr>
            <td style="
              background-color:#000000;
              padding:20px;
              text-align:center;
            ">
              <h1 style="
                color:#ffffff;
                margin:0;
                font-size:22px;
                letter-spacing:1px;
              ">
               CHORALE MONT-SINAI CALAVI CENTRE
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <h2 style="
                color:#333333;
                font-size:20px;
                margin-top:0;
              ">
                ${subject}
              </h2>

              <p style="
                color:#555555;
                font-size:14px;
                line-height:1.6;
              ">
                Bonjour <strong>${user.name}</strong>,
              </p>

              <p style="
                color:#555555;
                font-size:14px;
                line-height:1.6;
              ">
                ${content}
              </p>

              <!-- Divider -->
              <hr style="
                border:none;
                border-top:1px solid #eeeeee;
                margin:30px 0;
              "/>

              <p style="
                color:#777777;
                font-size:13px;
                line-height:1.6;
              ">
                Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background-color:#fafafa;
              padding:20px;
              text-align:center;
            ">
              <p style="
                color:#999999;
                font-size:12px;
                margin:0;
              ">
                © ${new Date().getFullYear()}  CHORALE MONT-SINAI CALAVI CENTRE<br/>
                Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};


export const sendEmail = async (to: string, subject: string, content: string, user: {name: string}) => {
    const html = getEmailTemplate(subject, content, user)
    try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to,
      subject: `CHORALE MONT-SINAI CALAVI CENTRE - ${subject}`,
      html: html,
    });
             
    } catch (error) {
        console.error('Failed to send email', error);
    }
  
}

export const sendOPT = async (data: any) => {
  const { email, otp, user } = data;

  const subject = "Votre code de vérification (OTP)";

  const content = `
  Veuillez utiliser le code de vérification ci-dessous pour confirmer votre action sur la plateforme
  <strong>CHORALE MONT-SINAI CALAVI CENTRE</strong> :

  <div style="
    margin:20px 0;
    padding:15px;
    background-color:#f4f4f4;
    border-radius:6px;
    text-align:center;
    font-size:20px;
    letter-spacing:3px;
    font-weight:bold;
  ">
    ${otp}
  </div>

  Ce code est valide pendant <strong>5 minutes</strong>.
  <br/><br/>
  Pour des raisons de sécurité, ne partagez jamais ce code avec qui que ce soit.
`;

  await sendEmail(email, subject, content, user);
};

export const sendConfirmationEmail = async (to: string, user: any) => {
  const subject = "Bienvenue à la CHORALE MONT-SINAI CALAVI CENTRE 🎶";

  const content = `
  Votre inscription a été validée avec succès !
  <br/><br/>
  Bienvenue sur la plateforme officielle de la
  <strong>CHORALE MONT-SINAI CALAVI CENTRE</strong>.
  <br/><br/>
  Cette application vous permet d’accéder aux planches, partitions, audios de chants,
  ainsi qu’aux différentes catégories et sous-catégories mises à disposition par l’administration.
  <br/><br/>
  Si vous avez besoin d’aide ou d’informations supplémentaires, n’hésitez pas à contacter l’équipe administrative.
`;

  await sendEmail(to, subject, content, user);
};

export const sendDesactiverEmail = async (to: string, user: any) => {
  const subject = "Désactivation de votre compte – CHORALE MONT-SINAÏ CALAVI CENTRE";

  const content = `
  Bonjour ${user?.fullName ?? ""},  
  <br/><br/>
  Nous vous informons que votre compte sur la plateforme officielle de la  
  <strong>CHORALE MONT-SINAÏ CALAVI CENTRE</strong> a été <strong>désactivé</strong>.
  <br/><br/>
  À partir de maintenant, vous n’avez plus accès aux fonctionnalités de la plateforme,
  notamment :
  <ul>
    <li>Les planches et partitions</li>
    <li>Les audios de chants</li>
    <li>Les catégories et sous-catégories</li>
  </ul>
  <br/>
  Cette décision peut être liée à une mise à jour administrative, une inactivité prolongée
  ou à toute autre raison interne.
  <br/><br/>
  Si vous pensez qu’il s’agit d’une erreur ou si vous souhaitez obtenir plus d’informations,
  nous vous invitons à contacter l’administration de la chorale.
  <br/><br/>
  Nous vous remercions pour votre compréhension.
  <br/><br/>
  Cordialement,  
  <br/>
  <strong>L’administration de la CHORALE MONT-SINAÏ CALAVI CENTRE</strong>
`;

  await sendEmail(to, subject, content, user);
};
