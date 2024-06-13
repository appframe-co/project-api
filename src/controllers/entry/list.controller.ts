import { produce } from "immer";

import { TDoc, TEntry, TErrorResponse, TFile, TStructure, TEntryOutput, TTranslation } from "@/types/types";

function isErrorStructures(data: TErrorResponse | {structures: TStructure[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

function isErrorEntries(data: TErrorResponse | {entries: TEntry[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

function isErrorTranslations(data: TErrorResponse | {translations: TTranslation[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

type TPayload = {
    limit: number|string;
    page: number|string;
    sinceId: string;
    fields: string;
    ids: string;
    languages: {code:string, primary:boolean}[];
}

export async function List({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<TEntryOutput[]> {
    const {limit, page, sinceId, fields, ids, languages} = payload;

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


    const output = [];
    for (let entry of dataFetchEntries.entries) {
        const doc: TDoc = {};
        const fileKeys: string[] = [];

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

                fileKeys.push(key);
            }
            else if (bricks[key].type === 'list.file_reference' && value) {
                doc[key] = value.map((file: TFile) => {
                    return {
                        width: file.width,
                        height: file.height,
                        contentType: file.contentType,
                        src: file.src,
                        alt: file.alt
                    }
                });

                fileKeys.push(key);
            }
            else {
                doc[key] = value;
            }
        }


        const translations = await getTranslations(
            {enabled: structure.translations.enabled, languages, fileKeys, doc, entry},
            {userId, projectId, structureId: structure.id, entryId: entry.id}
        );

        output.push({
            id: entry.id,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
            doc,
            ...translations
        });
    }

    return output;
}


type TPropsTranslation = {
    enabled: boolean;
    languages: {code:string, primary:boolean}[];
    doc: any;
    entry: TEntry;
    fileKeys: string[];
}
type TPropsPayloadTranslation = {
    userId: string;
    projectId: string; 
    structureId: string; 
    entryId: string; 
}
async function getTranslations({enabled, languages, fileKeys, doc, entry}: TPropsTranslation, {userId, projectId, structureId, entryId}: TPropsPayloadTranslation) {
    try {
        const translations: any = {};

        if (!enabled) {
            return translations;
        }

        languages.forEach(lang => translations['doc_' + lang.code] = produce(doc, (draft: any) => draft));

        // Entry
        const resFetchTranslations = await fetch(`${process.env.URL_ENTRY_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&structureId=${structureId}&subjectId=${entryId}&subject=entry`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
        if (!isErrorTranslations(dataFetchTranslations)) {
            dataFetchTranslations.translations.forEach(t => {
                if (translations.hasOwnProperty('doc_' + t.lang)) {
                    translations['doc_' + t.lang] = {
                        ...translations['doc_' + t.lang],
                        ...t.value
                    };
                }
            });
        }

        // File (ref brick)
        for (let key of fileKeys) {
            const resFetchTranslations = await fetch(`${process.env.URL_ENTRY_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&structureId=${structureId}&subject=file&key=${key}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
            if (!isErrorTranslations(dataFetchTranslations)) {
                dataFetchTranslations.translations.forEach(t => {
                    if (translations.hasOwnProperty('doc_' + t.lang)) {
                        if (!Array.isArray(translations['doc_' + t.lang][key])) {
                            translations['doc_' + t.lang] = {
                                ...translations['doc_' + t.lang],
                                [key]: {
                                    ...translations['doc_' + t.lang][key],
                                    ...t.value
                                }
                            }
                        } else {
                            const index: number = entry.doc[key].findIndex((v: TFile) => v.id === t.subjectId);
                            if (index !== -1) {
                                const arr = translations['doc_' + t.lang][key].map((f:any, i: number)=> {
                                    if (i === index) {
                                        return {
                                            ...f, 
                                            ...t.value
                                        }
                                    }
                                    return {
                                        ...f
                                    }
                                })

                                translations['doc_' + t.lang] = {
                                    ...translations['doc_' + t.lang],
                                    [key]: arr
                                };
                            }
                        }

                   }
                });
            }
        }

        return translations;
    } catch (e) {
        return {};
    }
}
