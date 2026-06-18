const Router = require('@koa/router');
const router = new Router({ prefix: '/api/orders' });

router.get('/', (ctx) => {
  ctx.body = [{ id: 1, status: 'pending' }];
});

router.get('/:id', (ctx) => {
  ctx.body = { id: ctx.params.id, status: 'pending' };
});

router.post('/', (ctx) => {
  ctx.body = { success: true, id: 2 };
});

router.put('/:id', (ctx) => {
  ctx.body = { success: true };
});

router.del('/:id', (ctx) => {
  ctx.body = { success: true };
});

module.exports = router;
