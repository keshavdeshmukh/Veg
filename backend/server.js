require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ── MONGODB CONNECTION ──────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── MODELS ─────────────────────────────────────────

const productSchema = new mongoose.Schema({
  emoji:    { type: String, default: '🥦' },
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  stock:    { type: Number, required: true, default: 0 },
  minStock: { type: Number, default: 10 },
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  emoji:       String,
  qty:         Number,
  price:       Number,
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number },
  customer:    { type: String, required: true },
  phone:       { type: String, default: '' },
  items:       [orderItemSchema],
  total:       { type: Number, required: true },
  status:      { type: String, enum: ['Pending','Delivered','Cancelled'], default: 'Pending' },
}, { timestamps: true });

// Auto-increment order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const last = await Order.findOne().sort({ orderNumber: -1 });
    this.orderNumber = last ? last.orderNumber + 1 : 1001;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
const Order   = mongoose.model('Order',   orderSchema);

// ── PRODUCT ROUTES ──────────────────────────────────

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH update product (stock, price, etc.)
app.patch('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORDER ROUTES ────────────────────────────────────

// GET all orders (with optional status filter)
app.get('/api/orders', async (req, res) => {
  try {
    const filter = req.query.status && req.query.status !== 'All'
      ? { status: req.query.status } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create order (auto-deduct stock)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, phone, items } = req.body;

    // Validate & fetch products, calculate total
    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });
      if (product.stock < item.qty) return res.status(400).json({ error: `Not enough stock for ${product.name}. Available: ${product.stock}kg` });

      // Deduct stock
      product.stock -= item.qty;
      await product.save();

      total += product.price * item.qty;
      enrichedItems.push({
        productId: product._id,
        productName: product.name,
        emoji: product.emoji,
        qty: item.qty,
        price: product.price,
      });
    }

    const order = new Order({ customer, phone, items: enrichedItems, total });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH update order status
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DASHBOARD STATS ─────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    const [todayOrders, lowStock, totalProducts, salesData] = await Promise.all([
      Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Product.countDocuments({ $expr: { $lte: ['$stock', '$minStock'] } }),
      Product.countDocuments(),
      Order.find({ status: 'Delivered', createdAt: { $gte: todayStart, $lte: todayEnd } }),
    ]);

    const todayRevenue = salesData.reduce((s, o) => s + o.total, 0);

    res.json({
      todayRevenue,
      todayOrders: todayOrders.length,
      lowStock,
      totalProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SALES REPORT ────────────────────────────────────
app.get('/api/sales', async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const days = { week: 7, month: 30, year: 365 }[period] || 7;
    const from = new Date(Date.now() - days * 86400000);

    const orders = await Order.find({ status: 'Delivered', createdAt: { $gte: from } });

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    // Bar chart — last 7 days
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayData = Array(7).fill(0);
    orders.forEach(o => {
      const d = new Date(o.createdAt).getDay();
      dayData[(d + 6) % 7] += o.total;
    });

    // Top selling products
    const vegMap = {};
    orders.forEach(o => o.items.forEach(i => {
      const key = i.productId?.toString() || i.productName;
      if (!vegMap[key]) vegMap[key] = { name: i.productName, emoji: i.emoji, qty: 0, rev: 0 };
      vegMap[key].qty += i.qty;
      vegMap[key].rev += i.qty * i.price;
    }));
    const topVegs = Object.values(vegMap).sort((a, b) => b.rev - a.rev).slice(0, 5);

    res.json({ totalRevenue, totalOrders: orders.length, dayLabels, dayData, topVegs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEED SAMPLE DATA (only if DB is empty) ──────────
app.post('/api/seed', async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return res.json({ message: 'Already has data, skipping seed.' });

    await Product.insertMany([
      { emoji:'🍅', name:'Tomato',   price:40, stock:80, minStock:15 },
      { emoji:'🥕', name:'Carrot',   price:35, stock:60, minStock:10 },
      { emoji:'🥦', name:'Broccoli', price:80, stock:8,  minStock:10 },
      { emoji:'🧅', name:'Onion',    price:25, stock:120,minStock:20 },
      { emoji:'🥔', name:'Potato',   price:20, stock:5,  minStock:10 },
      { emoji:'🌽', name:'Corn',     price:15, stock:50, minStock:10 },
    ]);
    res.json({ message: '✅ Sample products seeded!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
