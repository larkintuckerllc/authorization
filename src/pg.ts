import knex from 'knex';

export default knex({
  client: 'pg',
  connection: {
    database: 'example',
    host: 'localhost',
    password: 'mysecretpassword',
    user: 'postgres',
  },
});
