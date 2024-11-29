require("dotenv").config();

const { Pinecone } = require("@pinecone-database/pinecone");
const path = require("path");
const fs = require("fs");

async function updateVideoTypeMetadata(directory, videoType) {
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.Index(process.env.PINECONE_INDEX);

    const files = fs.readdirSync(directory);
    const videoExtensions = [".mp4", ".avi", ".mov", ".mkv"];
    const videoFiles = files.filter((file) =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    for (const videoFile of videoFiles) {
      const videoName = path.basename(videoFile, path.extname(videoFile));
      console.log(`Updating metadata for: ${videoName}`);

      // video scope (full video) 업데이트
      const videoId = `${videoName}_full`;
      await index.update({
        id: videoId,
        metadata: {
          video_type: videoType
        }
      });
      console.log(`Updated full video metadata: ${videoId}`);

      // clip scope 업데이트
      // 먼저 이 비디오의 모든 벡터를 조회
      const queryResponse = await index.query({
        vector: Array(1024).fill(0), // dummy vector
        filter: {
          video_file: videoName,
          scope: "clip"
        },
        includeMetadata: true,
        topK: 1000 // 충분히 큰 수로 설정
      });

      // 찾은 각 clip의 메타데이터 업데이트
      for (const match of queryResponse.matches) {
        const clipId = match.id;
        await index.update({
          id: clipId,
          metadata: {
            video_type: videoType
          }
        });
        console.log(`Updated clip metadata: ${clipId}`);
      }
    }

    console.log("Metadata update completed");
  } catch (error) {
    console.error("Error updating metadata:", error);
    throw error;
  }
}

// 사용 예시:
const FOOTAGES_DIR = "/Users/Miranda/twelveLabs/sampleData/footages";
updateVideoTypeMetadata(FOOTAGES_DIR, "footage")
  .then(() => console.log("Update process completed"))
  .catch(error => console.error("Error:", error));