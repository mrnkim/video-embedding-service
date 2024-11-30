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
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index(PINECONE_INDEX);

  // Read prepared vectors
  const vectors = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'preparedVectors.json'))
  );

  console.log(`Found ${vectors.length} vectors to upsert`);

  // Sanitize vector IDs before upserting
  const sanitizedVectors = vectors.map(vector => ({
    ...vector,
    id: sanitizeVectorId(vector.id)
  }));

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < sanitizedVectors.length; i += BATCH_SIZE) {
    const batch = sanitizedVectors.slice(i, i + BATCH_SIZE);
    try {
      console.log(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      await index.upsert(batch);
    } catch (error) {
      console.error(`Error upserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
    }
  }

  console.log('Upsert complete!');
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