const nodemailer = require("nodemailer");

/**
 * Send an email. Backwards-compatible: existing callers pass `{ email, subject,
 * message }` and get a plain-text mail. Pass `html` as well to send a rich
 * multipart message — `message` then becomes the plain-text fallback every
 * client still receives (and the one shown by text-only readers).
 */
const sendEmail = async ({ email, subject, message, html }) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"SkyGuide AI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        text: message,
        ...(html ? { html } : {}),
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
