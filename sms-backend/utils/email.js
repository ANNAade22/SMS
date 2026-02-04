const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  transporter.verify((err, success) => {
    if (err) {
      console.error('SMTP Connection Error:', err);
    } else {
      console.log('SMTP is ready to send emails!');
    }
  });

  const mailOptions = {
    from: 'Anas <admin@ums.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  console.log('Sending to:', options.email); // Debug

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
