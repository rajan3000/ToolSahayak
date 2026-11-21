
(() => {
"use strict";

/* =========================
   GLOBAL VARIABLES
========================= */

let reportItems = [];
let selectedFiles = [];
let isExporting = false;
let previewZoom = 1;
let showAllAttachedImages = false;
const ATTACHED_IMAGES_LIMIT = 9;

const $ = id => document.getElementById(id);

const imageInput = $("imageInput");
const addEntriesBtn = $("addEntriesBtn");
const entriesList = $("entriesList");
const previewPages = $("previewPages");
const selectedFilesDisplay = $("selectedFiles");

/* =========================
   IMAGE FILE HANDLING
========================= */

imageInput.addEventListener("change", () => {
  selectedFiles = Array.from(imageInput.files || []);

  selectedFilesDisplay.textContent = selectedFiles.length
    ? selectedFiles.length + " image(s) selected: " + selectedFiles.map(f => f.name).join(", ")
    : "No images selected";
});

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read " + file.name));

    reader.readAsDataURL(file);
  });
}

addEntriesBtn.addEventListener("click", async () => {
  if (isExporting) return;

  if (!selectedFiles.length) {
    alert("Please select at least one image.");
    return;
  }

  const title = $("itemTitle").value.trim();
  const remark = $("itemRemark").value.trim();

  addEntriesBtn.disabled = true;
  addEntriesBtn.textContent = "⏳ Adding images...";

  try {
    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) continue;

      const dataUrl = await readImageFile(file);

      reportItems.push({
        id: (crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random()),
        title,
        remark,
        image: dataUrl,
        filename: file.name
      });
    }

    $("itemTitle").value = "";
    $("itemRemark").value = "";
    imageInput.value = "";
    selectedFiles = [];
    selectedFilesDisplay.textContent = "No images selected";

    renderAll();

  } catch (err) {
    alert("Error adding images: " + err.message);

  } finally {
    addEntriesBtn.disabled = false;
    addEntriesBtn.textContent = "＋ Add Images to Report";
  }
});

/* =========================
   REPORT SETTINGS
========================= */

function getSettings() {
  return {
    rows: Math.max(1, Math.min(10, parseInt($("rowsPerPage").value) || 1)),
    cols: Math.max(1, Math.min(5, parseInt($("colsPerPage").value) || 1)),
    border: $("pageBorder").value,
    fit: $("imageFit").value,
    imageBorder: $("imageBorder").checked,
    header: $("reportHeader").value.trim(),
    footer: $("reportFooter").value.trim(),
    pageNumbers: $("showPageNumbers").checked,
    showDate: $("showDate").checked
  };
}

[
  "rowsPerPage",
  "colsPerPage",
  "pageBorder",
  "imageFit",
  "imageBorder",
  "reportHeader",
  "reportFooter",
  "showPageNumbers",
  "showDate"
].forEach(id => {
  $(id).addEventListener("input", renderAll);
  $(id).addEventListener("change", renderAll);
});

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function splitIntoPages(items, capacity) {
  const pages = [];

  for (let i = 0; i < items.length; i += capacity) {
    pages.push(items.slice(i, i + capacity));
  }

  return pages;
}

function getDateString() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getCapacity(settings) {
  return settings.rows * settings.cols;
}

/* =========================
   PREVIEW ZOOM
========================= */

function updateZoomLabel() {
  const label = $("zoomLevel");

  if (label) {
    label.textContent = Math.round(previewZoom * 100) + "%";
  }
}

function setPreviewZoom(value) {
  previewZoom = Math.max(0.5, Math.min(1.5, value));
  updateZoomLabel();
  scalePreviewPages();
}

$("zoomInBtn").addEventListener("click", () => {
  setPreviewZoom(previewZoom + 0.1);
});

$("zoomOutBtn").addEventListener("click", () => {
  setPreviewZoom(previewZoom - 0.1);
});

$("zoomResetBtn").addEventListener("click", () => {
  setPreviewZoom(1);
});

updateZoomLabel();

/* =========================
   ATTACHED IMAGE LIST
========================= */

function renderEntriesList() {
  if (!reportItems.length) {
    showAllAttachedImages = false;
    entriesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🖼️</div>
        <strong>No images added yet</strong>
        <span>Use the form on the left to add images.</span>
      </div>`;
    return;
  }

  const visibleItems = showAllAttachedImages
    ? reportItems
    : reportItems.slice(0, ATTACHED_IMAGES_LIMIT);

  entriesList.innerHTML = visibleItems.map((item, index) => `
    <div class="entry-row" data-index="${index}">
      <div class="entry-info">
        <div class="entry-title">
          ${index + 1}. ${escapeHTML(item.title || "Untitled Photo")}
        </div>
        <div class="entry-remark">
          ${escapeHTML(item.remark || "No remark")}
        </div>
      </div>

      <img src="${item.image}" alt="${escapeHTML(item.title || "Photo")}">

      <div class="entry-actions">
        <button type="button" class="btn btn-primary" data-action="edit" data-index="${index}">Edit</button>
        <button type="button" class="btn btn-warning" data-action="replace" data-index="${index}">Replace</button>
        <button type="button" class="btn btn-danger" data-action="delete" data-index="${index}">Delete</button>
        <input type="file" class="replace-file" data-index="${index}" accept="image/*" hidden>
      </div>
    </div>
  `).join("");

  // Show More / Show Less button
  if (reportItems.length > ATTACHED_IMAGES_LIMIT) {
    const moreButton = document.createElement("button");

    moreButton.type = "button";
    moreButton.className = "entries-more-btn";

    moreButton.textContent = showAllAttachedImages
      ? "Show Less Images ▲"
      : `Show More Images (${reportItems.length - ATTACHED_IMAGES_LIMIT} more) ▼`;

    moreButton.addEventListener("click", () => {
      showAllAttachedImages = !showAllAttachedImages;
      renderEntriesList();

      if (!showAllAttachedImages) {
        entriesList.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });

    entriesList.appendChild(moreButton);
  }
}

entriesList.addEventListener("click", e => {
  const b = e.target.closest("button[data-action]");

  if (!b) return;

  const i = Number(b.dataset.index);

  if (!reportItems[i]) return;

  if (b.dataset.action === "edit") {
    const item = reportItems[i];

    const title = prompt("Edit photo title:", item.title);
    if (title === null) return;

    const remark = prompt("Edit photo remark:", item.remark || "");
    if (remark === null) return;

    item.title = title.trim();
    item.remark = remark.trim();

    renderAll();

  } else if (b.dataset.action === "delete") {
    if (confirm(`Delete photo ${i + 1} (${reportItems[i].title})?`)) {
      reportItems.splice(i, 1);
      renderAll();
    }

  } else if (b.dataset.action === "replace") {
    b.closest(".entry-actions").querySelector(".replace-file").click();
  }
});

entriesList.addEventListener("change", async e => {
  const input = e.target.closest(".replace-file");

  if (!input) return;

  const file = input.files?.[0];
  const i = Number(input.dataset.index);

  if (!file || !reportItems[i]) return;

  try {
    reportItems[i].image = await readImageFile(file);
    reportItems[i].filename = file.name;

    renderAll();

  } catch (err) {
    alert("Photo replacement failed: " + err.message);

  } finally {
    input.value = "";
  }
});

/* =========================
   CREATE A4 REPORT PAGE
========================= */

function createReportPage(items, pageIndex, totalPages, settings, exportMode = false) {
  const page = document.createElement("div");

  page.className = `report-page ${settings.border} ${settings.fit} ${settings.imageBorder ? "" : "no-image-border"}`;
  page.dataset.page = String(pageIndex + 1);

  page.style.width = "210mm";
  page.style.height = "297mm";

  const header = settings.header
    ? `<div class="report-header">${escapeHTML(settings.header)}</div>`
    : `<div class="report-header" style="padding-top:6mm;padding-bottom:2mm;"></div>`;

  const footerText = [];

  if (settings.footer) footerText.push(escapeHTML(settings.footer));
  if (settings.showDate) footerText.push("Date: " + getDateString());

  const footer = footerText.length
    ? `<div class="report-footer">${footerText.join(" | ")}</div>`
    : `<div class="report-footer"></div>`;

  const pageNumber = settings.pageNumbers
    ? `<div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>`
    : "";

  page.innerHTML = `
    <div class="page-border"></div>

    ${header}

    <div class="report-content"
      style="grid-template-columns:repeat(${settings.cols},minmax(0,1fr));grid-template-rows:repeat(${settings.rows},minmax(0,1fr));">

      ${items.map(item => `
        <div class="report-item">

          <div class="report-image-wrap">
            <img
              class="report-image ${settings.imageBorder ? "" : "no-image-border"}"
              src="${item.image}"
              alt="${escapeHTML(item.title || "Photo")}">
          </div>

          ${item.title
            ? `<div class="report-item-title">${escapeHTML(item.title)}</div>`
            : ""}

          ${item.remark
            ? `<div class="report-remark"><span class="report-remark-label">Remark:</span> ${escapeHTML(item.remark)}</div>`
            : ""}

        </div>
      `).join("")}

    </div>

    ${pageNumber}
    ${footer}
  `;

  if (exportMode) {
    page.style.margin = "0";
    page.style.boxShadow = "none";
  }

  return page;
}

/* =========================
   RENDER PREVIEW
========================= */

function renderPreview() {
  const settings = getSettings();
  const capacity = getCapacity(settings);
  const pages = splitIntoPages(reportItems, capacity);

  $("totalImages").textContent = "Images: " + reportItems.length;
  $("totalPages").textContent = "Pages: " + pages.length;
  $("pageCapacity").textContent = "Per page: " + capacity;
  $("previewPageCount").textContent = pages.length + " page(s)";

  previewPages.innerHTML = "";

  if (!reportItems.length) {
    previewPages.innerHTML = `
      <div class="empty-state" style="background:white;max-width:650px;width:100%;">
        <div class="empty-icon">📄</div>
        <strong>Your A4 report preview will appear here</strong>
        <span>Add images to start creating your report.</span>
      </div>`;

    return;
  }

  pages.forEach((items, index) => {
    previewPages.appendChild(
      createReportPage(items, index, pages.length, settings)
    );
  });

  scalePreviewPages();
}

function scalePreviewPages() {
  const area = document.querySelector(".preview-area");
  const pages = document.querySelectorAll(".report-page");

  if (!area || !pages.length) return;

  const availableWidth = Math.max(200, area.clientWidth - 24);
  const pageWidth = 794;

  const fitScale = Math.min(1, availableWidth / pageWidth);
  const scale = fitScale * previewZoom;

  pages.forEach(page => {
    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = "top center";

    page.style.marginBottom =
      `${-(297 * (1 - scale))}mm`;
  });
}

function renderAll() {
  renderEntriesList();
  renderPreview();
}

$("refreshPreviewBtn").addEventListener("click", renderAll);
window.addEventListener("resize", scalePreviewPages);

/* =========================
   BUILD EXPORT PAGES
   PDF IMAGE VISIBILITY FIX
========================= */

function buildExportPages() {
  const settings = getSettings();

  const pages = splitIntoPages(
    reportItems,
    getCapacity(settings)
  );

  const wrapper = document.createElement("div");

  /*
    IMPORTANT:
    Keep export pages inside the visible browser area.
    html2canvas can fail to capture content positioned
    far outside the viewport.
  */

  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.width = "210mm";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "999999";
  wrapper.style.display = "block";
  wrapper.style.visibility = "visible";
  wrapper.style.opacity = "1";
  wrapper.style.pointerEvents = "none";

  pages.forEach((items, index) => {
    const page = createReportPage(
      items,
      index,
      pages.length,
      settings,
      true
    );

    page.style.width = "210mm";
    page.style.minWidth = "210mm";
    page.style.height = "297mm";
    page.style.minHeight = "297mm";
    page.style.maxHeight = "297mm";
    page.style.transform = "none";
    page.style.transformOrigin = "top left";
    page.style.margin = "0";
    page.style.boxShadow = "none";
    page.style.background = "#ffffff";
    page.style.visibility = "visible";
    page.style.opacity = "1";
    page.style.overflow = "hidden";

    page.style.breakAfter =
      index < pages.length - 1 ? "page" : "auto";

    page.style.pageBreakAfter =
      index < pages.length - 1 ? "always" : "auto";

    page.querySelectorAll("img").forEach(img => {
      img.loading = "eager";
      img.decoding = "sync";
      img.style.display = "block";
      img.style.visibility = "visible";
      img.style.opacity = "1";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
    });

    wrapper.appendChild(page);
  });

  document.body.appendChild(wrapper);

  return wrapper;
}

/* =========================
   WAIT FOR ALL IMAGES
========================= */

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"));

  if (!images.length) {
    throw new Error("No photos found in the report.");
  }

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    if (!img.src) {
      throw new Error("Photo " + (i + 1) + " has no image source.");
    }

    img.loading = "eager";

    try {
      if (typeof img.decode === "function") {
        await img.decode();
      } else {
        await new Promise((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }

          img.onload = resolve;
          img.onerror = () => reject(
            new Error("Photo " + (i + 1) + " could not load.")
          );
        });
      }
    } catch (error) {
      throw new Error(
        "Photo " + (i + 1) + " could not load or decode. Please add it again."
      );
    }

    if (!img.complete || img.naturalWidth === 0) {
      throw new Error(
        "Photo " + (i + 1) + " is not ready for PDF export."
      );
    }
  }

  return true;
}


/* =========================
   PDF EXPORT - DIRECT IMAGE RENDERING
   Does not use html2canvas
========================= */

function loadImageForPdf(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error("Invalid image dimensions."));
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("A report photo could not be loaded."));
    };

    img.src = dataUrl;
  });
}

function getPdfImageData(img, widthMm, heightMm, fitMode) {
  const scale = 5;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthMm * scale));
  canvas.height = Math.max(1, Math.round(heightMm * scale));

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not prepare photo for PDF.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boxWidth = canvas.width;
  const boxHeight = canvas.height;

  const imageRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = boxWidth / boxHeight;

  if (fitMode === "fit-cover") {
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imageRatio > boxRatio) {
      sw = img.naturalHeight * boxRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / boxRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.drawImage(
      img,
      sx, sy, sw, sh,
      0, 0, boxWidth, boxHeight
    );

  } else {
    const ratio = Math.min(
      boxWidth / img.naturalWidth,
      boxHeight / img.naturalHeight
    );

    const drawWidth = img.naturalWidth * ratio;
    const drawHeight = img.naturalHeight * ratio;

    const x = (boxWidth - drawWidth) / 2;
    const y = (boxHeight - drawHeight) / 2;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
  }

  return canvas.toDataURL("image/jpeg", 0.95);
}

function drawPdfPageBorder(pdf, borderStyle) {
  const styles = {
    "border-thin": { width: 0.4, color: "#333333" },
    "border-medium": { width: 1.1, color: "#222222" },
    "border-thick": { width: 2.2, color: "#111111" },
    "border-double": { width: 1.2, color: "#222222" }
  };

  const style = styles[borderStyle];

  if (!style) return;

  pdf.setDrawColor(style.color);
  pdf.setLineWidth(style.width);
  pdf.rect(8, 8, 194, 281);

  if (borderStyle === "border-double") {
    pdf.setLineWidth(0.4);
    pdf.rect(10, 10, 190, 277);
  }
}

function drawPdfText(pdf, text, x, y, maxWidth, fontSize, align = "left") {
  pdf.setFontSize(fontSize);
  pdf.setTextColor(30, 30, 30);

  const lines = pdf.splitTextToSize(String(text || ""), maxWidth);

  pdf.text(lines, x, y, {
    align,
    baseline: "top"
  });

  return lines.length;
}

async function generateDirectPdf() {
  const jsPDFClass = window.jspdf && window.jspdf.jsPDF;

  if (!jsPDFClass) {
    throw new Error(
      "jsPDF library not found. Please check your HTML library scripts."
    );
  }

  const settings = getSettings();

  const pages = splitIntoPages(
    reportItems,
    getCapacity(settings)
  );

  const pdf = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  const marginX = 13;
  const contentWidth = PAGE_WIDTH - marginX * 2;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    const pageItems = pages[pageIndex];

    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

    // Page border
    drawPdfPageBorder(pdf, settings.border);

    // Header
    let contentTop = 10;

    if (settings.header) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(20, 20, 20);

      const headerLines = pdf.splitTextToSize(
        settings.header,
        contentWidth
      );

      pdf.text(headerLines, PAGE_WIDTH / 2, 15, {
        align: "center"
      });

      contentTop = Math.max(25, 15 + headerLines.length * 6 + 4);
    }

    // Footer reserved space
    const footerRequired =
      settings.footer || settings.showDate || settings.pageNumbers;

    const contentBottom = footerRequired ? 275 : 285;
    const contentHeight = contentBottom - contentTop;

    const gap = 4;
    const cellWidth =
      (contentWidth - gap * (settings.cols - 1)) / settings.cols;

    const cellHeight =
      (contentHeight - gap * (settings.rows - 1)) / settings.rows;

    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];

      const row = Math.floor(i / settings.cols);
      const col = i % settings.cols;

      const x = marginX + col * (cellWidth + gap);
      const y = contentTop + row * (cellHeight + gap);

      // Cell border - controlled by Image Border setting
        if (settings.imageBorder) {
          pdf.setDrawColor(184, 184, 184);
          pdf.setLineWidth(0.25);
          pdf.rect(x, y, cellWidth, cellHeight);
        }

      // =========================
        // IMAGE, TITLE & REMARK
        // Title will appear below image
        // =========================

        const titleLines = [];

        if (item.title) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);

          const lines = pdf.splitTextToSize(
            item.title,
            cellWidth - 6
          );

          titleLines.push(...lines.slice(0, 2));
        }

        // Title height (below image)
        const titleHeight = titleLines.length
          ? Math.max(8, titleLines.length * 4 + 2)
          : 0;

        // Remark area
        let remarkHeight = 0;
        let remarkLines = [];

        if (item.remark) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);

          remarkLines = pdf.splitTextToSize(
            "Remark: " + item.remark,
            cellWidth - 5
          );

          remarkLines = remarkLines.slice(0, 4);

          remarkHeight = Math.max(
            7,
            remarkLines.length * 3.5 + 3
          );
        }

        // Image area
        const imageX = x + 2;
        const imageY = y + 2;
        const imageWidth = cellWidth - 4;

        const imageHeight = Math.max(
          5,
          cellHeight - titleHeight - remarkHeight - 6
        );

        // Load and draw image
        const img = await loadImageForPdf(item.image);

        const imageData = getPdfImageData(
          img,
          imageWidth,
          imageHeight,
          settings.fit
        );

        pdf.addImage(
          imageData,
          "JPEG",
          imageX,
          imageY,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
        );

        // =========================
        // TITLE BELOW IMAGE
        // =========================

        if (titleLines.length) {
          const titleY = imageY + imageHeight + 1;

          // Title background
          pdf.setFillColor(243, 244, 246);
          pdf.rect(
            x + 2,
            titleY,
            cellWidth - 4,
            titleHeight,
            "F"
          );

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(25, 25, 25);

          pdf.text(
            titleLines,
            x + cellWidth / 2,
            titleY + titleHeight / 2,
            {
              align: "center",
              baseline: "middle"
            }
          );
        }

        // =========================
        // REMARK BELOW TITLE
        // =========================

        if (remarkLines.length) {
          const remarkY = y + cellHeight - remarkHeight + 2;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(40, 40, 40);

          pdf.text(
            remarkLines,
            x + 2,
            remarkY,
            { baseline: "top" }
          );
        }

      // Remark text
      if (remarkLines.length) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(40, 40, 40);

        pdf.text(
          remarkLines,
          x + 2,
          y + cellHeight - remarkHeight + 2,
          { baseline: "top" }
        );
      }
    }

    // Page number and footer
    const footerParts = [];

    if (settings.footer) footerParts.push(settings.footer);
    if (settings.showDate) footerParts.push("Date: " + getDateString());

    if (settings.pageNumbers) {
      // Page number is displayed separately.
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);

      pdf.text(
        "Page " + (pageIndex + 1) + " of " + pages.length,
        PAGE_WIDTH - 14,
        280,
        { align: "right" }
      );
    }

    if (footerParts.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 60);

      pdf.text(
        pdf.splitTextToSize(footerParts.join(" | "), contentWidth),
        PAGE_WIDTH / 2,
        286,
        { align: "center" }
      );
    }
  }

  pdf.setProperties({
    title: "Photo Report",
    subject: "A4 Photo Documentation Report",
    creator: "Photo Report Maker"
});

// PDF open at 100% zoom
pdf.setDisplayMode(1, "continuous", "UseNone");

  pdf.save(
    "Photo-Report-" +
    new Date().toISOString().slice(0, 10) +
    ".pdf"
  );
}

$("downloadPdfBtn").addEventListener("click", async () => {
  if (!reportItems.length) {
    alert("Please add images to your report first.");
    return;
  }

  if (isExporting) return;

  isExporting = true;

  const button = $("downloadPdfBtn");
  const original = button.textContent;

  button.disabled = true;
  button.textContent = "⏳ Preparing photos...";

  try {
    await generateDirectPdf();

  } catch (err) {
    console.error("Direct PDF export error:", err);

    alert(
      "PDF generation failed:\n\n" +
      (err.message || "Unknown error") +
      "\n\nPlease check the browser console."
    );

  } finally {
    isExporting = false;
    button.disabled = false;
    button.textContent = original;
  }
});




/* =========================
   WORD EXPORT - REAL DOCX
   PDF CODE REMAINS UNCHANGED
========================= */

function loadImageForWord(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error("Invalid image dimensions."));
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("A report photo could not be loaded."));
    };

    img.src = dataUrl;
  });
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];

  if (!base64) {
    throw new Error("Invalid image data.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function createWordImage(
  item,
  maxWidth,
  maxHeight,
  ImageRun,
  showBorder = true
) {
  const img = await loadImageForWord(item.image);

  // Maintain original image aspect ratio
  const ratio = Math.min(
    maxWidth / img.naturalWidth,
    maxHeight / img.naturalHeight,
    1
  );

  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));

  let imageData = dataUrlToUint8Array(item.image);

  let mime = item.image.substring(
    item.image.indexOf(":") + 1,
    item.image.indexOf(";")
  );

  let imageType = mime.toLowerCase().includes("png")
    ? "png"
    : "jpg";

  // Add optional border to image itself
  if (showBorder) {
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not prepare Word image.");
    }

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Draw border inside image bounds
    ctx.strokeStyle = "#505050";
    ctx.lineWidth = Math.max(1, Math.round(width / 500));
    ctx.strokeRect(
      0,
      0,
      width - ctx.lineWidth,
      height - ctx.lineWidth
    );

    // Convert to PNG with border
    const borderedDataUrl = canvas.toDataURL("image/png");

    imageData = dataUrlToUint8Array(borderedDataUrl);
    imageType = "png";
  }

  return new ImageRun({
    data: imageData,
    transformation: {
      width,
      height
    },
    type: imageType
  });
}

async function generateWordDocument() {
  if (!window.docx) {
    throw new Error(
      "DOCX library not found. Please check the docx script in HTML."
    );
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    VerticalAlign,
    BorderStyle,
    PageBreak
  } = window.docx;

  const settings = getSettings();

  const pages = splitIntoPages(
    reportItems,
    getCapacity(settings)
  );

  const pageWidth = 11906;
  const pageHeight = 16838;

  const margin = 720;

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const columnWidth = Math.floor(
    contentWidth / settings.cols
  );

  const maxImageWidth = Math.max(
    40,
    Math.floor(columnWidth / 15) - 20
  );

  const maxImageHeight = Math.max(
    40,
    Math.floor(contentHeight / settings.rows / 15) - 65
  );

  const border = {
    top: {
      style: BorderStyle.SINGLE,
      size: 4,
      color: "999999"
    },
    bottom: {
      style: BorderStyle.SINGLE,
      size: 4,
      color: "999999"
    },
    left: {
      style: BorderStyle.SINGLE,
      size: 4,
      color: "999999"
    },
    right: {
      style: BorderStyle.SINGLE,
      size: 4,
      color: "999999"
    }
  };

  const children = [];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageItems = pages[pageIndex];

    // Start each report page on a new Word page
    if (pageIndex > 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      );
    }

    // Header
    if (settings.header) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: settings.header,
              bold: true,
              size: 28
            })
          ]
        })
      );
    }

    const tableRows = [];

    for (let i = 0; i < pageItems.length; i += settings.cols) {
      const rowItems = pageItems.slice(
        i,
        i + settings.cols
      );

      const cells = [];

      for (let col = 0; col < settings.cols; col++) {
        const item = rowItems[col];

        if (!item) {
          cells.push(
            new TableCell({
              width: {
                size: columnWidth,
                type: WidthType.DXA
              },
              borders: border,
              children: [
                new Paragraph({ children: [] })
              ]
            })
          );

          continue;
        }

        const wordImage = await createWordImage(
          item,
          maxImageWidth,
          maxImageHeight,
          ImageRun,
          settings.imageBorder
        );

        const cellContent = [];

        // Embedded image with fixed dimensions
        cellContent.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 100
            },
            children: [wordImage]
          })
        );

        // Photo title BELOW image (optional)
              if (item.title) {
                cellContent.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: {
                      before: 80,
                      after: 120
                    },
                    children: [
                      new TextRun({
                        text: item.title,
                        bold: true,
                        size: 20
                      })
                    ]
                  })
                );
              }

        // Remark
        if (item.remark) {
          cellContent.push(
            new Paragraph({
              spacing: {
                before: 60,
                after: 80
              },
              children: [
                new TextRun({
                  text: "Remark: ",
                  bold: true,
                  size: 18
                }),
                new TextRun({
                  text: item.remark,
                  size: 18
                })
              ]
            })
          );
        }

        cells.push(
          new TableCell({
            width: {
              size: columnWidth,
              type: WidthType.DXA
            },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            },
            verticalAlign: VerticalAlign.TOP,
            borders: border,
            children: cellContent
          })
        );
      }

      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: cells
        })
      );
    }

    // Photo grid
    children.push(
      new Table({
        width: {
          size: contentWidth,
          type: WidthType.DXA
        },
        columnWidths: Array(settings.cols).fill(columnWidth),
        layout: window.docx.TableLayoutType.FIXED,
        rows: tableRows
      })
    );

    // Footer
    const footerParts = [];

    if (settings.footer) {
      footerParts.push(settings.footer);
    }

    if (settings.showDate) {
      footerParts.push("Date: " + getDateString());
    }

    if (settings.pageNumbers) {
      footerParts.push(
        "Page " + (pageIndex + 1) + " of " + pages.length
      );
    }

    if (footerParts.length) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 240
          },
          children: [
            new TextRun({
              text: footerParts.join(" | "),
              size: 18
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidth,
              height: pageHeight
            },
            margin: {
              top: margin,
              right: margin,
              bottom: margin,
              left: margin
            }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;

  link.download =
    "Photo-Report-" +
    new Date().toISOString().slice(0, 10) +
    ".docx";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
}

$("downloadDocBtn").addEventListener("click", async () => {
  if (!reportItems.length) {
    alert("Please add images to your report first.");
    return;
  }

  if (isExporting) return;

  isExporting = true;

  const button = $("downloadDocBtn");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "Preparing DOCX document...";

  try {
    await generateWordDocument();

  } catch (error) {
    console.error("Word export error:", error);

    alert(
      "Word export failed:\n\n" +
      (error.message || "Unknown error") +
      "\n\nPlease check the browser console."
    );

  } finally {
    isExporting = false;
    button.disabled = false;
    button.textContent = originalText;
  }
});



/* =========================
   INITIALIZE
========================= */

renderAll();

})();

