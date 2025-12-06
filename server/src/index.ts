import { createServer } from 'http';

import { createApp } from './app';
import { config } from './config';

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
