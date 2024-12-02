require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

function sanitizeVectorId(str) {
  const sanitized = str
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace other special characters with underscore
    .replace(/_{2,}/g, '_'); // Replace multiple consecutive underscores with single underscore

  console.log('Original vector ID:', str);
  console.log('Sanitized vector ID:', sanitized);
  return sanitized;
}

async function upsertToPinecone() {
  try {
    console.log('Initializing Pinecone client...');
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

    console.log('Connecting to index:', PINECONE_INDEX);
    const index = pc.Index(PINECONE_INDEX);

    // Read prepared vectors
    const vectors = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'preparedVectors.json'))
    );

    console.log(`Found ${vectors.length} vectors to upsert`);

    // 벡터 데이터 로깅
    console.log('Sample vector data:', {
      id: vectors[0].id,
      metadata: vectors[0].metadata,
      valuesLength: vectors[0].values.length,
      sampleValues: vectors[0].values.slice(0, 5)
    });

    // Sanitize vector IDs
    const sanitizedVectors = vectors.map(vector => ({
      ...vector,
      id: sanitizeVectorId(vector.id)
    }));

    // 벡터 형식 검증
    const isValidVector = sanitizedVectors.every(vector =>
      vector.id &&
      Array.isArray(vector.values) &&
      vector.values.length === 1024 &&
      vector.values.every(v => typeof v === 'number')
    );
    console.log('Vector validation:', { isValid: isValidVector });

    // 배치 크기를 더 작게 조정
    const batchSize = 5;
    console.log('Starting upsert operation in smaller batches...');

    for (let i = 0; i < sanitizedVectors.length; i += batchSize) {
      const batch = sanitizedVectors.slice(i, i + batchSize);
      console.log(`Upserting batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(sanitizedVectors.length/batchSize)}`);
      console.log('Batch vector IDs:', batch.map(v => v.id));

      try {
        const upsertResponse = await index.upsert(batch);
        console.log('Upsert response:', upsertResponse);

        // 각 벡터가 실제로 업로드되었는지 즉시 확인
        const fetchResponse = await index.fetch(batch.map(v => v.id));
        console.log('Fetch verification:', {
          attempted: batch.length,
          found: Object.keys(fetchResponse.records).length
        });
      } catch (error) {
        console.error('Error in batch:', error);
        console.error('Problematic batch data:', JSON.stringify(batch, null, 2));
        throw error;
      }
    }

    // 최종 확인
    console.log('Verifying upsert...');
    const describeStats = await index.describeIndexStats();
    console.log('Index stats after upsert:', describeStats);

    // 무작위로 5개 벡터를 선택해서 실제로 존재하는지 확인
    const sampleIds = sanitizedVectors
      .map(v => v.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    console.log('Performing final verification with random samples...');
    const fetchResponse = await index.fetch(sampleIds);
    sampleIds.forEach(id => {
      console.log(`Vector ${id}: ${fetchResponse.records[id] ? 'exists' : 'not found'}`);
    });

    console.log('Upsert operation completed successfully');
  } catch (error) {
    console.error('Error in upsertToPinecone:', error);
    if (error.response) {
      console.error('Pinecone API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw error;
  }
}

// Add confirmation prompt
console.log('WARNING: This will upsert vectors to Pinecone.');
console.log('Are you sure you want to continue? (yes/no)');

process.stdin.once('data', (data) => {
  const answer = data.toString().trim().toLowerCase();
  if (answer === 'yes') {
    upsertToPinecone().catch(console.error);
  } else {
    console.log('Operation cancelled');
    process.exit(0);
  }
});