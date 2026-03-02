module.exports = {
  pdf_options: {
    format: "A4",
    margin: {
      top: "15mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm",
    },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `
      <style>
        .footer { font-size: 10px; color: #555; text-align: center; width: 100%; font-family: sans-serif; }
      </style>
      <div class="footer">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
  },
  css: `
    body {
      font-size: 14px !important;
      line-height: 1.6 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em !important;
      margin-bottom: 0.5em !important;
    }
    pre {
      font-size: 12px !important;
    }
  `,
};
