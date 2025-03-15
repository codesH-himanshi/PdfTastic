const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs").promises; // ✅ Only Import Asynchronous `fs`
const path = require("path");
const Image = require("./models/image"); // Import Image model

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:Vxki.F-bNr7_8Q7@dictionaryappcluster.s4few.mongodb.net/DictionaryAppCluster?retryWrites=true&w=majority") 
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// CORS configuration
const allowedOrigins = ["https://codesh-himanshi.github.io/PdfTastic/", "http://localhost:3000"];
app.use(cors({
  origin: "*", // Allow all origins
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

app.use(express.json());
app.use(express.static("public")); // Serve uploaded PDFs

// Configure multer for file uploads
const uploadPath = path.join(__dirname, "uploads");

(async () => {
    try {
        await fs.mkdir(uploadPath, { recursive: true }); // ✅ Ensure uploads directory exists
        console.log("📂 Uploads directory is ready");
    } catch (err) {
        console.error("❌ Error creating uploads directory:", err);
    }
})();

app.use("/uploads", express.static(uploadPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Serve Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ API to Upload Images and Save to MongoDB
app.post("/upload-images", upload.array("images"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No images uploaded" });
        }

        console.log("📸 Uploaded files:", req.files);

        let savedImages = [];
        for (const file of req.files) {
            const imageUrl = `https://pdftastic.onrender.com/uploads/${file.filename}`;
            console.log("✅ Saving image:", imageUrl);
            const newImage = new Image({
                filename: file.filename,
                url: imageUrl,
                order: savedImages.length + 1,
            });
            await newImage.save();
            savedImages.push(newImage);
        }

        res.json({ message: "✅ Images uploaded successfully", images: savedImages });
    } catch (error) {
        console.error("❌ Error uploading images:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// ✅ API to Retrieve Images
app.get("/get-images", async (req, res) => {
    try {
        const images = await Image.find().sort({ order: 1 });
        res.json({ images });
    } catch (error) {
        console.error("❌ Error fetching images:", error);
        res.status(500).json({ error: "Error fetching images" });
    }
});

// ✅ API to Generate PDF from Images
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
                console.warn(`⚠️ Image file not found: ${imagePath}`);
            }
        }

        // Remove previous output.pdf before saving a new one
        const pdfPath = path.join(uploadPath, "output.pdf");
        try {
            await fs.unlink(pdfPath);
            console.log("🗑️ Previous PDF deleted.");
        } catch (err) {
            if (err.code !== "ENOENT") console.error("⚠️ Error deleting old PDF:", err);
        }

        // Save new PDF
        await fs.writeFile(pdfPath, await pdfDoc.save());

        res.json({ url: `https://pdftastic.onrender.com/uploads/output.pdf` });
    } catch (error) {
        console.error("❌ Error generating PDF:", error);
        res.status(500).json({ error: "Error generating PDF" });
    }
});

app.delete("/clear-images", async (req, res) => {
    try {
        // Delete image files from the server
        const files = await fs.readdir(uploadPath);
        for (const file of files) {
            await fs.unlink(path.join(uploadPath, file));
        }

        // Clear image references from MongoDB
        await Image.deleteMany({});

        console.log("🗑️ All images deleted");
        res.json({ message: "✅ All images deleted successfully" });
    } catch (error) {
        console.error("❌ Error clearing images:", error);
        res.status(500).json({ error: "Error clearing images" });
    }
});




// ✅ Start the Server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
