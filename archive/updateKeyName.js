require("dotenv").config();

const { Pinecone } = require("@pinecone-database/pinecone");

async function updateMetadataKeys() {
  console.log('Starting metadata update process...');
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX);
  console.log('Connected to Pinecone index:', process.env.PINECONE_INDEX);

  try {
    const batchSize = 1000;
    const timeout = 30000;

    console.log('Getting index statistics...');
    const statsResponse = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(statsResponse, null, 2));

    // fetch를 사용하여 기존 벡터들의 메타데이터만 가져오기
    console.log('Fetching vectors...');
    const fetchResponse = await Promise.race([
      index.fetch({
        namespace: '',  // default namespace
        limit: batchSize,
        includeValues: false  // 벡터 값은 필요 없음
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);

    console.log(`Retrieved ${Object.keys(fetchResponse.records || {}).length} vectors`);

    let updatedCount = 0;
    const updatePromises = [];

    // 각 레코드에 대해 메타데이터 업데이트
    for (const [id, record] of Object.entries(fetchResponse.records || {})) {
      if (!record.metadata || !('tlVideoId' in record.metadata)) continue;

      console.log(`Processing vector ${id}:`, record.metadata);

      // 메타데이터 업데이트 준비
      const updateMetadata = {
        tl_video_id: record.metadata.tlVideoId
      };

      // 기존 메타데이터의 다른 필드들 유지
      Object.entries(record.metadata).forEach(([key, value]) => {
        if (key !== 'tlVideoId') {
          updateMetadata[key] = value;
        }
      });

      // 업데이트 작업 추가
      updatePromises.push(
        index.update({
          id: id,
          metadata: updateMetadata
        })
        .then(() => {
          updatedCount++;
          console.log(`Updated metadata for vector ${id}:`, updateMetadata);
        })
        .catch(error => {
          console.error(`Failed to update vector ${id}:`, error);
        })
      );
    }

    // 모든 업데이트 작업 완료 대기
    await Promise.allSettled(updatePromises);
    console.log(`Total vectors updated: ${updatedCount}`);

  } catch (error) {
    console.error('Error updating metadata:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    throw error;  // Re-throw to ensure the process fails visibly
  }

  console.log('Metadata key update completed');
}

updateMetadataKeys().catch(console.error);
