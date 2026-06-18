const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { z } = require('zod');

const userCreateSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  age: Joi.number().optional(),
  avatar: Joi.string().optional()
});

const userUpdateSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  bio: z.string().optional()
});

router.post('/', (req, res) => {
  const { error } = userCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  const { username, email, password, age, avatar } = req.body;
  res.json({ success: true, username, email, age });
});

router.put('/:id', (req, res) => {
  const data = userUpdateSchema.parse(req.body);
  const userId = req.params.id;
  res.json({ success: true, id: userId, ...data });
});

router.patch('/:id/avatar', (req, res) => {
  const avatarUrl = req.body.avatar;
  const description = req.body['description'];
  res.json({ success: true, avatarUrl, description });
});

module.exports = router;
