const functions = require("firebase-functions");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
admin.initializeApp();

const app = require("express")();
const cors = require("cors");
app.use(cors({origin:true}));

// Retail / Reference Verification
app.get("/verifyReference", async (req,res)=>{
  const ref = req.query.ref;
  res.json({ref: ref, status:"VERIFIED", verification_code:`FSTL-${Date.now()}`});
});

// Institution Verification
app.post("/institutionVerify", async (req,res)=>{
  const {institution_id, assets} = req.body;
  const verification_codes = assets.map(a => `FSTL-${a.asset_id}-${Date.now()}`);
  res.json({institution_id, verification_codes});
});

exports.app = functions.https.onRequest(app);
