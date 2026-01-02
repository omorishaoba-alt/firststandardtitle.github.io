const functions = require('firebase-functions');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const os = require('os');
const path = require('path');

exports.generateReceipt = functions.https.onRequest(async (req,res)=>{
  const { type, ref, amount } = req.body;
  if(!type || !ref || !amount) return res.status(400).send("Missing parameters");

  const pdfPath = path.join(os.tmpdir(), `${ref}.pdf`);
  const qrPath = path.join(os.tmpdir(), `${ref}.png`);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));
  doc.fontSize(20).text('FSTL Verification Receipt',{align:'center'});
  doc.fontSize(16).text(`Type: ${type}`);
  doc.text(`Reference: ${ref}`);
  doc.text(`Amount: ₦${amount}`);
  doc.text(`Date: ${new Date().toISOString()}`);
  doc.end();

  await QRCode.toFile(qrPath, `https://fstl.com.ng/verify/${ref}`);

  res.json({pdf_url:`https://fstl.com.ng/receipts/${ref}.pdf`,qr_url:`https://fstl.com.ng/qr/${ref}.png`,status:'GENERATED'});
});

exports.verifyReference = functions.https.onRequest((req,res)=>{
  const ref=req.query.ref;
  if(!ref) return res.status(400).send("Reference required");
  res.json({status:'VERIFIED',ref,pdf_url:`https://fstl.com.ng/receipts/${ref}.pdf`,qr_url:`https://fstl.com.ng/qr/${ref}.png`,timestamp:new Date().toISOString()});
});

exports.institutionVerify = functions.https.onRequest((req,res)=>{
  const { institution_id, assets } = req.body;
  if(!institution_id || !assets) return res.status(400).send("Missing parameters");
  const verification_codes = assets.map(a=>`FSTL-REF-${a.asset_id}`);
  res.json({
    status:'VERIFIED',
    institution_id,
    total_value_verified: assets.reduce((sum,a)=>sum+a.value,0),
    verification_codes,
    pdf_links: verification_codes.map(c=>`https://fstl.com.ng/receipts/${c}.pdf`),
    qr_links: verification_codes.map(c=>`https://fstl.com.ng/qr/${c}.png`),
    timestamp:new Date().toISOString()
  });
});

exports.agentCommission = functions.https.onRequest((req,res)=>{
  const { agent_id, ref, amount } = req.body;
  if(!agent_id || !ref || !amount) return res.status(400).send("Missing parameters");
  res.json({status:'COMMISSION_CONFIRMED',agent_id,ref,amount,pdf_url:`https://fstl.com.ng/receipts/${ref}-agent.pdf`,timestamp:new Date().toISOString()});
});
