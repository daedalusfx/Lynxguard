// Propping Board - Backend Server
// Version 2.0 - Mongoose Architecture
// وظیفه: دریافت داده از اکسپرت‌های MQL5 و ذخیره‌سازی در MongoDB با استفاده از Mongoose

const express = require('express');
const mongoose = require('mongoose');

// --- تنظیمات اصلی ---
const PORT = 5000;
// const MONGO_URI = "mongodb://127.0.0.1:27017/mongodb"; // یک دیتابیس جدید برای نسخه Mongoose
const MONGO_URI = "mongodb://testuser:mypass@127.0.0.1:27017/propping_board_db_mongoose?authSource=admin";
// const MONGO_URI = "mongodb://admin:admin@127.0.0.1:27017/propping_board_db_mongoose?authSource=admin";
// const db = 'mongodb+srv://admin:admin@127.0.0.1:27017/test?retryWrites=true'


// --- تعریف Schema برای Mongoose ---

// Schema برای داده‌های تیک (Tick Data)
const tickSchema = new mongoose.Schema({
    source: { type: String, required: true, enum: ['target', 'reference'] }, // منبع باید یکی از این دو مقدار باشد
    broker: { type: String, required: true },
    symbol: { type: String, required: true },
    bid: { type: Number, required: true },
    ask: { type: Number, required: true },
    time_msc: { type: Number, required: true },
    serverTimestamp: { type: Date, default: Date.now } // زمان دریافت در سرور
});

// Schema برای داده‌های معاملات (Trade Data)
const tradeSchema = new mongoose.Schema({
    source: { type: String, default: 'target' },
    broker: { type: String, required: true },
    type: { type: String, required: true }, // نوع رویداد، مثلا DEAL_ADD
    ticket: { type: Number, required: true, unique: true, index: true }, // تیکت معامله باید یکتا باشد
    order_id: { type: Number, required: true },
    symbol: { type: String, required: true },
    volume: { type: Number },
    price: { type: Number },
    profit: { type: Number },
    commission: { type: Number },
    swap: { type: Number },
    deal_type: { type: String },
    serverTimestamp: { type: Date, default: Date.now }
});

// --- ساخت Model از روی Schema ها ---
const Tick = mongoose.model('Tick', tickSchema);
const Trade = mongoose.model('Trade', tradeSchema);


// --- راه‌اندازی برنامه Express ---
const app = express();
app.use(express.json({ limit: '10mb' }));

/**
 * @function connectToMongo
 * @description به پایگاه داده MongoDB با استفاده از Mongoose متصل می‌شود.
 */
async function connectToMongo() {
    try {
        await mongoose.connect(MONGO_URI).then((res)=>{
            console.log(`✅ Successfully connected to MongoDB via Mongoose: `);
            
        })
        // await mongoose.connect("mongodb://localhost:27017/propping_board_db", {
        //     authSource: "admin",
        //     user: "admin",
        //     pass: "admin"
        // }).then((res)=>{
        //     console.log(res);
            
        // })
    } catch (err) {
        console.error("❌ Could not connect to MongoDB.", err);
        process.exit(1);
    }
}

// --- اندپوینت‌ها (API Endpoints) ---

/**
 * @route POST /tick
 * @description دریافت داده‌های تیک و ذخیره با استفاده از مدل Tick.
 */
app.post('/tick', async (req, res) => {
    console.log(req.body);
    
    try {
        // ایجاد یک سند جدید بر اساس مدل Tick
        const newTick = new Tick(req.body);
        await newTick.save(); // ذخیره در دیتابیس
        res.status(201).json({ status: 'success' }); // 201 یعنی Created
    } catch (error) {
        // اگر داده ورودی با Schema مطابقت نداشته باشد، Mongoose خطا می‌دهد
        if (error.name === 'ValidationError') {
            console.error("Validation Error:", error.message);
            return res.status(400).json({ status: 'error', message: error.message });
        }
        console.error("Error inserting tick data:", error);
        res.status(500).json({ status: 'error', message: 'Failed to save tick data.' });
    }
});

/**
 * @route POST /trade
 * @description دریافت رویدادهای معاملاتی و ذخیره/آپدیت با استفاده از مدل Trade.
 */
app.post('/trade', async (req, res) => {
    const tradeData = req.body;
    if (!tradeData.ticket) {
        return res.status(400).json({ status: 'error', message: 'Trade ticket is required.' });
    }

    try {
        // پیدا کردن معامله بر اساس تیکت و آپدیت آن. اگر وجود نداشت، یک سند جدید می‌سازد (upsert: true)
        await Trade.findOneAndUpdate(
            { ticket: tradeData.ticket }, // شرط پیدا کردن
            tradeData,                      // داده‌های جدید برای آپدیت
            { upsert: true, new: true, runValidators: true } // گزینه‌ها
        );
        console.log(`Trade event [${tradeData.type}] processed for ticket: ${tradeData.ticket}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        if (error.name === 'ValidationError') {
            console.error("Validation Error:", error.message);
            return res.status(400).json({ status: 'error', message: error.message });
        }
        console.error("Error processing trade data:", error);
        res.status(500).json({ status: 'error', message: 'Failed to save trade data.' });
    }
});


// --- راه‌اندازی سرور ---
async function startServer() {
    await connectToMongo(); // ابتدا به دیتابیس متصل شو
    app.listen(PORT, () => {
        console.log(`🚀 Propping Board Server (Mongoose) is running on http://localhost:${PORT}`);
    });
}

startServer();
