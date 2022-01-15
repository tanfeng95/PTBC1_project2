
import pg from 'pg';

const { Pool } = pg ;
var pgConnectionConfigs = {
  user: 'tanfeng95',
  host: 'localhost',
  database: 'books',
  port: 5432, // Postgres server always runs on this port by default
};

const pool = new Pool(pgConnectionConfigs);


export {pool}  ;