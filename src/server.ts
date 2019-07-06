import cors from 'cors';
import express from 'express';
import pg from './pg';

interface Todo {
  id: number;
  name: string;
}

interface ReadPermission {
  can_read: boolean;
}

const readPermissionReducer = (accumulator: boolean, currentValue: ReadPermission) =>
  accumulator || currentValue.can_read;

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send({ hello: 'world' }));
app.get('/todos', async (req, res) => {
  // AUTHENTICATE
  const user = req.headers.authorization;
  if (user === undefined) {
    res.status(401).send();
    return;
  }
  // AUTHORIZE
  const readPermissions = await pg
    .select<ReadPermission[]>('permissions_object.can_read')
    .from('users')
    .innerJoin('profiles', 'users.profile_id', 'profiles.id')
    .innerJoin('profiles_permissions', 'profiles.id', 'profiles_permissions.profile_id')
    .innerJoin('permissions', 'profiles_permissions.permission_id', 'permissions.id')
    .innerJoin('permissions_object', 'permissions.id', 'permissions_object.permission_id')
    .where({
      'permissions_object.object': 'todos',
      'users.name': user,
    });
  const readPermission = readPermissions.reduce(readPermissionReducer, false);
  if (!readPermission) {
    res.status(401).send();
    return;
  }
  const todos = await pg.select().from<Todo>('todos');
  res.send(todos);
});
// TODO CREATE TODO
// TODO GENERALIZE
app.listen(3000, () => console.log('Example app listening on port 3000!'));
