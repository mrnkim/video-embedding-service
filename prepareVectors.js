require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { TwelveLabs } = require("twelvelabs-js");

const TWELVE_LABS_API_KEY = process.env.TWELVE_LABS_API_KEY;
const TWELVE_LABS_ADS_INDEX = process.env.TWELVE_LABS_ADS_INDEX;
const TWELVE_LABS_FOOTAGE_INDEX = process.env.TWELVE_LABS_FOOTAGE_INDEX;
const client = new TwelveLabs({ apiKey: TWELVE_LABS_API_KEY });

async function retrieveEmbedding(taskId) {
  const task = await client.embed.task.retrieve(taskId);

  if (task.videoEmbedding && task.videoEmbedding.segments) {
    return task.videoEmbedding.segments.map((segment) => ({
      embedding: segment.embeddingsFloat,
      start_offset_sec: segment.startOffsetSec,
      end_offset_sec: segment.endOffsetSec,
      embedding_scope: segment.embeddingScope,
    }));
  }
  throw new Error("No video embedding data found in task result");
}

async function prepareVectors() {
  const taskData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "taskIds.json"))
  );
  const preparedVectors = [];

  // Fetch all videos using pagination
  let allVideos = [];
  const pageLimit = 12;

  const options = {
    method: "GET",
    headers: {
      "x-api-key": TWELVE_LABS_API_KEY,
    },
  };

  // Get first page to know total pages
  //TODO: Switch this part for ads/footages
  const firstResponse = await fetch(
    `https://api.twelvelabs.io/v1.2/indexes/${TWELVE_LABS_ADS_INDEX}/videos?page=1&page_limit=${pageLimit}`,

    options
  );
  const firstPageData = await firstResponse.json();
  const totalPages = firstPageData.page_info.total_page;

  // Add first page results
  if (firstPageData.data) {
    allVideos = [...firstPageData.data];
  }

  // Fetch remaining pages
  //TODO: Switch this part for ads/footages
  for (let page = 2; page <= totalPages; page++) {
    const response = await fetch(
      `https://api.twelvelabs.io/v1.2/indexes/${TWELVE_LABS_ADS_INDEX}/videos?page=${page}&page_limit=${pageLimit}`,

      options
    );
    const videoList = await response.json();

    if (videoList.data) {
      allVideos = [...allVideos, ...videoList.data];
    }
  }

  for (const task of taskData) {
    try {
      const embeddings = await retrieveEmbedding(task.taskId);
      const videoName = path.basename(
        task.videoFile,
        path.extname(task.videoFile)
      );

      console.log("\nProcessing video:", videoName);

      const matchingVideo = allVideos.find(
        (video) =>
          video.metadata.filename.includes(videoName) ||
          videoName.includes(video.metadata.filename)
      );
      const tlVideoId = matchingVideo ? matchingVideo._id : null;

      // Create vectors
      const vectors = embeddings.map((embedding, index) => ({
        id:
          embedding.embedding_scope === "video"
            ? `${videoName}_full`
            : `${videoName}_${index}`,
        values: embedding.embedding,
        metadata: {
          video_file: videoName,
          video_segment: embedding.embedding_scope === "video" ? -1 : index,
          start_time: embedding.start_offset_sec,
          end_time: embedding.end_offset_sec,
          scope: embedding.embedding_scope,
          video_type: task.videoType,
          tlVideoId,
        },
      }));

      preparedVectors.push(...vectors);
      console.log(`Processed vectors for ${task.videoFile}`);
    } catch (error) {
      console.error(`Error processing task ${task.taskId}:`, error);
    }
  }

  // Save prepared vectors to file
  const outputPath = path.join(__dirname, "preparedVectors.json");
  fs.writeFileSync(outputPath, JSON.stringify(preparedVectors, null, 2));
  console.log(`Prepared vectors saved to ${outputPath}`);
}

prepareVectors().catch(console.error);
