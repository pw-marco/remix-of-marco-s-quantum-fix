// scripts/import-batches.js
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://official_marco_22:apexmarco22@cluster0.6qatd2w.mongodb.net/pw-marco";

async function importBatches() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log("🔄 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("pw-marco");
    const collection = db.collection("batches");
    
    // File read karo
    const filePath = path.join(process.cwd(), "batch/all_batches.json");
    console.log(`📂 Reading file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    const fileContent = fs.readFileSync(filePath, "utf-8");
    let batches = JSON.parse(fileContent);
    
    // Agar wrapper object hai toh extract karo
    if (!Array.isArray(batches)) {
      if (batches.batches) batches = batches.batches;
      else if (batches.data) batches = batches.data;
      else if (batches.items) batches = batches.items;
      else {
        // Try to find first array
        for (const key of Object.keys(batches)) {
          if (Array.isArray(batches[key])) {
            batches = batches[key];
            break;
          }
        }
      }
    }
    
    if (!Array.isArray(batches)) {
      console.error("❌ Could not find array in JSON");
      console.log("📋 JSON structure:", Object.keys(batches));
      return;
    }
    
    console.log(`📊 Total batches: ${batches.length}`);
    
    // Drop existing collection (optional)
    try {
      await collection.drop();
      console.log("🗑️ Dropped existing collection");
    } catch(e) {
      console.log("📁 Collection doesn't exist, creating new...");
    }
    
    // Insert in chunks of 1000
    const chunkSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < batches.length; i += chunkSize) {
      const chunk = batches.slice(i, i + chunkSize);
      const result = await collection.insertMany(chunk);
      inserted += result.insertedCount;
      console.log(`✅ Inserted ${inserted} of ${batches.length}`);
    }
    
    console.log(`\n✅ Import complete! ${inserted} batches inserted.`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("🔌 Connection closed");
  }
}

importBatches();