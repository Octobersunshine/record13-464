const express = require('express');
const router = express.Router();
const Joi = require('joi');

const productCreateSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().optional(),
  stock: Joi.number().default(0),
  category: Joi.string().optional(),
  tags: Joi.array().optional()
});

const productUpdateSchema = Joi.object({
  name: Joi.string(),
  price: Joi.number(),
  description: Joi.string(),
  stock: Joi.number(),
  category: Joi.string(),
  tags: Joi.array()
});

router.post('/', (req, res) => {
  const { error, value } = productCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  res.json({ success: true, id: Date.now(), ...value });
});

router.put('/:id', (req, res) => {
  const { error, value } = productUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  res.json({ success: true, id: req.params.id, ...value });
});

router.post('/:id/reviews', (req, res) => {
  const rating = req.body.rating;
  const comment = req.body.comment;
  const userId = req.body.userId;
  res.json({ success: true, rating, comment, userId });
});

module.exports = router;
