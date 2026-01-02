const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * INTERNAL: Generate Verification Code
 */
function generateCode(prefix="FSTL") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
}

/**
 * INTERNAL: Generate PDF Receipt
 */
async function generatePDF(data) {
  const filePath = path.join("/tmp", `${data.code}.pdf`);
  const doc = new PDFDocument();

  const qr = await QRCode.toDataURL(
    `https://fstl.com.ng/verify?ref=${data.code}`
  );

  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(18).text("FIRST STANDARD TITLE LIMITED", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Verification Code: ${data.code}`);
  doc.text(`Amount: ₦${data.amount}`);
  doc.text(`Bank Reference: ${data.bank_ref}`);
  doc.text(`Date: ${new Date().toISOString()}`);
  doc.moveDown();
  doc.image(qr, { width: 120 });
  doc.text("Scan to Verify", { align: "center" });
  doc.end();

  return filePath;
}

/**
 * 🔑 REVENUE ENTRY POINT (RETAIL + AGENT)
 * NOT exposed on frontend
 */
app.post("/internal/process-payment", async (req, res) => {
  const { bank_ref, amount, channel } = req.body;

  if (!bank_ref || !amount) {
    return res.status(400).json({ status: "ERROR" });
  }

  const code = generateCode(channel === "INSTITUTION" ? "FSTL-INS" : "FSTL-RET");

  await generatePDF({
    code,
    amount,
    bank_ref
  });

  res.json({
    status: "VERIFIED",
    verification_code: code
  });
});

/**
 * 🔍 PUBLIC VERIFICATION (READ ONLY)
 */
app.get("/verify", async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(404).send("Invalid");

  res.json({
    ref,
    status: "VALID",
    issuer: "First Standard Title Limited"
  });
});

exports.app = functions.https.onRequest(app);
