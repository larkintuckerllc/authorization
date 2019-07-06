import cors from 'cors';
import express from 'express';
import { Action, authenticate, authorize } from './auth';
import pg from './pg';

interface Todo {
  id: number;
  name: string;
}

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send({ hello: 'world' }));
app.get('/todos', authenticate, authorize('todos', Action.read), async (req, res) => {
  const todos = await pg.select().from<Todo>('todos');
  res.send(todos);
});

app.post('/todos', authenticate, authorize('todos', Action.create), async (req, res) => {
  // TODO: IMPLEMENT
  res.send('yes');
});
app.listen(3000, () => console.log('Example app listening on port 3000!'));
