require('mongoose').connect(require('dotenv').config().parsed.MONGO_URI).then(async () => {
  await require('./src/models/MarketplaceRequest.js').updateMany(
    { status: 'PENDING', reofferedAt: null },
    { $set: { reofferedAt: new Date() } }
  );
  console.log('Fixed data');
  process.exit(0);
});
