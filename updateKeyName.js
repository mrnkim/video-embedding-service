require("dotenv").config();

const { Pinecone } = require("@pinecone-database/pinecone");

async function updateMetadataKeys() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX);

  // 업데이트할 ID 목록 생성 (공백을 언더스코어로 대체)
  const videoIds = [
    // 1000X Series (공백이 있는 원본 파일명)
    ...Array(10).fill().map((_, i) => `1000X Series Goes Pink! Feat. LE SSERAFIM_${i}`),
    "1000X Series Goes Pink! Feat. LE SSERAFIM_full",

    // Coca-Cola Masterpiece (공백이 있는 원본 파일명)
    ...Array(19).fill().map((_, i) => `Coca-Cola® Masterpiece_${i}`),
    "Coca-Cola® Masterpiece_full"
  ];

  // 각 ID에 대해 metadata 업데이트
  for (const id of videoIds) {
    try {
      // 현재 벡터 조회
      const vector = await index.fetch([id]);

      if (vector.vectors[id]) {
        const currentMetadata = vector.vectors[id].metadata;
        const updatedMetadata = { ...currentMetadata };

        // tlVideoId를 tl_video_id로 변경
        if ('tlVideoId' in updatedMetadata) {
          updatedMetadata.tl_video_id = updatedMetadata.tlVideoId;
          delete updatedMetadata.tlVideoId;

          // metadata만 업데이트
          await index.update({
            id: id,
            metadata: updatedMetadata
          });

          console.log(`Updated metadata for vector ${id}`);
        }
      }
    } catch (error) {
      console.error(`Error updating vector ${id}:`, error);
    }
  }

  console.log('Metadata key update completed');
}

updateMetadataKeys().catch(console.error);
