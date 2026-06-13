import dotenv from 'dotenv';

import { AppEnv, parseEnv } from './env';

dotenv.config();

export const env: AppEnv = parseEnv(process.env);
