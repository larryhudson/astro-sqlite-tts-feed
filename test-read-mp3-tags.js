import NodeID3 from "node-id3";

const TEST_MP3_PATH = "./static/articles/f17801aaba85885ee09aef6c6a7f8ca8.mp3";

async function main() {
  const tags = NodeID3.read(TEST_MP3_PATH);

  console.log(tags);
}

main();
