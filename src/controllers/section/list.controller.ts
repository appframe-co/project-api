import { TErrorResponse, TItemOutput, TSection, TDoc, TFile, TTranslation, TContent, TSectionOutput } from "@/types/types";
import { convertHTMLToObj } from "@/utils/convert-html-to-obj";

function isErrorContents(data: TErrorResponse | {contents: TContent[]}): data is TErrorResponse {
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
    depthLevel: number;
    sectionId: string|null;
    sectionCode: string|null;
}

export async function List({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<{sections: TSectionOutput[], parent: TSectionOutput|null}> {
    try {
        const {limit, page, depthLevel=1, sectionCode} = payload;
        let {sectionId} = payload;

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
     
        const fieldsContent = content.sections.fields.reduce((acc: {[key:string]:{type:string}}, b) => {
            acc[b.key] = {type: b.type};
            return acc;
        }, {});

        if (!sectionId && sectionCode) {
            const resFetchSections = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/sections?userId=${userId}&projectId=${projectId}&contentId=${content.id}&section_code=${sectionCode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchSections: TErrorResponse|{sections: TSection[], parent: TSection|null} = await resFetchSections.json();
            if (!isErrorSections(dataFetchSections)) {
                const section = dataFetchSections.sections[0];
                if (section) {
                    sectionId = section.id;
                }
            }
        }

        let counterDepthLvl = 1;
        let parent: TSectionOutput|null = null;
        const sections: TSectionOutput[] = await getSections(sectionId);

        return {sections, parent};

        async function getSections(id:string|null=null): Promise<TSectionOutput[]> {
            if (counterDepthLvl > depthLevel) {
                return [];
            }

            let queryString = `${process.env.URL_CONTENT_SERVICE}/api/sections?userId=${userId}&projectId=${projectId}&contentId=${content.id}&limit=${limit}&page=${page}`;
            if (id) {
                queryString += '&parent_id='+id;
            }
            const resFetchSections = await fetch(queryString, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchSections: TErrorResponse|{sections: TSection[], parent: TSection|null} = await resFetchSections.json();
            if (isErrorSections(dataFetchSections)) {
                throw new Error('Error sections');
            }

            if (counterDepthLvl === 1 && dataFetchSections.parent) {
                parent = {
                    id: dataFetchSections.parent.id,
                    parentId: dataFetchSections.parent.parentId,
                    doc: dataFetchSections.parent.doc,
                };
            }
            counterDepthLvl++;

            const output:TSectionOutput[] = [];

            for (let section of dataFetchSections.sections) {
                const doc: TDoc = {};
                const fileKeys: string[] = [];
                for (const [key, value] of Object.entries(section.doc)) {
                    if (fieldsContent[key] === undefined || fieldsContent[key] ===  null) {
                        continue;
                    }

                    if (fieldsContent[key].type === 'rich_text' && value) {
                        doc[key] = {
                            html: value,
                            nodes: convertHTMLToObj(value)
                        };
                    }
                    else if (fieldsContent[key].type === 'file_reference' && value) {
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

                const translations = await getTranslationsSection(
                    {enabled: content.translations?.enabled, fileKeys, section, fieldsContent},
                    {userId, projectId, contentId: content.id, sectionId: section.id}
                );

                output.push({
                    id: section.id,
                    doc,
                    ...translations,
                    sections: await getSections(section.id)
                });
            }
    
            return output;
        }
    } catch(e) {
        return {sections: [], parent: null};
    }
}


type TPropsTranslationSection = {
    enabled: boolean;
    section: TSection;
    fileKeys: string[];
    fieldsContent: any;
}
type TPropsPayloadTranslationSection = {
    userId: string;
    projectId: string; 
    contentId: string; 
    sectionId: string; 
}
async function getTranslationsSection({enabled, fileKeys, section, fieldsContent}: TPropsTranslationSection, {userId, projectId, contentId, sectionId}: TPropsPayloadTranslationSection) {
    try {
        const translations: any = {};

        if (!enabled) {
            return translations;
        }

        const resFetchTranslations = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&contentId=${contentId}&subjectId=${sectionId}&subject=section`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dataFetchTranslations: TErrorResponse|{translations: TTranslation[]} = await resFetchTranslations.json();
        if (!isErrorTranslations(dataFetchTranslations)) {
            dataFetchTranslations.translations.forEach(t => {
                translations['doc_' + t.lang] = {};
                for (const [key, value] of Object.entries(t.value)) {
                    if (fieldsContent[key].type === 'rich_text' && value) {
                        translations['doc_' + t.lang][key] = {
                            html: value,
                            nodes: convertHTMLToObj(value)
                        };
                    } else {
                        translations['doc_' + t.lang][key] = value;
                    }
                }
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
                        const index: number = section.doc[key].findIndex((v: TFile) => v.id === t.subjectId);
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