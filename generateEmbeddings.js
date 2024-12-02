require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { TwelveLabs } = require("twelvelabs-js");

const TWELVE_LABS_API_KEY = process.env.TWELVE_LABS_API_KEY;
const FOOTAGES_DIR = "/Users/Miranda/twelveLabs/sampleData/footages";
// const ADS_DIR = "/Users/Miranda/twelveLabs/sampleData/ads"; //TODO: Switch this part for ads/footages

const client = new TwelveLabs({ apiKey: TWELVE_LABS_API_KEY });

async function generateEmbedding(videoFile) {
  const task = await client.embed.task.create("Marengo-retrieval-2.6", {
    file: videoFile,
    scopes: ["clip", "video"],
  });

  console.log(
    `Created task: id=${task.id} for file: ${path.basename(videoFile)}`
  );
  return task.id;
}

async function processVideos(videosDirectory, videoType) {
  const files = fs.readdirSync(videosDirectory);
  const videoExtensions = [".mp4", ".avi", ".mov", ".mkv"];
  const videoFiles = files.filter((file) =>
    videoExtensions.includes(path.extname(file).toLowerCase())
  );

  const results = [];

  for (const videoFile of videoFiles) {
    const videoPath = path.join(videosDirectory, videoFile);
    try {
      const taskId = await generateEmbedding(videoPath);
      results.push({
        taskId,
        videoFile,
        videoType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error processing ${videoFile}:`, error);
    }
  }

  return results;
}

async function main() {
  const allResults = [];

  // Process both directories
  const footageResults = await processVideos(FOOTAGES_DIR, "footage");
  // const adsResults = await processVideos(ADS_DIR, "ad"); //TODO: Switch this part for ads/footages


  allResults.push(...footageResults);
  // allResults.push(...adsResults); //TODO: Switch this part for ads/footages


  // Save results to JSON file
  const outputPath = path.join(__dirname, "taskIds.json");
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`Task IDs saved to ${outputPath}`);
}

main().catch(console.error);
