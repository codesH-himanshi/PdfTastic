const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  filename: String,
  url: String,
  order: Number,
});

const Image = mongoose.model("Image", ImageSchema);
module.exports = Image;
