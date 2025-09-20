// services/database.js
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('MONGODB_URI is not defined in the .env file');
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let productsCollection;

async function connectDB() {
    if (db) return productsCollection;
    try {
        await client.connect();
        db = client.db("stock-monitor");
        productsCollection = db.collection("products");
        console.log("✅ Successfully connected to MongoDB Atlas!");
        return productsCollection;
    } catch (error) {
        console.error("❌ Could not connect to MongoDB Atlas.", error);
        process.exit(1);
    }
}

module.exports = { connectDB };