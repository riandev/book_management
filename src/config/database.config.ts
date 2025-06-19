import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri:
    (process.env.MONGODB_URI as string) ||
    'mongodb://localhost:27017/book_management',
}));
