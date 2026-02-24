const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });


const SKILLS_DB = [
  "html", "css", "javascript", "react",
  "node", "express", "mongodb",
  "python", "java", "sql", "aws"
];

const ROLE_SKILLS = {
  "frontend developer": ["html", "css", "javascript", "react"],
  "backend developer": ["node", "express", "mongodb", "sql"],
  "full stack developer": ["html", "css", "javascript", "react", "node"],
};



async function extractText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);

  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.toLowerCase();
  }

  if (mimeType.includes("wordprocessingml")) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value.toLowerCase();
  }

  return "";
}



function extractSkills(text) {
  return SKILLS_DB.filter(skill => text.includes(skill));
}

function calculateScore(found, required) {
  const matched = required.filter(skill => found.includes(skill));
  const missing = required.filter(skill => !found.includes(skill));
  const score = Math.round((matched.length / required.length) * 100);

  return { matched, missing, score };
}



app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const role = req.body.role.toLowerCase();
    const filePath = req.file.path;

    const text = await extractText(filePath, req.file.mimetype);
    const foundSkills = extractSkills(text);

    const requiredSkills =
      ROLE_SKILLS[role] || ROLE_SKILLS["full stack developer"];

    const { matched, missing, score } =
      calculateScore(foundSkills, requiredSkills);

    fs.unlinkSync(filePath);

    res.json({
      score,
      matchedSkills: matched,
      missingSkills: missing,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
});



app.post("/export", (req, res) => {
  const { role, score, matchedSkills, missingSkills } = req.body;

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("Resume Analysis Report", { underline: true });
  doc.moveDown();

  doc.text(`Role: ${role}`);
  doc.text(`Score: ${score}%`);

  doc.moveDown();
  doc.text("Matched Skills:");
  matchedSkills.forEach(skill => doc.text(`✔ ${skill}`));

  doc.moveDown();
  doc.text("Missing Skills:");
  missingSkills.forEach(skill => doc.text(`✘ ${skill}`));

  doc.end();
});


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});