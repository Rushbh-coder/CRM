// Sends "id" instead of "_id" to the frontend and hides internal fields.
function toJSONPlugin(schema) {
  const transform = (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.org;
    delete ret.password;
    return ret;
  };
  schema.set('toJSON', { virtuals: false, transform });
  schema.set('toObject', { virtuals: false, transform });
}

module.exports = { toJSONPlugin };
