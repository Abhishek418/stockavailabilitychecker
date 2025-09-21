const TelegramBot = require('node-telegram-bot-api');
const { checkProductAvailability } = require('./webScrapingHandler');
require('dotenv').config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const {NotificationManager} = require('./notificationHandler');
const { connectDB } = require('./database');
const crypto = require('crypto');

//fetch all the products
const productsCollectionPromise = connectDB();

//create an object of notification manager
const notificationManager = new NotificationManager(bot);

// --- RE-INTRODUCE THE IN-MEMORY MAP AS A CACHE ---
const monitoredProducts = new Map();

// --- FUNCTION TO LOAD DATA FROM DB INTO CACHE ---
async function initializeCache() {
    console.log('Initializing in-memory cache from MongoDB...');
    const products = await productsCollectionPromise;
    const allProducts = await products.find({}).toArray();
    
    for (const product of allProducts) {
        monitoredProducts.set(product._id, product);
    }
    console.log(`✅ Cache initialized with ${monitoredProducts.size} products.`);
}

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🤖 *Stock Monitor Bot Started!*

Available commands:
/monitor \\ - Start monitoring a product
/stop \\ - Stop monitoring a product  
/status - Show current monitoring status
/help - Show this help message

Example:
\`/monitor https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30\`
    `, { parse_mode: 'Markdown' });
});

// Monitor command
bot.onText(/\/monitor\s+(https?:\/\/\S+)(?:\s+(\d{6}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1]; // The captured URL

    // Use the user's pincode if provided, otherwise fallback to the default from .env
    const pincode = match[2] || process.env.PINCODE || '396191';

    if (!isValidUrl(url)) {
        bot.sendMessage(chatId, '❌ Invalid URL format');
        return;
    }

    // Create a unique key for each URL-pincode combination
    const productKey = `${url}|${pincode}`;

    const products = await productsCollectionPromise;

    const existingProduct = await products.findOne({ _id: productKey, chatIds: chatId });

    // Check if this exact product is already being monitored
    if (existingProduct) {
        // You could add the user to the existing list if you want multiple users per item
        bot.sendMessage(chatId, `ℹ️ This product is already being monitored for pincode ${pincode}.`);
        return;
    }

    const shortId = crypto.createHash('sha1').update(productKey).digest('hex').slice(0, 10);

    await products.updateOne(
        { _id: productKey },
        {
            $setOnInsert: { url, pincode,shortId, lastStatus: null, addedAt: new Date() },
            $addToSet: { chatIds: chatId }
        },
        { upsert: true } // Creates the document if it doesn't exist
    );

    // --- SYNC WITH CACHE ---
    const cachedProduct = monitoredProducts.get(productKey) || productData;
    if (!cachedProduct.chatIds.includes(chatId)) {
        cachedProduct.chatIds.push(chatId);
    }
    monitoredProducts.set(productKey, cachedProduct);

    bot.sendMessage(chatId, `✅ Started monitoring:\n${url}\nfor pincode: *${pincode}*`, { parse_mode: 'Markdown' });

    // Initial check
    try {
        const isAvailable = await checkProductAvailability(url, pincode); // Pass pincode to initial check
        const status = isAvailable ? '✅ In Stock' : '❌ Out of Stock';
        bot.sendMessage(chatId, `Current status: ${status}`);
    } catch (error) {
        bot.sendMessage(chatId, '⚠️ Error during the initial check. The bot will keep trying.');
    }
});

bot.onText(/\/stop\s+(https?:\/\/\S+)(?:\s+(\d{6}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1]; // The captured URL

    // Use the user's pincode if provided, otherwise fallback to the default.
    // This must match the logic in the /monitor command.
    const pincode = match[2] || process.env.PINCODE || '396191';

    // Recreate the unique product key to find the item in our Map
    const productKey = `${url}|${pincode}`;

    const result = await products.updateOne(
        { _id: productKey },
        { $pull: { chatIds: chatId } } // Removes the user's chatId from the list
    );

    if (result.modifiedCount > 0) {
        bot.sendMessage(chatId, `🛑 Stopped monitoring:\n${url}\nfor pincode: *${pincode}*`, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ You were not monitoring this product for pincode *${pincode}*.`, { parse_mode: 'Markdown' });
    }

    // --- SYNC WITH CACHE ---
    if (monitoredProducts.has(productKey)) {
        const cachedProduct = monitoredProducts.get(productKey);
        cachedProduct.chatIds = cachedProduct.chatIds.filter(id => id !== chatId);
        
        // If no one is monitoring, remove from cache
        if (cachedProduct.chatIds.length === 0) {
            monitoredProducts.delete(productKey);
        }
    }

    // Optional: Clean up documents that no users are monitoring
    await products.deleteMany({ chatIds: { $size: 0 } });
});

// Status command
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const products = await productsCollectionPromise;

    // Find all products this specific user is monitoring
    const userProducts = await products.find({ chatIds: chatId }).toArray();

    if (userProducts.length === 0) {
        bot.sendMessage(chatId, '📋 You are not currently monitoring any products.');
        return;
    }

    let statusMessage = '📋 *Your Monitored Products:*\n\n';
    userProducts.forEach(product => {
        const status = product.lastStatus === null ? '⏳ Checking...' : (product.lastStatus ? '✅ In Stock' : '❌ Out of Stock');
        statusMessage += `*URL*: ${product.url}\n*Pincode*: ${product.pincode}\n*Status*: ${status}\n\n`;
    });

    bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });

});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
🤖 *Telegram Stock Monitor Bot*

This bot tracks product availability and notifies you when an item is back in stock for a specific delivery pincode.

*Commands:*
/start - Initialize the bot
/monitor <URL> [PINCODE] - Add a product to the monitoring list. Pincode is optional.
/stop <URL> [PINCODE] - Remove a product from the monitoring list.
/status - Show all products currently being monitored.
/help - Show this help message.

*Example Usage:*

To monitor the same product for a specific pincode (e.g., Vapi):
\`/monitor https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30 396191\`
`, { parse_mode: 'Markdown' });
});


bot.on('callback_query', async (callbackQuery) => {
    const products = await productsCollectionPromise;
    const msg = callbackQuery.message;
    const data = callbackQuery.data; // This will be 'stop_xyz123'
    const chatId = msg.chat.id;

    // Check if it's a stop command
    if (data.startsWith('stop_')) {
        const shortId = data.split('_')[1];

        // Find the product in the database using the shortId
        const product = await products.findOne({ shortId: shortId });

        if (!product) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'This product is no longer being tracked.' });
            return;
        }

        // Perform the stop logic
        const result = await products.updateOne(
            { _id: product._id },
            { $pull: { chatIds: chatId } }
        );

        if (result.modifiedCount > 0) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'You will no longer receive alerts for this product.' });
            // Optionally, edit the original message to remove the buttons
            bot.editMessageText(`✅ Stopped monitoring *${product.url}* for pincode *${product.pincode}*`, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'You were not monitoring this product.' });
        }
        
        // Clean up documents that no users are monitoring
        await products.deleteMany({ chatIds: { $size: 0 } });
    }
});

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

initializeCache();

module.exports = { bot,productsCollectionPromise,notificationManager,monitoredProducts};