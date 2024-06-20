import { TProjectOutput } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

import { Info } from '@/controllers/project/info.controller';

const router = express.Router();

router.get('/info.json', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        
        const project: TProjectOutput = await Info({userId, projectId});
        
        res.json({project});
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({errors: message});
    }
});

export default router;