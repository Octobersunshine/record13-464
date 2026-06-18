const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
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

router.patch('/:id/avatar', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
