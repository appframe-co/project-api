import { TAlert, TEntry, TEntryInput, TEntryOutput, TErrorResponse, TStructure } from '@/types/types';

type TPayload = {
    entry: TEntryInput;
}

function isErrorAlert(data: TErrorResponse | {alert: TAlert}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
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

        let structureId: string, newAlert: {enabled: boolean, message: string}|undefined;
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
                newAlert = structure.notifications?.new.alert;
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
            if (newAlert && newAlert.enabled) {
                const resFetch = await fetch(`${process.env.URL_NOTIFICATION_SERVICE}/api/alerts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({userId, projectId, structureId, subjectId: data.entry.id, subjectType: 'entries', message: newAlert.message})
                });
                const dataJson: TErrorResponse|{alert:TAlert} = await resFetch.json();
                if (!isErrorAlert(dataJson)) {
                    const resFetch = await fetch(`${process.env.URL_WEBHOOKS}/alert`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({alert: dataJson.alert})
                    });
                    resFetch.json();
                }
            }

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