// Propping Board - Backend Server
// Version 7.0 - Combined Analysis & Simulation Engines
// وظیفه: اجرای دو موتور مجزا برای نظارت بر تخلفات و شبیه‌سازی معاملات مجازی
// this version for git confilict
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// --- تنظیمات اصلی ---
const PORT = 5000;
const MONGO_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@127.0.0.1:27017/propping_board_db_mongoose?authSource=admin`;
const REFERENCE_SOURCE_ID = "reference_lmax";

// --- تعریف Schema ها ---
const tickSchema = new mongoose.Schema({ sourceIdentifier: { type: String, required: true, index: true }, bid: Number, ask: Number, time_msc: {type: Number, index: true} });
const alertSchema = new mongoose.Schema({ sourceIdentifier: { type: String, required: true, index: true }, alertType: { type: String, required: true }, severity: { type: String, required: true }, message: { type: String, required: true }, symbol: { type: String, required: true }, timestamp: { type: Date, default: Date.now }, snapshot: { targetPrice: Number, referencePrice: Number, priceDifference: Number } });
const virtualTradeSchema = new mongoose.Schema({ traceID: { type: String, required: true, unique: true, default: () => uuidv4() }, symbol: { type: String, required: true }, tradeType: { type: String, required: true, enum: ['buy', 'sell'] }, status: { type: String, required: true, default: 'pending_entry' }, requestedEntry: { type: Number, required: true }, stopLoss: { type: Number, required: true }, takeProfit: { type: Number, required: true }, createdAt: { type: Date, default: Date.now }, results: [{ sourceIdentifier: String, status: { type: String, default: 'pending_entry' }, entryPrice: Number, closePrice: Number }] });

// --- ساخت Model ها ---
const Tick = mongoose.model('Tick', tickSchema);
const Alert = mongoose.model('Alert', alertSchema);
const VirtualTrade = mongoose.model('VirtualTrade', virtualTradeSchema);

// --- راه‌اندازی سرور ---
const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let latestTicks = {}; // کش در حافظه برای آخرین تیک هر منبع

wss.on('connection', (ws) => {
    console.log('✅ Dashboard client connected.');
    ws.on('message', (message) => handleWebSocketMessage(message, ws));
    ws.on('close', () => console.log('❌ Dashboard client disconnected.'));
});

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

async function handleWebSocketMessage(message, ws) {
    try {
        const data = JSON.parse(message);
        if (data.type === 'create_virtual_trade') {
            const newTrade = new VirtualTrade(data.payload);
            await newTrade.save();
            console.log(`✅ Virtual trade ${newTrade.traceID} saved.`);
            ws.send(JSON.stringify({ type: 'virtual_trade_created', payload: newTrade }));
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
    }
}

// =================================================================
//                      موتور تحلیل (ناظر)
// =================================================================
const ANALYSIS_INTERVAL = 5000;
const PRICE_DEVIATION_THRESHOLD_PIPS = 2.0;

async function analysisEngine() {
    const referenceTick = latestTicks[REFERENCE_SOURCE_ID];
    if (!referenceTick) return; // بدون مرجع، تحلیلی ممکن نیست

    for (const sourceId in latestTicks) {
        if (sourceId === REFERENCE_SOURCE_ID) continue;

        const targetTick = latestTicks[sourceId];
        const priceDifference = Math.abs(targetTick.bid - referenceTick.bid);
        const pipsDifference = priceDifference / 0.0001;

        if (pipsDifference > PRICE_DEVIATION_THRESHOLD_PIPS) {
            const message = `اختلاف قیمت شدید ${pipsDifference.toFixed(2)} پیپ در منبع '${sourceId}' شناسایی شد.`;
            console.log(`🚨 MONITOR: ${message}`);
            
            const newAlert = new Alert({
                sourceIdentifier: sourceId,
                alertType: 'Price_Deviation_Spike',
                severity: 'Critical',
                message: message,
                symbol: targetTick.symbol,
                snapshot: { targetPrice: targetTick.bid, referencePrice: referenceTick.bid, priceDifference: priceDifference }
            });
            await newAlert.save();
            broadcast({ type: 'new_alert', payload: newAlert });
        }
    }
}

// =================================================================
//                      موتور شبیه‌سازی
// =================================================================
const SIMULATION_INTERVAL = 2000;

async function simulationEngine() {
    const activeTrades = await VirtualTrade.find({ status: { $ne: 'closed' } });

    for (const trade of activeTrades) {
        let tradeUpdated = false;
        const sources = Object.keys(latestTicks);
        if (trade.results.length === 0) {
            trade.results = sources.map(id => ({ sourceIdentifier: id, status: 'pending_entry' }));
        }

        for (const result of trade.results) {
            if (result.status.includes('closed')) continue;
            const tick = latestTicks[result.sourceIdentifier];
            if (!tick) continue;

            const price = trade.tradeType === 'buy' ? tick.ask : tick.bid;
            const closePrice = trade.tradeType === 'buy' ? tick.bid : tick.ask;

            if (result.status === 'pending_entry') {
                if ((trade.tradeType === 'buy' && price >= trade.requestedEntry) || (trade.tradeType === 'sell' && price <= trade.requestedEntry)) {
                    result.status = 'active';
                    result.entryPrice = price;
                    tradeUpdated = true;
                }
            } else if (result.status === 'active') {
                if ((trade.tradeType === 'buy' && closePrice <= trade.stopLoss) || (trade.tradeType === 'sell' && closePrice >= trade.stopLoss)) {
                    result.status = 'closed_sl';
                    result.closePrice = trade.stopLoss;
                    tradeUpdated = true;
                } else if ((trade.tradeType === 'buy' && closePrice >= trade.takeProfit) || (trade.tradeType === 'sell' && closePrice <= trade.takeProfit)) {
                    result.status = 'closed_tp';
                    result.closePrice = trade.takeProfit;
                    tradeUpdated = true;
                }
            }
        }

        if (trade.results.every(r => r.status.includes('closed'))) {
            trade.status = 'closed';
            tradeUpdated = true;
        }
        
        if (tradeUpdated) {
            await trade.save();
            broadcast({ type: 'virtual_trade_update', payload: trade });
        }
    }
}

// --- اندپوینت‌ها و راه‌اندازی نهایی ---
app.post('/tick', async (req, res) => {
    try {
        const tickData = req.body;
        const newTick = new Tick(tickData);
        await newTick.save();
        latestTicks[tickData.sourceIdentifier] = tickData;
        broadcast({ type: 'tick', payload: tickData });
        res.status(201).json({ status: 'success' });
    } catch (error) { res.status(500).json({status: 'error'}) }
});

app.get('/api/virtual-trades', async (req, res) => { /* ... */ });
app.get('/api/alerts', async (req, res) => { /* ... */ });

async function startServer() {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB.`);
    server.listen(PORT, () => {
        console.log(`🚀 Server (v7.0 with Dual Engines) is running on http://localhost:${PORT}`);
        // هر دو موتور را به صورت مستقل و با بازه‌های زمانی متفاوت فعال کن
        setInterval(analysisEngine, ANALYSIS_INTERVAL);
        setInterval(simulationEngine, SIMULATION_INTERVAL);
    });
}

startServer();
