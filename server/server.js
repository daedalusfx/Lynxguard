// Propping Board - Backend Server
// Version 5.0 - Live Data with WebSocket
// وظیفه: دریافت، ذخیره‌سازی، تحلیل و ارسال زنده داده‌ها به داشبورد

const express = require('express');
const mongoose = require('mongoose');
const http = require('http'); // ماژول http برای یکپارچه‌سازی با WebSocket
const { WebSocketServer } = require('ws'); // کتابخانه WebSocket
require('dotenv').config();

// --- تنظیمات اصلی ---
const PORT = 5000;
const MONGO_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@127.0.0.1:27017/propping_board_db_mongoose?authSource=admin`;
const REFERENCE_SOURCE_ID = "reference_lmax";

// --- تعریف Schema ها (بدون تغییر) ---
const tickSchema = new mongoose.Schema({
    sourceIdentifier: { type: String, required: true, index: true },
    broker: { type: String, required: true },
    accountNumber: { type: Number, required: true },
    accountType: { type: String, required: true, enum: ['Demo', 'Real'] },
    symbol: { type: String, required: true },
    bid: { type: Number, required: true },
    ask: { type: Number, required: true },
    time_msc: { type: Number, required: true, index: true },
    serverTimestamp: { type: Date, default: Date.now }
});

const alertSchema = new mongoose.Schema({
    sourceIdentifier: { type: String, required: true, index: true },
    alertType: { type: String, required: true },
    severity: { type: String, required: true, enum: ['Info', 'Warning', 'Critical'] },
    message: { type: String, required: true },
    symbol: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    snapshot: {
        targetPrice: Number,
        referencePrice: Number,
        priceDifference: Number
    }
});

// --- ساخت Model ها ---
const Tick = mongoose.model('Tick', tickSchema);
const Alert = mongoose.model('Alert', alertSchema);

// --- راه‌اندازی Express و سرور HTTP ---
const app = express();
app.use(express.json({ limit: '10mb' }));
const server = http.createServer(app); // ساخت سرور HTTP از روی Express

// --- بخش جدید: راه‌اندازی سرور WebSocket ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('✅ Dashboard client connected via WebSocket.');
    ws.on('close', () => console.log('❌ Dashboard client disconnected.'));
});

/**
 * @function broadcast
 * @description یک پیام را برای تمام کلاینت‌های متصل WebSocket ارسال می‌کند.
 * @param {object} data - داده‌ای که باید ارسال شود.
 */
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

// --- موتور تحلیل چند-منبعی (بدون تغییر) ---
// ... (کد موتور تحلیل از نسخه قبل در اینجا قرار می‌گیرد و بدون تغییر است)
const ANALYSIS_INTERVAL = 5000;
const TIME_WINDOW_SECONDS = 10;
const PRICE_DEVIATION_THRESHOLD_PIPS = 2.0;
async function analyzeTickData() {
    try {
        const timeWindow = new Date(Date.now() - TIME_WINDOW_SECONDS * 1000);
        const recentTicks = await Tick.find({ serverTimestamp: { $gte: timeWindow } });
        if (recentTicks.length < 2) return;
        const referenceTicks = recentTicks.filter(t => t.sourceIdentifier === REFERENCE_SOURCE_ID);
        if (referenceTicks.length === 0) return;
        const lastReferenceTick = referenceTicks[referenceTicks.length - 1];
        const targetTicksBySource = recentTicks.filter(t => t.sourceIdentifier !== REFERENCE_SOURCE_ID).reduce((acc, tick) => {
            if (!acc[tick.sourceIdentifier]) acc[tick.sourceIdentifier] = [];
            acc[tick.sourceIdentifier].push(tick);
            return acc;
        }, {});
        for (const sourceId in targetTicksBySource) {
            const targetTicks = targetTicksBySource[sourceId];
            const lastTargetTick = targetTicks[targetTicks.length - 1];
            const priceDifference = Math.abs(lastTargetTick.bid - lastReferenceTick.bid);
            const pipsDifference = priceDifference / 0.0001;
            if (pipsDifference > PRICE_DEVIATION_THRESHOLD_PIPS) {
                const message = `اختلاف قیمت شدید ${pipsDifference.toFixed(2)} پیپ در منبع '${sourceId}' شناسایی شد.`;
                const existingAlert = await Alert.findOne({
                    sourceIdentifier: sourceId,
                    alertType: 'Price_Deviation_Spike',
                    timestamp: { $gte: new Date(Date.now() - 60000) }
                });
                if (!existingAlert) {
                    console.log(`🚨 CRITICAL ANOMALY: ${message}`);
                    const newAlert = new Alert({
                        sourceIdentifier: sourceId,
                        alertType: 'Price_Deviation_Spike',
                        severity: 'Critical',
                        message: message,
                        symbol: lastTargetTick.symbol,
                        snapshot: { targetPrice: lastTargetTick.bid, referencePrice: lastReferenceTick.bid, priceDifference: priceDifference }
                    });
                    await newAlert.save();
                    broadcast({ type: 'new_alert', payload: newAlert }); // ارسال هشدار جدید به داشبورد
                }
            }
        }
    } catch (error) {
        console.error("Error during analysis engine execution:", error);
    }
}


// --- اندپوینت‌ها (API Endpoints) ---

// اندپوینت /tick اکنون داده‌ها را به داشبورد نیز broadcast می‌کند
app.post('/tick', async (req, res) => {
    // console.log(req.body);
    
    try {
        const tickData = req.body;
        const newTick = new Tick(tickData);
        await newTick.save();
        
        // ارسال تیک جدید به تمام کلاینت‌های داشبورد
        broadcast({ type: 'tick', payload: tickData });
        
        res.status(201).json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to save tick data.' });
    }
});

app.get('/api/alerts', async (req, res) => {
    try {
        const { source } = req.query;
        let query = {};
        if (source) {
            query.sourceIdentifier = source;
        }
        const alerts = await Alert.find(query).sort({ timestamp: -1 }).limit(50);
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch alerts.' });
    }
});

// --- راه‌اندازی سرور ---
async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Successfully connected to MongoDB via Mongoose.`);
        
        // به جای app.listen، از server.listen استفاده می‌کنیم
        server.listen(PORT, () => {
            console.log(`🚀 Propping Board Server (v5.0 with WebSocket) is running on http://localhost:${PORT}`);
            setInterval(analyzeTickData, ANALYSIS_INTERVAL);
        });
    } catch (err) {
        console.error("❌ Could not connect to MongoDB.", err.message);
        process.exit(1);
    }
}

startServer();
