import { TErrorResponse, TStructure } from '@/types/types';

function isErrorStructures(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorEntriesCount(data: TErrorResponse | {count: number}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

export async function Count({userId, projectId, code}: {userId:string, projectId:string, code:string}) {
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

    return count;
}