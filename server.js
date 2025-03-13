const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const Image = require("./models/Image"); // Import Image model

const app = express();
const port = process.env.PORT || 5000;

// ✅ Connect to MongoDB
mongoose.connect("mongodb+srv:mongodb+srv://admin:Q6isr8W7A.SCHvr@dictionaryappcluster.s4few.mongodb.net/?retryWrites=true&w=majority&appName=DictionaryAppCluster", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use(cors({ origin: "https://codesh-himanshi.github.io/PdfTastic/" }));
app.use(express.json());
app.use(express.static("public")); // Serve uploaded PDFs

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ✅ Serve index.html when accessing root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ API to upload images and save to MongoDB
app.post("/upload-images", upload.array("images"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No images uploaded" });
        }

        let savedImages = [];
        for (const file of req.files) {
            const imageUrl = `https://pdftastic.onrender.com/uploads/${file.filename}`;
            const newImage = new Image({
                filename: file.filename,
                url: imageUrl,
                order: savedImages.length + 1,
            });
            await newImage.save();
            savedImages.push(newImage);
        }

        res.json({ message: "Images uploaded successfully", images: savedImages });
    } catch (error) {
        console.error("Error saving images:", error);
        res.status(500).json({ error: "Error saving images" });
    }
});

// ✅ API to retrieve images from MongoDB
app.get("/get-images", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });
        res.json({ images });
    } catch (error) {
        console.error("Error fetching images:", error);
        res.status(500).json({ error: "Error fetching images" });
    }
});

// ✅ API to generate PDF from images stored in MongoDB
app.post("/generate-pdf", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });

        if (!images || images.length === 0) {
            return res.status(400).json({ error: "No images found in database" });
        }

        const pdfDoc = await PDFDocument.create();
        for (const imageData of images) {
            const imagePath = path.join(__dirname, "uploads", imageData.filename);
            if (fs.existsSync(imagePath)) {
                const imageBytes = fs.readFileSync(imagePath);
                const image = await pdfDoc.embedJpg(imageBytes);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } else {
                console.warn(`⚠ Image file not found: ${imagePath}`);
            }
        }

        const pdfPath = path.join(__dirname, "uploads", "output.pdf");
        fs.writeFileSync(pdfPath, await pdfDoc.save());

        res.json({ url: `https://pdftastic.onrender.com/output.pdf` });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Error generating PDF" });
    }
});

// ✅ Start the server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
