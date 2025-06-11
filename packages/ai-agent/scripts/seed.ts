import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { embedText } from "../../data-core/embedding"; // adjust path if needed
import { v4 as uuidv4 } from "uuid";

// Sample data
const documents = [
  "Turn off air conditioning when not at home to save energy.",
  "Use ceiling fans to circulate air instead of lowering the thermostat.",
  "Seal leaks around windows and doors to keep cool air in.",
  "Install a programmable thermostat to optimize cooling schedules.",
  "Keep blinds closed during the day to block heat from sunlight."
];

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL! || "http://localhost:6333" });

async function seed() {
  const points = [];

  for (const doc of documents) {
    const vector = await embedText(doc);
    points.push({
      id: uuidv4(),
      payload: { text: doc },
      vector,
    });
  }

  await qdrant.upsert("energy-docs", {
    wait: true,
    points,
  });

  console.log("✅ Seeded documents into Qdrant");
}

seed().catch((err) => {
  console.error("❌ Failed to seed Qdrant:", err);
});
