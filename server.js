const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: "https://codesh-himanshi.github.io/PdfTastic/" }));
app.use(express.json());
app.use(express.static("public")); // Serve uploaded PDFs

// Configure multer for file uploads
const upload = multer({ dest: "/tmp/uploads/" });

// Serve index.html when accessing root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API to upload images and generate a PDF
app.post("/generate-pdf", upload.array("images"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No images uploaded" });
        }

        const pdfDoc = await PDFDocument.create();

        for (const file of req.files) {
            const imageBytes = fs.readFileSync(file.path);
            const image = await pdfDoc.embedJpg(imageBytes);
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });

            fs.unlinkSync(file.path);
        }

        const pdfPath = path.join(__dirname, "uploads", "output.pdf");
        fs.writeFileSync(pdfPath, await pdfDoc.save());

        res.json({ url: `http://localhost:${port}/output.pdf` });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Error generating PDF" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
