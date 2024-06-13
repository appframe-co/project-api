import { TDoc, TEntry, TEntryInput, TEntryOutput } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

import { List } from '@/controllers/entry/list.controller';
import { Count } from '@/controllers/entry/count.controller';
import { CreateEntry } from '@/controllers/entry/create-entry.controller';

const router = express.Router();

type TQueryList = {
    sinceId: string;
    limit: string;
    page: string;
    fields: string;
    ids: string;
}

router.post('/:code.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        const {entry} = req.body as {entry: TEntryInput};

        const data: {entry: TEntryOutput|null, errors: any} = await CreateEntry({userId, projectId, code}, {entry});

        res.status(201).json(data);
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

router.get('/:code.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        const {sinceId, limit=50, page=1, fields, ids} = req.query as TQueryList;

        const entries: TEntryOutput[] = await List({userId, projectId, code}, {sinceId, limit, page, fields, ids, languages: res.locals.languages})

        res.json({entries});
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

router.get('/:code/count.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};

        const count = await Count({userId, projectId, code});

        res.json({count});
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

export default router;