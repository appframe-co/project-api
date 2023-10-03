import { TDoc, TEntry, TErrorResponse, TFile, TStructure, TEntryOutput } from "@/types/types";

function isErrorStructures(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

function isErrorEntries(data: TErrorResponse | {entries: TEntry[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

type TPayload = {
    limit: number|string;
    page: number|string;
    sinceId: string;
    fields: string;
    ids: string;
}

export async function List({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<TEntryOutput[]> {
    const {limit, page, sinceId, fields, ids} = payload;

    const arFields = fields ? fields.split(',') : [];

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
    
    let queryString = `${process.env.URL_ENTRY_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&structureId=${structure.id}&limit=${limit}&page=${page}`;
    if (sinceId) {
        queryString += `&sinceId=${sinceId}`;
    }
    if (ids) {
        queryString += `&ids=${ids}`;
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
        const doc: TDoc = {};

        for (const [key, value] of Object.entries(entry.doc)) {
            if (arFields.length > 0 && !arFields.includes(key)) {
                continue;
            }

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

        return {
            id: entry.id,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
            doc
        };
    });

    return output;
}