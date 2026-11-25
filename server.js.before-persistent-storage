import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(cookieParser());
app.get("/admin", (req,res)=>{
  const token=req.cookies.admin_session;
  if(!token || token!==process.env.SESSION_SECRET) return res.redirect("/admin-login.html");
  res.sendFile(path.join(__dirname,"public","admin.html"));
});
app.get("/admin.html", (req,res)=>{
  const token=req.cookies.admin_session;
  if(!token || token!==process.env.SESSION_SECRET) return res.redirect("/admin-login.html");
  res.sendFile(path.join(__dirname,"public","admin.html"));
});
app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  setHeaders(res,filePath){ if(filePath.endsWith("/admin.html")) res.setHeader("Cache-Control","no-store"); }
}));

const defaultDb = {
  shipments: [
    {
      trackingNumber: "SPX123456789",
      status: "In Flight",
      sender: { name: "Demo Sender", contact: "+234 800 000 0000" },
      recipient: { name: "John Doe", contact: "+34 612 345 678", address: "Madrid, Spain" },
      origin: "Lagos, Nigeria",
      originFlag: "🇳🇬",
      destination: "Madrid, Spain",
      destinationFlag: "🇪🇸",
      service: "Express International",
      parcelType: "Document",
      weight: "2.5 kg",
      reference: "INV-2025-001",
      estimatedDelivery: "2026-09-15",
      currentLocation: "En route to Madrid, Spain",
      events: [
        { date: "2026-09-13", time: "09:40", location: "En route to Madrid, Spain", status: "In Flight", note: "Your parcel is currently in flight to the destination country." },
        { date: "2026-09-12", time: "10:24", location: "Lagos, Nigeria", status: "Departed from origin facility", note: "Shipment departed the origin facility." },
        { date: "2026-09-11", time: "18:15", location: "Lagos, Nigeria", status: "Picked up by courier", note: "Parcel collected by courier." },
        { date: "2026-09-11", time: "14:30", location: "Lagos, Nigeria", status: "Shipment information received", note: "Shipping information received." }
      ]
    }
  ]
};

function loadDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function auth(req, res, next) {
  const token = req.cookies.admin_session;
  if (!token || token !== process.env.SESSION_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}
function normalize(s) { return String(s || "").trim(); }

function generateTrackingNumber(db) {
  let tracking;
  do {
    const digits = crypto.randomInt(1000000000, 10000000000).toString();
    tracking = `SPX${digits}`;
  } while (db.shipments.some(s => String(s.trackingNumber).toUpperCase() === tracking));
  return tracking;
}

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    res.cookie("admin_session", process.env.SESSION_SECRET, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production"
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_session");
  res.json({ ok: true });
});

app.get("/api/admin/me", auth, (req, res) => res.json({ ok: true, email: process.env.ADMIN_EMAIL }));

app.get("/api/shipments", auth, (req, res) => {
  const db = loadDb();
  res.json(db.shipments);
});

app.get("/api/track/:trackingNumber", (req, res) => {
  const db = loadDb();
  const trackingNumber = normalize(req.params.trackingNumber).toUpperCase();
  const shipment = db.shipments.find(s => s.trackingNumber.toUpperCase() === trackingNumber);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  res.json(shipment);
});

app.post("/api/shipments", auth, (req, res) => {
  const db = loadDb();
  const body = req.body || {};
  const trackingNumber = generateTrackingNumber(db);

  const shipment = {
    trackingNumber,
    status: normalize(body.status) || "Shipment information received",
    sender: { name: normalize(body.senderName), contact: normalize(body.senderContact) },
    recipient: { name: normalize(body.recipientName), contact: normalize(body.recipientContact), address: normalize(body.recipientAddress) },
    origin: normalize(body.origin),
    originFlag: normalize(body.originFlag),
    destination: normalize(body.destination),
    destinationFlag: normalize(body.destinationFlag),
    service: normalize(body.service),
    parcelType: normalize(body.parcelType),
    weight: normalize(body.weight),
    reference: normalize(body.reference),
    estimatedDelivery: normalize(body.estimatedDelivery),
    currentLocation: normalize(body.currentLocation) || normalize(body.origin),
    events: []
  };
  db.shipments.unshift(shipment);
  saveDb(db);
  res.status(201).json(shipment);
});

app.put("/api/shipments/:trackingNumber", auth, (req, res) => {
  const db = loadDb();
  const trackingNumber = normalize(req.params.trackingNumber).toUpperCase();
  const shipment = db.shipments.find(s => s.trackingNumber === trackingNumber);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const b = req.body || {};
  const fields = ["status","origin","originFlag","destination","destinationFlag","service","parcelType","weight","reference","estimatedDelivery","currentLocation"];
  for (const f of fields) if (b[f] !== undefined) shipment[f] = normalize(b[f]);
  if (b.sender) shipment.sender = { ...shipment.sender, ...b.sender };
  if (b.recipient) shipment.recipient = { ...shipment.recipient, ...b.recipient };
  saveDb(db);
  res.json(shipment);
});

app.post("/api/shipments/:trackingNumber/events", auth, (req, res) => {
  const db = loadDb();
  const trackingNumber = normalize(req.params.trackingNumber).toUpperCase();
  const shipment = db.shipments.find(s => s.trackingNumber === trackingNumber);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const { date, time, location, status, note } = req.body || {};
  if (!date || !time || !location || !status) {
    return res.status(400).json({ error: "Date, time, location and status are required" });
  }
  shipment.events.unshift({ date, time, location: normalize(location), status: normalize(status), note: normalize(note) });
  shipment.status = normalize(status);
  shipment.currentLocation = normalize(location);
  saveDb(db);
  res.status(201).json(shipment);
});

app.delete("/api/shipments/:trackingNumber", auth, (req, res) => {
  const db = loadDb();
  const trackingNumber = normalize(req.params.trackingNumber).toUpperCase();
  const before = db.shipments.length;
  db.shipments = db.shipments.filter(s => s.trackingNumber !== trackingNumber);
  if (db.shipments.length === before) return res.status(404).json({ error: "Shipment not found" });
  saveDb(db);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`SpeedieX running on http://localhost:${PORT}`));
