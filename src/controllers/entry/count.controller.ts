import { TErrorResponse, TContent } from '@/types/types';

function isErrorContents(data: TErrorResponse | {contents: TContent[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorEntriesCount(data: TErrorResponse | {count: number}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

export async function Count({userId, projectId, code}: {userId:string, projectId:string, code:string}) {
    let contentId: string;
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
        }

        let count: number;
        {
            const resFetchCount = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/entries/count?userId=${userId}&projectId=${projectId}&contentId=${contentId}`, {
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

    return count;
}