import { TSectionOutput } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

import { List } from '@/controllers/section/list.controller';

const router = express.Router();

type TQueryProps = {
    depth_level: string;
    section_id: string|null;
    section_code: string|null;
}

router.get('/:code.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        let {depth_level:depthLevel=1, section_id:sectionId=null, section_code:sectionCode=null} = req.query as TQueryProps;
        const limit=50, page=1;

        depthLevel = +depthLevel;

        const data = await List({userId, projectId, code}, {limit, page, depthLevel, sectionId, sectionCode})

        res.json(data);
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

export default router;