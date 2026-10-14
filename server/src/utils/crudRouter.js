const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');

const BLOCKED = ['_id', 'id', 'org', 'createdAt', 'updatedAt', '__v'];

// Builds list/get/create/update/delete routes for a model. Every query is limited to the
// logged-in user's organization, so one business can never see another's data.
function crudRouter(Model, { refFields = [], beforeSave } = {}) {
  const router = express.Router();

  async function clean(req, body, existing) {
    const data = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!BLOCKED.includes(k) && Model.schema.path(k)) data[k] = v;
    }
    for (const f of refFields) {
      if (!(f in data)) continue;
      if (!data[f]) { data[f] = null; continue; }
      if (!mongoose.isValidObjectId(data[f])) { const e = new Error(`Choose a valid ${f}.`); e.status = 400; throw e; }
      const ok = await User.exists({ _id: data[f], org: req.org });
      if (!ok) { const e = new Error(`That ${f} is not on your team.`); e.status = 400; throw e; }
    }
    if (beforeSave) beforeSave(data, existing);
    return data;
  }

  router.get('/', asyncHandler(async (req, res) => {
    const items = await Model.find({ org: req.org }).sort({ createdAt: -1 }).limit(5000);
    res.json(items);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, org: req.org });
    if (!item) return res.status(404).json({ message: 'That record was not found.' });
    res.json(item);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const data = await clean(req, req.body, null);
    if (refFields.includes('owner') && !data.owner) data.owner = req.user._id;
    if (refFields.includes('assignee') && !data.assignee) data.assignee = req.user._id;
    const item = await Model.create({ ...data, org: req.org });
    res.status(201).json(item);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const existing = await Model.findOne({ _id: req.params.id, org: req.org });
    if (!existing) return res.status(404).json({ message: 'That record was not found.' });
    const data = await clean(req, req.body, existing);
    existing.set(data);
    await existing.save();
    res.json(existing);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const item = await Model.findOneAndDelete({ _id: req.params.id, org: req.org });
    if (!item) return res.status(404).json({ message: 'That record was not found.' });
    res.json({ ok: true, id: req.params.id });
  }));

  return router;
}

module.exports = crudRouter;
