// I'll change credentails at the end of testing
const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
  try {

    let testAccount = await nodemailer.createTestAccount();

    // Create a transporter using Nodemailer
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT || 587,
      // secure: process.env.MAIL_SECURE === 'true',
      auth: {
        // user: process.env.MAIL_USER,
        // pass: process.env.MAIL_PASS,
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Send mail
    let info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'colten72@ethereal.email',
      // to: email,
      to: "test@gmail.com",
      subject: title,
      html: body,
    });

    console.log('Email sent successfully:', info);
    return info;
  } catch (error) {
    console.error('Error occurred while sending email:', error.message);
    throw new Error('Failed to send email. Please try again later.');
  }
};

module.exports = mailSender;
