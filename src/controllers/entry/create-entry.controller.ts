import { TAlert, TEntry, TEntryInput, TEntryOutput, TErrorResponse, TContent } from '@/types/types';

type TPayload = {
    entry: TEntryInput;
}

function isErrorAlert(data: TErrorResponse | {alert: TAlert}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorContents(data: TErrorResponse | {contents: TContent[]}): data is TErrorResponse {
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

        let contentId: string, newAlert: {enabled: boolean, message: string}|undefined;
            {
                const resFetchContents = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/contents?userId=${userId}&projectId=${projectId}&code=${code}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const dataFetchContents: TErrorResponse|{contents: TContent[]} = await resFetchContents.json();
                if (isErrorContents(dataFetchContents)) {
                    throw new Error('Content Invalid');
                }
                if (!dataFetchContents.contents.length) {
                    throw new Error('Content not exist');
                }
    
                const content = dataFetchContents.contents[0];
                contentId = content.id;
                newAlert = content.notifications?.new.alert;
            }

        const resFetch = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify({userId, projectId, contentId, doc})
        });
        const data: {entry: TEntry|null, userErrors: any} = await resFetch.json();
        if (data.entry) {
            if (newAlert && newAlert.enabled) {
                const resFetch = await fetch(`${process.env.URL_NOTIFICATION_SERVICE}/api/alerts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({userId, projectId, contentId, subjectId: data.entry.id, subjectType: 'entries', message: newAlert.message})
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