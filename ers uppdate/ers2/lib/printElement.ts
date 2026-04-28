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
            padding: 24px;
            background: #ffffff;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        </style>
      </head>
      <body>${source.innerHTML}</body>
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
