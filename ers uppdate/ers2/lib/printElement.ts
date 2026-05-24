export const printElementById = (elementId: string, title = "Statement") => {
  const source = document.getElementById(elementId);
  if (!source) return;

  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return;

  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => node.outerHTML)
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          body > * {
            max-width: 100% !important;
          }
          [id*="print"],
          [id*="print"] * {
            overflow: visible !important;
          }
          .overflow-y-auto,
          .overflow-x-hidden {
            overflow: visible !important;
          }
          .h-\\[60vh\\] {
            height: auto !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          th,
          td {
            box-sizing: border-box !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            white-space: normal !important;
            padding-left: 3px !important;
            padding-right: 3px !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          tfoot td {
            font-size: 8px !important;
          }
          [class*="max-w-\\[800px\\]"],
          .max-w-\\[800px\\],
          [class*="max-w-"] {
            max-width: 100% !important;
          }
          .w-full {
            width: 100% !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        </style>
      </head>
      <body>${source.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  let hasPrinted = false;
  const doPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  printWindow.onload = doPrint;
  window.setTimeout(doPrint, 500);
};
