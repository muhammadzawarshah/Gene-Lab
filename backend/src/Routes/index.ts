// src/routes/index.ts
import { Router } from 'express';
import distributionroute from './distribution.routes.js'
import financeRoutes from './finance.routes.js';
import reportRoutes from './report.routes.js';
import purchaseRoute from './purchase.routes.js'
import userRoutes from './user.routes.js';
import Productroute from './product.routes.js'
import Party from './party.routes.js';
import MasterRoute from './master.routes.js';
import CategoryRoute from './category.route.js';
import Warehouse from './warehouse.route.js';
import Province from './province.routes.js';
import Inventory from './inventory.route.js';
import Grn from './grn.route.js';
import Stock from './stock.route.js';
import ProductPriceRoute from './productprice.route.js';
import BatchRoute from './batch.route.js';
import DistrictRoute from './district.route.js';
import accountsRoutes from './accounts.routes.js';
import { v1 } from 'uuid';
const v1Router = Router();

v1Router.use('/distribution', distributionroute);
v1Router.use('/finance', financeRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/purchase', purchaseRoute);
v1Router.use('/users', userRoutes);
v1Router.use('/product', Productroute);
v1Router.use('/party', Party);
v1Router.use('/erp', MasterRoute);
v1Router.use('/category', CategoryRoute);
v1Router.use('/warehouse', Warehouse);
v1Router.use('/province', Province);
v1Router.use('/inventory', Inventory);
v1Router.use('/grn', Grn);
v1Router.use('/Stock', Stock);
v1Router.use('/productprice', ProductPriceRoute);
v1Router.use('/batch', BatchRoute);
v1Router.use('/district', DistrictRoute);
v1Router.use('/accounts', accountsRoutes);

export default v1Router;
