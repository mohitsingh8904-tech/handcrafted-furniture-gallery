
"use strict";

const STORAGE_KEY = "furniture-studio-collection-v1";

const $ = (selector) => document.querySelector(selector);

const form = $("#furniture-form");
const nameInput = $("#name");
const categoryInput = $("#category");
const priceInput = $("#price");
const materialInput = $("#material");
const descriptionInput = $("#description");
const furnitureIdInput = $("#furniture-id");
const formTitle = $("#form-title");
const saveButton = $("#save-button");
const addToggle = $("#add-toggle");
const searchInput = $("#search");
const categoryFilter = $("#filter-category");
const furnitureList = $("#furniture-list");
const emptyState = $("#empty-state");
const loading = $("#loading");
const resultsCount = $("#results-count");
const formMessage = $("#form-message");
const toast = $("#toast");

const errorFields = {
  name: $("#name-error"),
  category: $("#category-error"),
  price: $("#price-error"),
  material: $("#material-error")
};

const allowedCategories = [
  "Chair", "Table", "Sofa", "Bed", "Cabinet", "Other"
];

const starterFurniture = [
  {
    id: "sample-1",
    name: "Oak Lounge Chair",
    category: "Chair",
    price: 12500,
    material: "Solid oak",
    description: "A timeless chair with a handcrafted wooden frame."
  },
  {
    id: "sample-2",
    name: "Workshop Dining Table",
    category: "Table",
    price: 28500,
    material: "Walnut wood",
    description: "A warm, sturdy table made for everyday gatherings."
  },
  {
    id: "sample-3",
    name: "Classic Storage Cabinet",
    category: "Cabinet",
    price: 19800,
    material: "Sheesham wood",
    description: "Practical storage with understated craftsmanship."
  }
];

let furniture = [];
let toastTimer;
let loadingTimer;
let operationNumber = 0;

function analytics(action) {
  console.log(
    "[Analytics] User interacted with Handcrafted Furniture Workshop Gallery",
    { action }
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
  furnitureList.setAttribute("aria-busy", String(isLoading));
}

function safeReadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      furniture = starterFurniture.map(item => ({ ...item }));
      saveStorage();
      return;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Stored collection is not an array.");
    }

    furniture = parsed.filter(isValidStoredItem);
  } catch (error) {
    console.error("Unable to read saved furniture:", error);
    furniture = starterFurniture.map(item => ({ ...item }));
    showToast("Saved data could not be loaded. Using sample data.");
  }
}

function isValidStoredItem(item) {
  return item &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    allowedCategories.includes(item.category) &&
    typeof item.material === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    item.price <= 100000000 &&
    typeof item.description === "string";
}

function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(furniture));
    return true;
  } catch (error) {
    console.error("Unable to save furniture:", error);
    showToast("Could not save data. Check browser storage.");
    return false;
  }
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}

function updateStats() {
  $("#total-count").textContent = String(furniture.length);

  const categories = new Set(furniture.map(item => item.category));
  $("#category-count").textContent = String(categories.size);

  const total = furniture.reduce((sum, item) => sum + item.price, 0);
  $("#total-value").textContent = formatPrice(total);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    // Use textContent, never insert user data as HTML.
    element.textContent = text;
  }

  return element;
}

function createFurnitureCard(item) {
  const card = createElement("article", "furniture-card");
  const top = createElement("div", "card-top");
  const tag = createElement("span", "category-tag", item.category);
  const name = createElement("h3", "card-name", item.name);
  const material = createElement("p", "card-material", item.material);
  const description = createElement(
    "p",
    "card-description",
    item.description || "No description provided."
  );
  const price = createElement("p", "card-price", formatPrice(item.price));
  const actions = createElement("div", "card-actions");

  top.append(tag);
  card.append(top, name, material, description, price);

  const editButton = createElement("button", "", "Edit");
  editButton.type = "button";
  editButton.setAttribute("aria-label", `Edit ${item.name}`);
  editButton.addEventListener("click", () => editFurniture(item.id));

  const deleteButton = createElement("button", "", "Delete");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${item.name}`);
  deleteButton.addEventListener("click", () => deleteFurniture(item.id));

  actions.append(editButton, deleteButton);
  card.append(actions);

  return card;
}

function getFilteredFurniture() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categoryFilter.value;

  return furniture.filter(item => {
    const matchesQuery = [
      item.name,
      item.category,
      item.material,
      item.description
    ].some(value => value.toLocaleLowerCase().includes(query));

    const matchesCategory = !category || item.category === category;

    return matchesQuery && matchesCategory;
  });
}

function renderFurniture() {
  const currentOperation = ++operationNumber;

  clearTimeout(loadingTimer);
  setLoading(true);
  emptyState.hidden = true;
  resultsCount.textContent = "";

  // Simulates an asynchronous operation for loading-state testing.
  loadingTimer = setTimeout(() => {
    if (currentOperation !== operationNumber) return;

    const items = getFilteredFurniture();
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      fragment.append(createFurnitureCard(item));
    });

    furnitureList.replaceChildren(fragment);
    emptyState.hidden = items.length !== 0;

    resultsCount.textContent =
      `${items.length} ${items.length === 1 ? "piece" : "pieces"} found`;

    setLoading(false);
  }, 1500);
}

function clearErrors() {
  Object.entries(errorFields).forEach(([key, element]) => {
    element.textContent = "";

    const input = $(`#${key}`);
    input.removeAttribute("aria-invalid");
  });

  formMessage.textContent = "";
}

function setFieldError(fieldName, message) {
  const input = $(`#${fieldName}`);

  errorFields[fieldName].textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function validateForm() {
  clearErrors();

  let firstInvalid = null;

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const priceText = priceInput.value.trim();
  const material = materialInput.value.trim();
  const price = Number(priceText);

  const checks = [
    [
      "name",
      name.length >= 2 && name.length <= 80,
      "Enter a name between 2 and 80 characters."
    ],
    [
      "category",
      allowedCategories.includes(category),
      "Choose a valid category."
    ],
    [
      "price",
      priceText !== "" &&
        Number.isFinite(price) &&
        price > 0 &&
        price <= 100000000,
      "Enter a price greater than ₹0 and at most ₹10 crore."
    ],
    [
      "material",
      material.length >= 2 && material.length <= 60,
      "Enter a material between 2 and 60 characters."
    ]
  ];

  checks.forEach(([key, valid, message]) => {
    if (!valid) {
      setFieldError(key, message);

      if (!firstInvalid) {
        firstInvalid = $(`#${key}`);
      }
    }
  });

  if (firstInvalid) {
    formMessage.textContent = "Please correct the highlighted fields.";
    firstInvalid.focus();
    return null;
  }

  return {
    name,
    category,
    price,
    material,
    description: descriptionInput.value.trim()
  };
}

function resetForm() {
  form.reset();
  furnitureIdInput.value = "";
  clearErrors();
  formTitle.textContent = "Add a new piece";
  saveButton.textContent = "Save furniture";
}

function openForm() {
  form.hidden = false;
  addToggle.setAttribute("aria-expanded", "true");
  nameInput.focus();
}

function closeForm() {
  form.hidden = true;
  addToggle.setAttribute("aria-expanded", "false");
  resetForm();
  addToggle.focus();
}

function editFurniture(id) {
  const item = furniture.find(entry => entry.id === id);
  if (!item) return;

  furnitureIdInput.value = item.id;
  nameInput.value = item.name;
  categoryInput.value = item.category;
  priceInput.value = String(item.price);
  materialInput.value = item.material;
  descriptionInput.value = item.description;

  formTitle.textContent = "Edit furniture";
  saveButton.textContent = "Update furniture";

  openForm();
  analytics("edit");
}

function deleteFurniture(id) {
  const item = furniture.find(entry => entry.id === id);
  if (!item) return;

  if (!window.confirm(`Delete "${item.name}" from the collection?`)) {
    return;
  }

  const updated = furniture.filter(entry => entry.id !== id);
  const previous = furniture;
  furniture = updated;

  if (!saveStorage()) {
    furniture = previous;
    return;
  }

  updateStats();
  renderFurniture();
  showToast("Furniture deleted successfully.");
  analytics("delete");
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const itemData = validateForm();
  if (!itemData) return;

  const existingId = furnitureIdInput.value;
  const isEditing = Boolean(existingId);

  const updated = isEditing
    ? furniture.map(item =>
        item.id === existingId ? { ...item, ...itemData } : item
      )
    : [...furniture, { id: createId(), ...itemData }];

  const previous = furniture;
  furniture = updated;

  if (!saveStorage()) {
    furniture = previous;
    return;
  }

  updateStats();
  resetForm();
  closeForm();
  renderFurniture();

  showToast(isEditing
    ? "Furniture updated successfully."
    : "Furniture added successfully.");

  analytics(isEditing ? "update" : "create");
});

addToggle.addEventListener("click", () => {
  if (form.hidden) {
    resetForm();
    openForm();
  } else {
    closeForm();
  }

  analytics("toggle-form");
});

$("#cancel-edit").addEventListener("click", closeForm);

searchInput.addEventListener("input", () => {
  renderFurniture();
  analytics("search");
});

categoryFilter.addEventListener("change", () => {
  renderFurniture();
  analytics("filter");
});

$("#reset-search").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "";
  renderFurniture();
  searchInput.focus();
  analytics("clear-filters");
});

[nameInput, categoryInput, priceInput, materialInput].forEach(input => {
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true") {
      clearErrors();
    }
  });
});

function initializeApp() {
  safeReadStorage();
  updateStats();
  renderFurniture();
}

$("#nav-add").addEventListener("click", () => {
  if (form.hidden) {
    resetForm();
    openForm();
  }

  analytics("sidebar-add-furniture");
});

initializeApp();
