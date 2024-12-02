require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

async function deleteFootage() {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index(PINECONE_INDEX);

    // 삭제할 ID 배열 생성 (77부터 87까지와 _full로 끝나는 ID)
    const ids = [
        // 77-87까지의 ID
        ...Array.from({ length: 11 }, (_, i) =>
            `More than 100 dead in devastation and flooding after Hurricane Helene_${i + 77}`
        ),
        // _full로 끝나는 ID 
        'More than 100 dead in devastation and flooding after Hurricane Helene_full'
    ];

    try {
        // ids 배열의 각 id에 대해 개별적으로 삭제 수행
        for (const id of ids) {
            await index.deleteOne(id);
            console.log(`Deleted: ${id}`);
        }
        console.log("데이터 삭제 완료");
    } catch (error) {
        console.error("데이터 삭제 중 오류 발생:", error);
    }
}

// 함수 실행
deleteFootage();
