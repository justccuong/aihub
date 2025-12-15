import { AppType } from '@/backend';
import { hc } from 'hono/client';

export const honoClient = hc<AppType>('/');