const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs").promises;
const path = require("path");
const Image = require("./models/image");

const app = express();
const port = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:jWuZ8x820022VYyqP@dictionaryappcluster.s4few.mongodb.net/DictionaryAppCluster?retryWrites=true&w=majority")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// CORS Configuration
app.use(cors({ origin: "*", methods: "GET,POST,PUT,DELETE", allowedHeaders: "Content-Type,Authorization" }));

app.use(express.json());
app.use(express.static("public"));

// Configure uploads folder
const uploadPath = path.join(__dirname, "uploads");
(async () => {
    try {
        await fs.mkdir(uploadPath, { recursive: true });
        console.log("📂 Uploads directory is ready");
    } catch (err) {
        console.error("Error creating uploads directory:", err);
    }
})();
app.use("/uploads", express.static(uploadPath));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upload Images
app.post("/upload-images", upload.array("images"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No images uploaded" });
        let savedImages = [];
        for (const file of req.files) {
            const imageUrl = `https://pdftastic.onrender.com/uploads/${file.filename}`;
            const newImage = new Image({ filename: file.filename, url: imageUrl, order: savedImages.length + 1 });
            await newImage.save();
            savedImages.push(newImage);
        }
        res.json({ message: "Images uploaded successfully", images: savedImages });
    } catch (error) {
        console.error("Error uploading images:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Images
app.get("/get-images", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });
        res.json({ images });
    } catch (error) {
        console.error("Error fetching images:", error);
        res.status(500).json({ error: "Error fetching images" });
    }
});

// Generate PDF
app.post("/generate-pdf", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });
        if (!images.length) return res.status(400).json({ error: "No images found in database" });

        const pdfDoc = await PDFDocument.create();
        for (const imageData of images) {
            const imagePath = path.join(uploadPath, imageData.filename);
            try {
                console.log(`🔍 Checking image path: ${imagePath}`);
                const imageBytes = await fs.readFile(imagePath);
                let image;
                if (imageData.filename.endsWith(".png")) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

                // Delete image after embedding it into PDF
                await fs.unlink(imagePath);
                await Image.deleteOne({ _id: imageData._id });
            } catch (err) {
                console.warn(`⚠️ Image file not found: ${imagePath}`);
            }
        }

        // Prevent Error When Deleting Old PDFs
        const pdfPath = path.join(uploadPath, "output.pdf");
        await fs.writeFile(pdfPath, await pdfDoc.save());
        res.json({ url: `https://pdftastic.onrender.com/uploads/output.pdf` });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Error generating PDF" });
    }
});

// Clear Images (but keep PDFs)
app.delete("/clear-images", async (req, res) => {
    try {
        const files = await fs.readdir(uploadPath);
        for (const file of files) {
            if (file !== "output.pdf") {
                await fs.unlink(path.join(uploadPath, file));
            }
        }
        await Image.deleteMany({});
        res.json({ message: "Images deleted successfully" });
    } catch (error) {
        console.error("Error clearing images:", error);
        res.status(500).json({ error: "Error clearing images" });
    }
});

// Start Server
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
