import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import { listPlanItems, listPlans, listSongs, updatePlanItemSong } from '../api.js';
const credentialsSchema = z.object({
    appId: z.string().min(1),
    appSecret: z.string().min(1),
});
const t = initTRPC.create({
    transformer: superjson,
});
export const appRouter = t.router({
    listSongs: t.procedure.input(credentialsSchema).query(({ input }) => listSongs(input)),
    listPlans: t.procedure
        .input(z.object({
        credentials: credentialsSchema,
        serviceTypeId: z.string().min(1),
        pageSize: z.number().int().min(1).max(50),
    }))
        .query(({ input }) => listPlans(input.credentials, input.serviceTypeId, input.pageSize)),
    listPlanItems: t.procedure
        .input(z.object({
        credentials: credentialsSchema,
        serviceTypeId: z.string().min(1),
        planId: z.string().min(1),
    }))
        .query(({ input }) => listPlanItems(input.credentials, input.serviceTypeId, input.planId)),
    updatePlanItemSong: t.procedure
        .input(z.object({
        credentials: credentialsSchema,
        serviceTypeId: z.string().min(1),
        planId: z.string().min(1),
        itemId: z.string().min(1),
        songId: z.string().min(1),
    }))
        .mutation(({ input }) => updatePlanItemSong(input.credentials, input.serviceTypeId, input.planId, input.itemId, input.songId)),
});
