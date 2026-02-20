// db/init.js  — run once:  node db/init.js
import dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Make sure your .env file exists.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function init() {
  console.log("🔧  Creating tables...");
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id        SERIAL PRIMARY KEY,
      title     TEXT         NOT NULL,
      content   TEXT         NOT NULL,
      author    VARCHAR(120) NOT NULL,
      date      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  console.log("🌱  Seeding sample posts...");
  await sql`
    INSERT INTO posts (title, content, author, date) VALUES
    (
      'The Rise of Decentralized Finance',
      'Decentralized Finance (DeFi) is an emerging and rapidly evolving field in the blockchain industry. It refers to the shift from traditional, centralized financial systems to peer-to-peer finance enabled by decentralized technologies built on Ethereum and other blockchains.',
      'Alex Thompson',
      '2023-08-01T10:00:00Z'
    ),
    (
      'The Impact of Artificial Intelligence on Modern Businesses',
      'Artificial Intelligence (AI) is no longer a concept of the future. It is very much a part of our present, reshaping industries and enhancing the capabilities of existing systems. From automating routine tasks to offering intelligent insights, AI is proving to be a boon for businesses.',
      'Mia Williams',
      '2023-08-05T14:30:00Z'
    ),
    (
      'Sustainable Living: Tips for an Eco-Friendly Lifestyle',
      'Sustainability is more than just a buzzword; it is a way of life. As the effects of climate change become more pronounced, there is a growing realization about the need to live sustainably. From reducing waste and conserving energy to supporting eco-friendly products.',
      'Samuel Green',
      '2023-08-10T09:15:00Z'
    )
    ON CONFLICT DO NOTHING
  `;

  console.log("✅  Database ready!");
  process.exit(0);
}

init().catch((err) => {
  console.error("❌  Init failed:", err.message);
  process.exit(1);
});
