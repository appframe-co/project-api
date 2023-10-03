import { TEntry, TEntryInput, TEntryOutput, TErrorResponse, TStructure,  } from '@/types/types';

type TPayload = {
    entry: TEntryInput;
}

function isErrorStructures(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

export async function CreateEntry({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<{entry: TEntryOutput|null, errors: any}> {
    try {
        const {entry} = payload;

        if (!entry || !Object.keys(entry).length) {
            throw new Error('entry invalid');
        }

        const doc = entry.doc;
        if (!doc || !Object.keys(doc).length) {
            throw new Error('doc invalid');
        }

        let structureId: string;
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
            }

        const resFetch = await fetch(`${process.env.URL_ENTRY_SERVICE}/api/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify({userId, projectId, structureId, doc})
        });
        const data: {entry: TEntry|null, userErrors: any} = await resFetch.json();
        if (data.entry) {
            const entry: TEntryOutput = {
                id: data.entry.id,
                created_at: data.entry.createdAt,
                updated_at: data.entry.updatedAt,
                doc: data.entry.doc
            };
    
            return {entry, errors: data.userErrors};
        }
    
        return {entry: null, errors: data.userErrors};
    } catch(e) {
        let message = 'error';
        if (e instanceof Error) {
            message = e.message
        }

        return {entry: null, errors: message};
    }
}