import { TDoc, TEntry, TErrorResponse, TFile, TContent, TEntryOutput, TTranslation, TTranslationOutput, TSection } from "@/types/types";
import { convertHexToRgb } from "@/utils/convert-hex-to-rgb";
import { convertHTMLToObj } from "@/utils/convert-html-to-obj";

function isErrorContents(data: TErrorResponse | {contents: TContent[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorEntries(data: TErrorResponse | {entries: TEntry[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorTranslations(data: TErrorResponse | {translations: TTranslation[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorSections(data: TErrorResponse | {sections: TSection[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

type TPayload = {
    limit: number|string;
    page: number|string;
    sinceId: string;
    fields: string;
    ids: string;
    sectionCode: string|null;
    translations: string;
    doc: {[key:string]: string};
}

type TOutput = {
    entries: TEntryOutput[];
    translations?: TTranslationOutput[];
}

export async function List({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<TOutput> {
    const {limit, page, sinceId, fields, ids, sectionCode, translations, doc} = payload;

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
    
    const fieldsContent = content.entries.fields.reduce((acc: {[key:string]:{type:string, unit?:string}}, b) => {
        acc[b.key] = {type: b.type, unit: b.unit};
        return acc;
    }, {});

    let sectionId;
    if (sectionCode) {
        const resFetchSections = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/sections?userId=${userId}&projectId=${projectId}&contentId=${content.id}&section_code=${sectionCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dataFetchSections: TErrorResponse|{sections: TSection[], parent: TSection|null} = await resFetchSections.json();
        if (isErrorSections(dataFetchSections)) {
           return {entries: []};
        }
        if (!dataFetchSections.sections.length) {
            return {entries: []};
         }
         
        const section = dataFetchSections.sections[0];
        if (section) {
            sectionId = section.id;
        }
    }

    let queryString = `${process.env.URL_CONTENT_SERVICE}/api/entries?userId=${userId}&projectId=${projectId}&contentId=${content.id}&limit=${limit}&page=${page}${sectionId ? '&section_id='+sectionId : ''}`;
    if (sinceId) {
        queryString += `&sinceId=${sinceId}`;
    }
    if (ids) {
        queryString += `&ids=${ids}`;
    }

    for (let [key, value] of Object.entries(doc)) {
        queryString += `&${key}=${value}`;
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

    const fileTypes = ['file_reference', 'list.file_reference'];
    let fileIds: string[] = [];
    const entryIds: string[] = [];

    const output: TOutput = {entries: []};

    for (let entry of dataFetchEntries.entries) {
        const doc: TDoc = {};

        for (const [key, value] of Object.entries(entry.doc)) {
            if (arFields.length > 0 && !arFields.includes(key)) {
                continue;
            }

            doc[key] = getField(fieldsContent[key].type, fieldsContent[key].unit, value);

            if (fileTypes.includes(fieldsContent[key].type)) {
                if (Array.isArray(value)) {
                    fileIds = [...fileIds, ...(value as TFile[]).map(v => v.id)];
                } else {
                    fileIds = [...fileIds, (value as TFile).id];
                }
            }
        }

        entryIds.push(entry.id);

        output.entries.push({
            id: entry.id,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
            doc
        });
    }

    if (translations === 'y' && content.translations?.enabled) {
        output.translations = [];

        const resFetchTranslations = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/translations/ids?userId=${userId}&projectId=${projectId}&contentId=${content.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({entryIds, fileIds})
        });
        const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
        if (!isErrorTranslations(dataFetchTranslations)) {
            dataFetchTranslations.translations.forEach(t => {
                const doc: TDoc = {};
                for (const [key, value] of Object.entries(t.value)) {
                    if (arFields.length > 0 && !arFields.includes(key)) {
                        continue;
                    }
                    if (t.subject === 'entry') {
                        doc[key] = getField(fieldsContent[key].type, fieldsContent[key].unit, value);
                    } else {
                        doc[key] = value;
                    }
                }

                output.translations?.push({
                    id: t.id,
                    subjectId: t.subjectId,
                    subject: t.subject,
                    key: t.key,
                    lang: t.lang,
                    created_at: t.createdAt,
                    doc
                });
            });
        }
    }

    return output;
}

function getField(type:string, unit: string|undefined, value:any): any {
    if (!value) {
        return null;
    }
 
    if (type === 'rich_text') {
        return {
            html: value,
            nodes: convertHTMLToObj(value)
        };
    }
    
    if (type === 'file_reference') {
        return {
            width: value.width,
            height: value.height,
            contentType: value.contentType,
            src: value.src,
            alt: value.alt
        };
    }
    
    if (type === 'list.file_reference') {
        return value.map((file: TFile) => ({
            width: file.width,
            height: file.height,
            contentType: file.contentType,
            src: file.src,
            alt: file.alt
        }));
    }
    
    if (type === 'color') {
        return {
            hex: value,
            rgb: convertHexToRgb(value)
        };
    }
    
    if (type === 'list.color') {
        return value.map((v: string) => ({
            hex: v,
            rgb: convertHexToRgb(v)
        }));
    }

    if ((type === 'dimension' || type === 'volume' || type === 'weight')) {
        return {
            value,
            unit
        };
    }
    
    if ((type === 'list.dimension' || type === 'list.volume' || type === 'list.weight')) {
        return value.map((v: string) => ({
            value: v,
            unit
        }));
    }

    return value;
}