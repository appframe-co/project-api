import { TDoc, TEntry, TErrorResponse, TFile, TContent, TEntryOutput, TTranslation } from "@/types/types";

function isErrorContents(data: TErrorResponse | {contents: TContent[]}): data is TErrorResponse {
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
    
    const fieldsContent = content.entries.fields.reduce((acc: {[key:string]:{type:string}}, b) => {
        acc[b.key] = {type: b.type};
        return acc;
    }, {});

    let queryString = `${process.env.URL_CONTENT_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&contentId=${content.id}&limit=${limit}&page=${page}`;
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

    const output = [];
    for (let entry of dataFetchEntries.entries) {
        const doc: TDoc = {};
        const fileKeys: string[] = [];

        for (const [key, value] of Object.entries(entry.doc)) {
            if (arFields.length > 0 && !arFields.includes(key)) {
                continue;
            }

            if (fieldsContent[key].type === 'file_reference' && value) {
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
            else if (fieldsContent[key].type === 'list.file_reference' && value) {
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
            {enabled: content.translations?.enabled, languages, fileKeys, doc, entry},
            {userId, projectId, contentId: content.id, entryId: entry.id}
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
    contentId: string; 
    entryId: string; 
}
async function getTranslations({enabled, languages, fileKeys, doc, entry}: TPropsTranslation, {userId, projectId, contentId, entryId}: TPropsPayloadTranslation) {
    try {
        const translations: any = {};

        if (!enabled) {
            return translations;
        }

        const resFetchTranslations = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&contentId=${contentId}&subjectId=${entryId}&subject=entry`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
        if (!isErrorTranslations(dataFetchTranslations)) {
            dataFetchTranslations.translations.forEach(t => {
                translations['doc_' + t.lang] = {
                    ...translations['doc_' + t.lang],
                    ...t.value
                };
            });
        }

        // File (ref field)
        for (let key of fileKeys) {
            const resFetchTranslations = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&contentId=${contentId}&subject=file&key=${key}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
            if (!isErrorTranslations(dataFetchTranslations)) {
                dataFetchTranslations.translations.forEach(t => {
                    if (translations['doc_' + t.lang] && !Array.isArray(translations['doc_' + t.lang][key])) {
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
                });
            }
        }

        return translations;
    } catch (e) {
        return {};
    }
}
