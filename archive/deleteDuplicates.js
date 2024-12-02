require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

async function deleteDuplicates() {
  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.Index(PINECONE_INDEX);

    // 삭제할 특정 ID 리스트
    const specificIds = [
      "RACT Home Insurance ad 2022_0",
      "RACT Home Insurance ad 2022_1",
      "RACT Home Insurance ad 2022_2",
      "RACT Home Insurance ad 2022_full",
      "REESE'S Cups Big Game Commercial 2024 _0",
      "REESE'S Cups Big Game Commercial 2024 _1",
      "REESE'S Cups Big Game Commercial 2024 _2",
      "REESE'S Cups Big Game Commercial 2024 _3",
      "REESE'S Cups Big Game Commercial 2024 _4",
      "REESE'S Cups Big Game Commercial 2024 _full",
      "Starbucks_ It Starts With You_0",
      "Starbucks_ It Starts With You_1",
      "Starbucks_ It Starts With You_2",
      "Starbucks_ It Starts With You_3",
      "Starbucks_ It Starts With You_4",
      "Starbucks_ It Starts With You_5",
      "Starbucks_ It Starts With You_6",
      "Starbucks_ It Starts With You_7",
      "Starbucks_ It Starts With You_8",
      "Starbucks_ It Starts With You_9",
      "Starbucks_ It Starts With You_full",
      "Temu's Big Game Ad Encore TV Commercial 2024_0",
      "Temu's Big Game Ad Encore TV Commercial 2024_1",
      "Temu's Big Game Ad Encore TV Commercial 2024_2",
      "Temu's Big Game Ad Encore TV Commercial 2024_3",
      "Temu's Big Game Ad Encore TV Commercial 2024_4",
      "Temu's Big Game Ad Encore TV Commercial 2024_full",
      "Unhidden Gems _0",
      "Unhidden Gems _1",
      "Unhidden Gems _2",
      "Unhidden Gems _3",
      "Unhidden Gems _4",
      "Unhidden Gems _5",
      "Unhidden Gems _6",
      "Unhidden Gems _full"
    ];

    console.log("Deleting specific IDs...");

    // 각 ID를 개별적으로 삭제
    for (const id of specificIds) {
      try {
        await index.deleteOne(id);
        console.log(`Deleted vector: ${id}`);
      } catch (deleteError) {
        console.error(`Error deleting vector ${id}:`, deleteError);
      }
    }

    console.log(`Deletion process completed for ${specificIds.length} vectors`);

  } catch (error) {
    console.error("Error in deletion process:", error);
  }
}

deleteDuplicates();
