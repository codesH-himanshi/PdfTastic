const imageInput = document.getElementById("image-input");
const imageContainer = document.getElementById("image-container");
const loadingIndicator = document.getElementById("loading");
let uploadedImages = JSON.parse(localStorage.getItem("uploadedImages")) || [];

function saveToLocalStorage() {
  localStorage.setItem("uploadedImages", JSON.stringify(uploadedImages));
}

imageInput.addEventListener("change", (event) => {
  const files = [...event.target.files];

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages.push({
        dataUrl: e.target.result, // Store image as base64 Data URL
        name: file.name, // Store file name for reference
        order: uploadedImages.length + 1, // Keep previous order intact
        file: file // Store the actual file for later uploads
      });
      saveToLocalStorage();
      displayImages();
    };
    reader.readAsDataURL(file);
  });
});


function displayImages() {
  imageContainer.innerHTML = "";
  uploadedImages.sort((a, b) => a.order - b.order);
  uploadedImages.forEach((item, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "image-box";
      div.innerHTML = `
                        <span class="image-number">${item.order}</span>
                        <img src="${e.target.result}" alt="Uploaded Image">
                        <input type="number" class="image-input" min="1" value="${item.order}" data-index="${index}" onchange="updateOrder(event)">
                        <button class="delete-button" onclick="removeImage(${index})">X</button>
                    `;
      imageContainer.appendChild(div);
    };
    reader.readAsDataURL(item.file);
  });
}

function updateOrder(event) {
  const index = parseInt(event.target.dataset.index);
  uploadedImages[index].order = parseInt(event.target.value);
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
  const formData = new FormData();

  uploadedImages.forEach((item, index) => {
    if (item.file) {
      formData.append("images", item.file); 
    } else {
      // Recreate File object from base64 if file was lost
      const byteCharacters = atob(item.dataUrl.split(",")[1]);
      const byteArrays = [];
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
      }
      const byteArray = new Uint8Array(byteArrays);
      const recreatedFile = new File([byteArray], item.name, { type: "image/jpeg" });
      formData.append("images", recreatedFile);
    }
  });

  const response = await fetch("https://pdftastic.onrender.com/generate-pdf", {
    method: "POST",
    body: formData,
  });
  const result = await response.json();

  if (result.url) {
    document.getElementById("pdf-preview").src = 'https://pdftastic.onrender.com/output.pdf';
  }
  loadingIndicator.style.display = "none";
}

displayImages();
