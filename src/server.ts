import bodyParser from 'body-parser';
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
app.use(bodyParser.json());

app.get('/', (req, res) => res.send({ hello: 'world' }));

app.get('/todos', authenticate, authorize('todos', Action.read), async (req, res) => {
  try {
    const todos = await pg.select().from<Todo>('todos');
    res.send(todos);
  } catch (err) {
    res.status(500).send();
  }
});

app.post('/todos', authenticate, authorize('todos', Action.create), async (req, res) => {
  const name = req.body.name;
  if (typeof name !== 'string') {
    res.status(400).send();
    return;
  }
  try {
    const [id] = await pg('todos')
      .returning('id')
      .insert({ name });
    const todo = {
      id,
      name,
    };
    res.send(todo);
  } catch (err) {
    res.status(500).send();
  }
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
