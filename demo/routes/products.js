const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Laptop', price: 999 }]);
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Laptop', price: 999 });
});

router.post('/', (req, res) => {
  res.json({ success: true, id: 2 });
});

router.put('/:id', (req, res) => {
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true });
});

router.get('/:id/reviews', (req, res) => {
  res.json([{ id: 1, rating: 5 }]);
});

router.post('/:id/reviews', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
