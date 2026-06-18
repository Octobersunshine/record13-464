const Router = require('@koa/router');
const router = new Router({ prefix: '/api/orders' });

const orderCreateSchema = {
  items: 'array',
  totalPrice: 'number',
  address: 'string',
  phone: 'string',
  remark: 'string'
};

// 创建订单 - 上线中
router.post('/', (ctx) => {
  const { items, totalPrice, address, phone, remark } = ctx.request.body;
  ctx.body = { success: true, id: Date.now(), items, totalPrice, address, phone, remark };
});

// @experimental - 订单状态更新接口
router.put('/:id', (ctx) => {
  const status = ctx.request.body.status;
  const trackingNumber = ctx.request.body.trackingNumber;
  ctx.body = { success: true, id: ctx.params.id, status, trackingNumber };
});

// @deprecated 此接口已废弃
router.patch('/:id/cancel', (ctx) => {
  const reason = ctx.request.body.reason;
  const cancelledBy = ctx.request.body.cancelledBy;
  ctx.body = { success: true, id: ctx.params.id, reason, cancelledBy };
});

module.exports = router;
