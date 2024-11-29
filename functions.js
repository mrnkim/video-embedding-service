require("dotenv").config();

const { Pinecone } = require("@pinecone-database/pinecone");
const { TwelveLabs } = require("twelvelabs-js");
const path = require("path");
const fs = require("fs");

const TWELVE_LABS_API_KEY = process.env.TWELVE_LABS_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

const client = new TwelveLabs({ apiKey: TWELVE_LABS_API_KEY });
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

// 태스크 진행 상황을 모니터링하는 콜백 함수
const onTaskUpdate = (task) => {
  console.log(`  Status=${task.status}`);
};

const retrieveEmbedding = async (taskId) => {
  // task 조회 한 번만 수행
  const task = await client.embed.task.retrieve(taskId);

  if (task.videoEmbedding && task.videoEmbedding.segments) {
    // 임베딩 데이터 구조화하여 반환
    const embeddings = task.videoEmbedding.segments.map((segment) => ({
      embedding: segment.embeddingsFloat,
      start_offset_sec: segment.startOffsetSec,
      end_offset_sec: segment.endOffsetSec,
      embedding_scope: segment.embeddingScope,
    }));

    return [embeddings, task];
  }

  throw new Error("No video embedding data found in task result");
};

const generateEmbedding = async (videoFile) => {
  // 임베딩 태스크 생성
  const task = await client.embed.task.create("Marengo-retrieval-2.6", {
    file: videoFile,
    scopes: ["clip", "video"],
  });

  console.log(
    `Created task: id=${task.id} engine_name=${task.engineName} status=${task.status}`
  );

  // 태스크 완료 대기
  const status = await task.waitForDone({
    sleepInterval: 2,
    callback: onTaskUpdate,
  });

  // 태스크 결과 조회
  const taskResult = await client.embed.task.retrieve(task.id);

  // 임베딩 추출 및 반환 - 실제 구조에 맞게 수정
  const embeddings = taskResult.videoEmbedding.segments.map((segment) => ({
    embedding: segment.embeddingsFloat,
    start_offset_sec: segment.startOffsetSec,
    end_offset_sec: segment.endOffsetSec,
    embedding_scope: segment.embeddingScope,
  }));

  console.log(`Extracted ${embeddings.length} embeddings from video`);
  return [embeddings, taskResult];
};

const ingestData = async (videoFilePath, metadata = {}) => {
  const videoName = path.basename(videoFilePath, path.extname(videoFilePath));
  console.log(videoName);

  try {
    // 인덱스가 존재하는지 확인하기 위해 describeIndex 사용
    await pc.describeIndex(PINECONE_INDEX);
  } catch (error) {
    // 인덱스가 없는 경우 생성
    if (error.message.includes("not found")) {
      await pc.createIndex({
        name: PINECONE_INDEX,
        dimension: 1024,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
    } else {
      throw error; // 다른 에러인 경우 다시 throw
    }
  }

  const index = pc.Index(PINECONE_INDEX);

  // Twelve Labs Embed API를 사용하여 임베딩 생성
  // const [embeddings, taskResult] = await generateEmbedding(videoFilePath);
  const [embeddings, taskResult] = await retrieveEmbedding(
    "6749489d88e996d0e8040a7a"
  );
  console.log(
    "🚀 > ingestData > embeddings, taskResult=",
    embeddings,
    taskResult
  );

  // 벡터 데이터를 위한 더 명확한 구조
  const vectorsToUpsert = embeddings.map((emb, i) => ({
    id:
      emb.embedding_scope === "video"
        ? `${videoName}_full`
        : `${videoName}_${i}`,
    values: emb.embedding,
    metadata: {
      video_file: videoName,
      video_segment: emb.embedding_scope === "video" ? -1 : i,
      start_time: emb.start_offset_sec,
      end_time: emb.end_offset_sec,
      scope: emb.embedding_scope,
      video_type: metadata.video_type,
      filename: metadata.filename,
    },
  }));

  console.log("🚀 > vectorsToUpsert > vectorsToUpsert=", vectorsToUpsert);

  // Pinecone upsert 호출도 수정
  //   await index.upsert(vectorsToUpsert);

  return `Ingested ${embeddings.length} embeddings for ${videoFilePath}`;
};

module.exports = {
  generateEmbedding,
  ingestData,
};
