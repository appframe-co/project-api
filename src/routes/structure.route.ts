import { TEntry } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        const {sinceId, limit=50} = req.query as {sinceId: string, limit: string};

        const resFetchStructures = await fetch(`${process.env.URL_STRUCTURE_SERVICE}/api/structures?userId=${userId}&projectId=${projectId}&code=${code}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const { structures } = await resFetchStructures.json();

        const structureId: string = structures[0]['id'];

        let queryString = `${process.env.URL_ENTRY_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&structureId=${structureId}&limit=${limit}`;
        if (sinceId) {
            queryString += `&sinceId=${sinceId}`;
        }
        const resFetch = await fetch(queryString, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const {entries}: {entries: TEntry[]} = await resFetch.json();

        const output = entries.map(entry => ({
            id: entry.id,
            ...entry.doc
        }))

        res.json(output);
    } catch (e) {
        res.json({error: 'error'});
    }
});

export default router;