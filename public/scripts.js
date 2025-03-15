const imageInput = document.getElementById("image-input");
const imageContainer = document.getElementById("image-container");
const loadingIndicator = document.getElementById("loading");

let uploadedImages = JSON.parse(localStorage.getItem("uploadedImages")) || [];

function saveToLocalStorage() {
  localStorage.setItem("uploadedImages", JSON.stringify(uploadedImages));
}

async function uploadImageToServer(file) {
  const formData = new FormData();
  formData.append("images", file);

  try {
    const response = await fetch("https://pdftastic.onrender.com/upload-images", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.images) {
      result.images.forEach((img) => {
        uploadedImages.push({
          url: img.url,
          name: img.filename,
          order: uploadedImages.length + 1,
        });
      });
      saveToLocalStorage();
      displayImages();
    }
  } catch (error) {
    console.error("Error uploading image:", error);
  }
}

imageInput.addEventListener("change", async (event) => {
  const files = [...event.target.files];

  for (const file of files) {
    await uploadImageToServer(file);
  }
});

function displayImages() {
  imageContainer.innerHTML = "";
  uploadedImages.sort((a, b) => a.order - b.order);

  uploadedImages.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "image-box";
    div.innerHTML = `
      <span class="image-number">${item.order}</span>
      <img src="${item.url}" alt="Uploaded Image">
      <input type="number" class="image-input" min="1" value="${item.order}" data-index="${index}" onchange="updateOrder(event)">
      <button class="delete-button" onclick="removeImage(${index})">X</button>
    `;
    imageContainer.appendChild(div);
  });
}

function updateOrder(event) {
  const index = parseInt(event.target.dataset.index);
  uploadedImages[index].order = parseInt(event.target.value);
  uploadedImages.sort((a, b) => a.order - b.order);
  saveToLocalStorage();
  displayImages();
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  saveToLocalStorage();
  displayImages();
}

async function generatePDF() {
  loadingIndicator.style.display = "block";

  try {
    const response = await fetch("https://pdftastic.onrender.com/generate-pdf", {
      method: "POST",
    });

    const result = await response.json();
    if (result.url) {
      document.getElementById("pdf-preview").src = result.url;
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    loadingIndicator.style.display = "none";
  }
}

document.querySelector(".clear-images").addEventListener("click", async () => {
  // Remove images from the frontend
  document.getElementById("image-container").innerHTML = "";

  // Send a request to the backend to delete all images
  try {
      const response = await fetch("https://pdftastic.onrender.com/clear-images", {
          method: "DELETE",
      });
      const data = await response.json();
      console.log(data.message);
  } catch (error) {
      console.error("Error clearing images:", error);
  }
});

displayImages();

// Clear images when closing the browser
window.addEventListener("beforeunload", async () => {
  try {
    await fetch("https://pdftastic.onrender.com/clear-images", {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error clearing images on unload:", error);
  }
});


