const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs").promises; // Using fs.promises for async operations
const path = require("path");
const Image = require("./models/image"); // Import Image model

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:Vxki.F-bNr7_8Q7@dictionaryappcluster.s4few.mongodb.net/DictionaryAppCluster?retryWrites=true&w=majority")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// CORS configuration (supports multiple origins)
const allowedOrigins = ["https://codesh-himanshi.github.io/PdfTastic/", "http://localhost:3000"];
const cors = require("cors");

app.use(cors({
  origin: "*", // Allow all origins
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));


app.use(express.json());
app.use(express.static("public")); // Serve uploaded PDFs

// Configure multer for file uploads
const uploadPath = path.join(__dirname, "uploads");
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadPath, { recursive: true }); // Ensure directory exists
            cb(null, uploadPath);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API to upload images and save to MongoDB
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
        console.error("🔥 Error uploading images:", error);  // Debugging info
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// API to retrieve images from MongoDB
app.get("/get-images", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });
        res.json({ images });
    } catch (error) {
        console.error("Error fetching images:", error);
        res.status(500).json({ error: "Error fetching images" });
    }
});

// API to generate PDF from images stored in MongoDB
app.post("/generate-pdf", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });

        if (!images || images.length === 0) {
            return res.status(400).json({ error: "No images found in database" });
        }

        const pdfDoc = await PDFDocument.create();

        for (const imageData of images) {
            const imagePath = path.join(uploadPath, imageData.filename);
            try {
                const imageBytes = await fs.readFile(imagePath);
                const image = await pdfDoc.embedJpg(imageBytes);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } catch (err) {
                console.warn(`⚠ Image file not found: ${imagePath}`);
            }
        }

        // Remove previous output.pdf before saving a new one
        const pdfPath = path.join(uploadPath, "output.pdf");
        try {
            await fs.unlink(pdfPath);
            console.log("🗑️ Previous PDF deleted.");
        } catch (err) {
            if (err.code !== "ENOENT") console.error("⚠ Error deleting old PDF:", err);
        }

        // Save new PDF
        await fs.writeFile(pdfPath, await pdfDoc.save());

        res.json({ url: `https://pdftastic.onrender.com/output.pdf` });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Error generating PDF" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
