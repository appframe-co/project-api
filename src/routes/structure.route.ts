import { TDoc, TEntry, TErrorResponse, TFile, TStructure } from '@/types/types';
import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

function isErrorStructures(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorEntries(data: TErrorResponse | {entries: TEntry[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorEntriesCount(data: TErrorResponse | {count: number}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

router.get('/:code', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const {userId, projectId} = res.locals as {userId: string, projectId: string};
        const {code} = req.params as {code: string};
        const {sinceId, limit=50, page=1} = req.query as {sinceId: string, limit: string, page: string};

        let data: TDoc[], structureId: string;
        {
            const resFetchStructures = await fetch(`${process.env.URL_STRUCTURE_SERVICE}/api/structures?userId=${userId}&projectId=${projectId}&code=${code}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchStructures: TErrorResponse|{structures: TStructure[]} = await resFetchStructures.json();
            if (isErrorStructures(dataFetchStructures)) {
                throw new Error('Structure Invalid');
            }
            if (!dataFetchStructures.structures.length) {
                throw new Error('Structure not exist');
            }

            const structure = dataFetchStructures.structures[0];
            structureId = structure.id;

            let queryString = `${process.env.URL_ENTRY_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&structureId=${structure.id}&limit=${limit}&page=${page}`;
            if (sinceId) {
                queryString += `&sinceId=${sinceId}`;
            }
            const resFetchEntries = await fetch(queryString, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchEntries: TErrorResponse|{entries: TEntry[]} = await resFetchEntries.json();
            if (isErrorEntries(dataFetchEntries)) {
                throw new Error('Error entries');
            }
    
            const bricks = structure.bricks.reduce((acc: {[key:string]:{type:string}}, b) => {
                acc[b.key] = {type: b.type};
                return acc;
            }, {});
    
            const output = dataFetchEntries.entries.map(entry => {
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

            data = output;
        }

        let count: number;
        {
            const resFetchCount = await fetch(`${process.env.URL_ENTRY_SERVICE}/api/entries/count?userId=${userId}&projectId=${projectId}&structureId=${structureId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchCount: TErrorResponse|{count: number} = await resFetchCount.json();
            if (isErrorEntriesCount(dataFetchCount)) {
                throw new Error('Error entries count');
            }
            count = dataFetchCount.count;
        }

        res.json({count, data});
    } catch (e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message;
        }

        res.json({error: message});
    }
});

export default router;