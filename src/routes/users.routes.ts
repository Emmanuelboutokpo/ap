import { Router } from 'express';

import { deleteUser, getEmployeesAndControleurs, getUser, getUsers, updateUser, updateUserRole } from '../controllers/users.controller';

import type { Router as ExpressRouter } from 'express';
import { onlyMaitre, requireSignin } from '../middlewares/requireSignin';
const router: ExpressRouter = Router();


// Routes
  router.get('/user/me/',requireSignin, getUser);
  router.get('/users/team', getEmployeesAndControleurs);
  router.get('/users', getUsers);
  router.put('/users/:id', updateUser);
  router.put('/users/:id/role', onlyMaitre, updateUserRole);
  router.delete('/users/:id', deleteUser);


export default router;
