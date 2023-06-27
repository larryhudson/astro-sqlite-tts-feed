import fs from 'fs';
import path from "path";
import unzipper from 'unzipper';
import {convert} from 'html-to-text';
import glob from 'fast-glob';

async function findHTMLFiles(directory) {
  const filePatterns = ['**/*.html', '**/*.xhtml'];
  const options = {
    cwd: directory,
    absolute: true,
    onlyFiles: true
  };

  const htmlFiles = await glob(filePatterns, options);
  return htmlFiles;
}

async function extractTextFromEPUB(epubFilePath) {
  try {
    const tempDirectory = './epub_temp';
    if (!fs.existsSync(tempDirectory)) {
      fs.mkdirSync(tempDirectory);
    }

    const epubFilename = path.basename(epubFilePath)
    const epubTxtDirectory = path.resolve(epubFilename + "_txt");

    fs.rmdirSync(epubTxtDirectory, { recursive: true }); 

    await fs.promises.mkdir(epubTxtDirectory);

    await fs.createReadStream(epubFilePath)
      .pipe(unzipper.Extract({ path: tempDirectory }))
      .promise();

    const htmlFiles = await findHTMLFiles(tempDirectory);

    const chapterTexts = await Promise.all(
      htmlFiles.map(async (htmlFile) => {
        const htmlContent = await fs.promises.readFile(htmlFile, 'utf8');
        const plainText = convert(htmlContent, {wordwrap: 0, selectors: [
          {selector: 'a', options: { ignoreHref: true }},
          {selector: 'h1', options: { uppercase: false, prefix: 'Heading', }},
          {selector: 'h2', options: { uppercase: false, prefix: 'Heading' }},
          {selector: 'h3', options: { uppercase: false, prefix: 'Heading' }},
          {selector: 'h4', options: { uppercase: false, prefix: 'Heading' }},
          {selector: 'img', format: 'skip' },
        ]});
        return plainText;
      })
    );

    await Promise.all(
      chapterTexts.map(async (chapterText, index) => {
        const txtFilePath = path.join(epubTxtDirectory, `chapter_${index}.txt`)
        await fs.promises.writeFile(txtFilePath, chapterText);
      })
    )

    fs.rmdirSync(tempDirectory, { recursive: true });

    return chapterTexts;
  } catch (error) {
    console.error('Error extracting text from EPUB:', error);
    return [];
  }
}

// Example usage:
const epubFilePath = './test-epub/a_game_of_our_own.epub';

async function main() {

  const chapterTexts = await extractTextFromEPUB(epubFilePath)
  chapterTexts.forEach((chapterText, index) => {
    console.log(`Chapter ${index + 1}`);
    console.log(`Chars: ${chapterText.length}`);
    console.log(chapterText.slice(0,1000));
  });
}

main();
