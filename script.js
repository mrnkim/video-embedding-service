const fs = require("fs");
const path = require("path");
const { ingestData } = require("./functions");

const FOOTAGES_DIR = "/Users/Miranda/twelveLabs/sampleData/footages";
const ADS_DIR = "/Users/Miranda/twelveLabs/sampleData/ads";

async function processVideos(videosDirectory, videoType) {
  try {
    // 디렉토리 내의 모든 파일 읽기
    const files = fs.readdirSync(videosDirectory);

    // 비디오 파일 확장자 필터 (필요에 따라 확장자 추가)
    const videoExtensions = [".mp4", ".avi", ".mov", ".mkv"];
    const videoFiles = files.filter((file) =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    console.log(`Found ${videoFiles.length} video files`);

    // 각 비디오 파일에 대해 처리
    for (const videoFile of videoFiles) {
      const videoPath = path.join(videosDirectory, videoFile);
      console.log(`\nProcessing: ${videoFile} as ${videoType}`);

      try {
        // videoType을 메타데이터로 전달
        const result = await ingestData(videoPath, {
          video_type: videoType,
          filename: videoFile
        });
        console.log(result);
      } catch (error) {
        console.error(`Error processing ${videoFile}:`, error);
      }
    }
  } catch (error) {
    console.error("Error reading directory:", error);
  }
}

// 하나의 인덱스에 두 가지 타입의 비디오 처리
Promise.all([
  processVideos(FOOTAGES_DIR, "footage"),
  processVideos(ADS_DIR, "ad")
])
.then(() => {
  console.log("\nAll videos processed");
})
.catch((error) => {
  console.error("Error in main process:", error);
});
