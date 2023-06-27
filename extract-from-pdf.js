import {PDFExtract} from "pdf.js-extract";

function logTextLinesWithDifferences(textObjects) {
  const thresholdX = 2; // Minimum difference in X value to insert space
  const thresholdY = 5; // Minimum difference in Y value to insert new line
  const paragraphThresholdY = 15; // Minimum difference in Y value to insert paragraph break

  let currentLine = '';
  let previousText = null;

  for (let i = 0; i < textObjects.length; i++) {
    const currentText = textObjects[i];

    if (previousText) {
      const xDifference = currentText.x - previousText.x;
      const yDifference = currentText.y - previousText.y;

      if (xDifference >= thresholdX) {
        currentLine += ' ';
      }

      if (yDifference >= paragraphThresholdY) {
        console.log(`Line: ${currentLine}`);
        console.log(`X Difference: ${xDifference}`);
        console.log(`Y Difference: ${yDifference}`);
        console.log('---');
        currentLine = '';
      } else if (yDifference >= thresholdY) {
        console.log(`Line: ${currentLine}`);
        console.log(`X Difference: ${xDifference}`);
        console.log(`Y Difference: ${yDifference}`);
        console.log('---');
        currentLine = '';
      }
    }

    currentLine += currentText.str;
    previousText = currentText;
  }

  // Log the last line if any
  if (currentLine !== '') {
    console.log(`Line: ${currentLine}`);
    console.log('---');
  }
}

function joinTextObjects(textObjects) {
  const thresholdX = 10; // Minimum difference in X value to insert space
  const thresholdY = 10; // Minimum difference in Y value to insert new line
  const paragraphThresholdY = 15; // Minimum difference in Y value to insert paragraph break

  let joinedText = '';

  for (let i = 0; i < textObjects.length; i++) {
    const currentText = textObjects[i];
    const previousText = textObjects[i - 1];

    if (previousText) {
      const xDifference = currentText.x - previousText.x;
      const yDifference = currentText.y - previousText.y;

      if (xDifference >= thresholdX) {
        joinedText += ' ';
      } else if (yDifference >= paragraphThresholdY) {
        joinedText += '\n\n';
      } else if (yDifference >= thresholdY) {
        joinedText += '\n';
      }
    }

    joinedText += currentText.str;
  }

  return joinedText;
}
async function extractTextFromPdf(pdfPath) {
	const pdfExtract = new PDFExtract();
	const pdfData = await pdfExtract.extract(pdfPath);

	console.log(pdfData);
	const pagesWithContent = pdfData.pages.filter(page => page.content.length > 0);

	const first5Pages = pagesWithContent.slice(0,10);

	first5Pages.forEach(page => {
		const contentItems = page.content;
		console.log("content items");
		console.log(contentItems);
		const pageText = logTextLinesWithDifferences(contentItems);
		console.log(pageText);
	});

}

const pdfPath = './test-pdf/Scott Jehl - Responsible Responsive Design-A Book Apart (2014).pdf';
extractTextFromPdf(pdfPath);
