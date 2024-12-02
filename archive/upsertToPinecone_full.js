require("dotenv").config();

const fs = require("fs");
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
console.log("🚀 > PINECONE_API_KEY=", PINECONE_API_KEY)
const PINECONE_INDEX = process.env.PINECONE_INDEX;

async function upsertToPineconeFull() {
  // Initialize Pinecone client
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

  // Read and parse the JSON file
  const vectors = JSON.parse(fs.readFileSync("preparedVectors.json", "utf8"));

  // Filter vectors that end with '_full'
  const fullVectors = vectors.filter((vector) => vector.id.endsWith("_full"));

  // Get index
  const index = pinecone.Index(PINECONE_INDEX);

  // Upsert the filtered vectors
  try {
    const upsertResponse = await index.upsert(fullVectors);
    console.log("Successfully upserted vectors:", upsertResponse);
  } catch (error) {
    console.error("Error upserting vectors:", error);
  }
}

upsertToPineconeFull();
