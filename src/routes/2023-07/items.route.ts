import { TItemOutput, TMenuOutput } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

import { List } from '@/controllers/menu/list.controller';

const router = express.Router();

router.get('/:code.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        let {depth_level:depthLevel=1} = req.query as {depth_level: string};
        const limit=50, page=1;

        depthLevel = +depthLevel;

        const items: TItemOutput[] = await List({userId, projectId, code}, {limit, page, languages: res.locals.languages, depthLevel})

        res.json({items});
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

export default router;