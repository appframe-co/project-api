import { TEntryInput, TEntryOutput, TTranslationOutput } from '@/types/types';
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
    section_code: string;
    translations: string;
}
type TOutput = {
    entries: TEntryOutput[];
    translations?: TTranslationOutput[];
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
        const {sinceId, limit=50, page=1, fields, ids, section_code:sectionCode, translations, ...doc} = req.query as TQueryList;

        const {entries, translations: translationsOutput}: TOutput = await List(
            {userId, projectId, code}, 
            {sinceId, limit, page, fields, ids, sectionCode, translations, doc}
        );

        res.json({entries, translations: translationsOutput});
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