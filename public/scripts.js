const imageInput = document.getElementById("image-input");
const imageContainer = document.getElementById("image-container");
const loadingIndicator = document.getElementById("loading");
let uploadedImages = JSON.parse(localStorage.getItem("uploadedImages")) || [];

function saveToLocalStorage() {
  localStorage.setItem("uploadedImages", JSON.stringify(uploadedImages));
}

imageInput.addEventListener("change", (event) => {
  uploadedImages = [...event.target.files].map((file, index) => ({
    file,
    order: index + 1,
  }));
  saveToLocalStorage();
  displayImages();
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
  uploadedImages.forEach((item) => formData.append("images", item.file));

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
