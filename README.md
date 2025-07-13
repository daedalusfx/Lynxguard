
---


# Lynxguard

![Lynxguard Logo](/Lynx-Gurd-Logo.png)

**An advanced monitoring platform for price validation and identifying discrepancies in proprietary trading.**

![License](https://img.shields.io/badge/License-GPLv3-blue.svg)
![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![MQL5](https://img.shields.io/badge/MQL5-0053A6?logo=metatrader&logoColor=white)

---

## 📌 Overview

**Lynxguard** is a powerful system designed for proprietary trading firms to validate price integrity across brokers. It compares real-time tick data between a target broker and a reference broker, detecting price anomalies and logging them for further analysis.

---

## ✨ Features

- ✅ Real-time monitoring of bid/ask prices from multiple brokers
- ⚠️ Automatic detection and logging of price anomalies
- 📊 Interactive dashboard with live charts and metrics (SvelteKit)
- 🧪 Safe trade simulator based on reference broker data
- 🧩 Modular design: MQL5 EA + Node.js Server + SvelteKit UI
- 🔓 Free & open-source under GNU GPLv3 license

---

```markdown

## 🧱 Architecture

```plaintext
+---------------------+      HTTP POST (Tick Data)      +-------------------------+
|   MQL5 Expert       | ------------------------------> |      Node.js Server     |
|  (datapub.mq5)      |                                 |  (Express, MongoDB, WS) |
| on MetaTrader 5     | <------------------------------ |                         |
+---------------------+      WebSocket (Commands)       +-------------------------+
                                                                    |
                                                                    | WebSocket (Live Data)
                                                                    v
                                                        +-------------------------+
                                                        |   SvelteKit Frontend    |
                                                        |  (Dashboard & Simulator)|
                                                        +-------------------------+
```

---

## 🧰 Tech Stack

| Layer        | Technologies                        |
| ------------ | ------------------------------------ |
| Frontend     | SvelteKit, TailwindCSS, Lightweight Charts |
| Backend      | Node.js, Express, WebSocket (ws), Mongoose |
| Database     | MongoDB                             |
| Data Capture | MQL5 (MetaTrader 5 Expert Advisor)  |

---

## 🚀 Getting Started

### 1. Backend (Node.js Server)

```bash
cd server
npm install
```

Create a `.env` file:

```env
MONGO_URI=mongodb://user:password@localhost:27017/lynxguard_db
```

Start the server:

```bash
node server.js
```

Default port: `5000`

---

### 2. Frontend (SvelteKit Dashboard)

```bash
# From project root
npm install
npm run dev
```

Access the dashboard at: [http://localhost:5173](http://localhost:5173)

---

### 3. MQL5 Expert Advisor (MetaTrader 5)

1. Open `datapub.mq5` in **MetaEditor**.
2. Set a unique value for the `source_identifier` input (e.g., `target_icmarkets`, `reference_lmax`).
3. Compile and attach the EA to your desired chart.
4. In **MetaTrader 5**:
   - Go to `Tools > Options > Expert Advisors`
   - Check `Allow WebRequest for listed URL`
   - Add `http://127.0.0.1:5000` to the list

---

## 🖼️ Screenshots

### Live Dashboard

![Dashboard](screenshots/sim.png)

### Anomaly Alert View

![Alert Example](screenshots/alert.png)

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to fork the repo, create a feature branch, and submit a pull request.

Steps:

```bash
git checkout -b feature/AmazingFeature
git commit -m "Add AmazingFeature"
git push origin feature/AmazingFeature
```

Or open an issue with the `enhancement` label.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.  
See the [LICENSE](LICENSE) file for more information.

---

```

---
