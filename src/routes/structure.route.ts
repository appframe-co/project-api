import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};

        const resFetchStructures = await fetch(`${process.env.URL_STRUCTURE_SERVICE}/api/structures?userId=${userId}&projectId=${projectId}&code=${code}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const { structures } = await resFetchStructures.json();

        const structureId: string = structures[0]['id'];

        const resFetch = await fetch(`${process.env.URL_DATA_SERVICE}/api/data?userId=${userId}&projectId=${projectId}&structureId=${structureId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await resFetch.json();

        res.json(data);
    } catch (e) {
        res.json({error: 'error'});
    }
});

export default router;