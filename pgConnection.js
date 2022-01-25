
import pg from 'pg';


const { Pool } = pg ;
// var pgConnectionConfigs = {
//   user: 'tanfeng95',
//   host: 'localhost',
//   database: 'books',
//   port: 5432, // Postgres server always runs on this port by default
// };
let pgConnectionConfigs;

// test to see if the env var is set. Then we know we are in Heroku
if (process.env.DATABASE_URL) {
  // pg will take in the entire value and use it to connect
  pgConnectionConfigs = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // this is the same value as before
  pgConnectionConfigs = {
    user: 'tanfeng95',
    host: 'localhost',
    database: 'books',
    port: 5432,
  };
}

const pool = new Pool(pgConnectionConfigs);


export {pool}  ;