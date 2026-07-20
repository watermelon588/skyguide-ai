const Feedback = require("../models/Feedback");
const sendEmail = require("../utils/email");
const { layout, heading, paragraph, escapeHtml } = require("../utils/emailTemplates");

/**
 * Feedback controller (thin).
 *
 * POST /api/v1/feedback  { message, category?, email?, page? }
 *
 * Public — the footer form is on the landing page, so signed-out visitors can
 * send too. The viewer, if any, comes from optionalAuth (never the body). The
 * row is the source of truth; the owner-notification email is best-effort so a
 * mail hiccup never fails the submission.
 */

const CATEGORIES = ["idea", "bug", "praise", "other"];
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where feedback notifications go — the site owner's inbox. */
function ownerInbox() {
  return process.env.FEEDBACK_INBOX || process.env.EMAIL_USER || null;
}

function notifyOwner(entry, sender) {
  const inbox = ownerInbox();
  if (!inbox) return; // no mailbox configured — the stored row still stands

  const who = sender
    ? `${sender.username}${sender.email ? ` &lt;${escapeHtml(sender.email)}&gt;` : ""}`
    : entry.email
      ? escapeHtml(entry.email)
      : "Anonymous";

  const content = `
    ${heading("New feedback")}
    ${paragraph(`<strong style="color:#f6f6f6;">Category:</strong> ${escapeHtml(entry.category)}`)}
    ${paragraph(`<strong style="color:#f6f6f6;">From:</strong> ${who}`)}
    ${entry.page ? paragraph(`<strong style="color:#f6f6f6;">Page:</strong> ${escapeHtml(entry.page)}`) : ""}
    ${paragraph(`<strong style="color:#f6f6f6;">Message:</strong><br>${escapeHtml(entry.message).replace(/\n/g, "<br>")}`)}
  `;

  const html = layout({
    title: "New SkyGuide feedback",
    preheader: entry.message.slice(0, 90),
    content,
    footNote: "Sent from the SkyGuide AI feedback form.",
  });

  const text = `New feedback (${entry.category})
From: ${sender ? `${sender.username} <${sender.email || ""}>` : entry.email || "Anonymous"}
${entry.page ? `Page: ${entry.page}\n` : ""}
${entry.message}`;

  sendEmail({
    email: inbox,
    subject: `[SkyGuide feedback] ${entry.category}`,
    message: text,
    html,
  }).catch((err) =>
    console.error("Feedback notification email failed:", err.message),
  );
}

exports.submitFeedback = async (req, res, next) => {
  try {
    const message = String(req.body.message ?? "").trim();
    if (message.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please write a little more so we can act on it.",
      });
    }
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be 2000 characters or fewer.",
      });
    }

    const category = CATEGORIES.includes(req.body.category)
      ? req.body.category
      : "other";

    // A supplied email must at least look like one; blank is fine.
    const rawEmail = String(req.body.email ?? "").trim().slice(0, 200);
    const email = rawEmail && EMAIL_SHAPE.test(rawEmail) ? rawEmail : "";

    const entry = await Feedback.create({
      user: req.user?._id ?? null,
      category,
      message,
      email: email || req.user?.email || "",
      page: String(req.body.page ?? "").trim().slice(0, 300),
    });

    notifyOwner(entry, req.user || null);

    res.status(201).json({
      success: true,
      message: "Thanks — your feedback is in.",
    });
  } catch (error) {
    next(error);
  }
};
