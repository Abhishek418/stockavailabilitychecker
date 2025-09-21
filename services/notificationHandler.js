const { bot } = require('./telegramBotHandler');

class NotificationManager {
    constructor(bot) {

        if (!bot) {
            throw new Error("NotificationManager requires a bot instance.");
        }
        this.bot = bot; // Store the bot instance
        this.rateLimits = new Map();
        this.messageQueue = [];
        this.isProcessingQueue = false;
    }

    async sendStockAlert(chatId, productUrl,shortId) {
        if (this.isRateLimited(chatId)) {
            console.log(`Rate limited notification for user ${chatId}`);
            return;
        }

        const message = this.formatStockAlertMessage(productUrl);

        try {
            await this.bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false,
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '🛒 Buy Now',
                            url: productUrl
                        },
                        {
                            text: '🛑 Stop Monitoring',
                            callback_data: `stop_${shortId}`
                        }
                    ]]
                }
            });

            this.updateRateLimit(chatId);
            console.log(`✅ Stock alert sent to ${chatId}`);

        } catch (error) {
            console.error(`❌ Failed to send stock alert to ${chatId}:`, error);

            if (error.response && error.response.statusCode === 429) {
                this.queueMessage(chatId, message);
            }
        }
    }

    formatStockAlertMessage(productUrl) {
        const productName = this.extractProductName(productUrl);

        return `🎉 *STOCK ALERT!* 🎉

📦 *${productName}* is now available!

🔗 ${productUrl}

⚡ *Act fast!* Popular items sell out quickly.

Use /stop to stop monitoring this product.`;
    }

    extractProductName(url) {
        try {
            const urlParts = url.split('/');
            const productSlug = urlParts[urlParts.length - 1];
            return productSlug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        } catch {
            return 'Product';
        }
    }

    isRateLimited(chatId) {
        const lastSent = this.rateLimits.get(chatId);
        if (!lastSent) return false;

        const timeDiff = Date.now() - lastSent;
        const minInterval = 60000; // 1 minute minimum between notifications

        return timeDiff < minInterval;
    }

    updateRateLimit(chatId) {
        this.rateLimits.set(chatId, Date.now());
    }

    queueMessage(chatId, message) {
        this.messageQueue.push({
            chatId,
            message,
            timestamp: Date.now()
        });

        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    }

    async processMessageQueue() {
        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const queuedMessage = this.messageQueue.shift();

            try {
                await this.bot.sendMessage(queuedMessage.chatId, queuedMessage.message);
                console.log(`✅ Queued message sent to ${queuedMessage.chatId}`);
            } catch (error) {
                console.error(`❌ Failed to send queued message:`, error);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.isProcessingQueue = false;
    }
}

module.exports = {
    NotificationManager
};