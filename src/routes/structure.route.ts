import { TDoc, TEntry, TErrorResponse, TFile, TStructure } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

function isError(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return (data as TErrorResponse).error !== undefined; 
}

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
        const data: TErrorResponse | {structures: TStructure[]} = await resFetchStructures.json();
        if (isError(data)) {
            throw new Error('Error structure');
        }
        const structure = data.structures[0];

        let queryString = `${process.env.URL_ENTRY_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&structureId=${structure.id}&limit=${limit}`;
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

        const bricks = structure.bricks.reduce((acc: {[key:string]:{type:string}}, b) => {
            acc[b.key] = {type: b.type};
            return acc;
        }, {});

        const output = entries.map(entry => {
            const doc: TDoc = {id: entry.id};

            for (const [key, value] of Object.entries(entry.doc)) {
                if (bricks[key].type === 'file_reference' && value) {
                    const file: TFile = value;
                    doc[key] = {
                        width: file.width,
                        height: file.height,
                        contentType: file.contentType,
                        src: file.src,
                        alt: file.alt
                    };
                } 
                else if (bricks[key].type === 'list.file_reference' && value) {
                    doc[key] = value.map((file: TFile) => ({
                        width: file.width,
                        height: file.height,
                        contentType: file.contentType,
                        src: file.src,
                        alt: file.alt
                    }));
                }
                else {
                    doc[key] = value;
                }
            }

            return doc;
        });

        res.json(output);
    } catch (e) {
        res.json({error: 'error'});
    }
});

export default router;