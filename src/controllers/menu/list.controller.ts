import { TErrorResponse, TMenuOutput, TMenu, TItemOutput, TSection, TItem, TDoc, TFile, TTranslation, TContent } from "@/types/types";

function isErrorMenus(data: TErrorResponse | {menus: TMenu[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorItems(data: TErrorResponse | {items: TItem[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorTranslations(data: TErrorResponse | {translations: TTranslation[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorSections(data: TErrorResponse | {sections: TSection[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorContent(data: TErrorResponse | {content: TContent}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

type TPayload = {
    limit: number|string;
    page: number|string;
    languages: {code:string, primary:boolean}[];
    depthLevel: number
}

export async function List({userId, projectId, code}: {userId:string, projectId:string, code:string}, payload: TPayload): Promise<TMenuOutput[]> {
    const {limit, page, languages, depthLevel=1} = payload;
    
    const resFetchMenus = await fetch(`${process.env.URL_MENU_SERVICE}/api/menus?userId=${userId}&projectId=${projectId}&code=${code}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const dataFetchMenus: TErrorResponse|{menus: TMenu[]} = await resFetchMenus.json();
    if (isErrorMenus(dataFetchMenus)) {
        throw new Error('Error menus');
    }
    if (!dataFetchMenus.menus.length) {
        throw new Error('Menu not exist');
    }

    const menu = dataFetchMenus.menus[0];

    const fieldsMenu = menu.items.fields.reduce((acc: {[key:string]:{type:string}}, b) => {
        acc[b.key] = {type: b.type};
        return acc;
    }, {});

    const items: TItemOutput[] = await getItems();

    return items;

    async function getItems(id:string|null=null, ref?: {subject:string|null, subjectId: string|null}): Promise<TItemOutput[]> {
        if (ref && ref.subject === 'content') {
            const resFetchContent = await fetch(`${process.env.URL_CONTENT_SERVICE}/api/contents/${ref.subjectId}?userId=${userId}&projectId=${projectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchContent: TErrorResponse|{content: TContent} = await resFetchContent.json();
            if (isErrorContent(dataFetchContent)) {
                throw new Error('Content Invalid');
            }

            const content = dataFetchContent.content;

            const fieldsContent = content.sections.fields.reduce((acc: {[key:string]:{type:string}}, b) => {
                acc[b.key] = {type: b.type};
                return acc;
            }, {});

            let queryString = `${process.env.URL_CONTENT_SERVICE}/api/sections?userId=${userId}&projectId=${projectId}&contentId=${ref.subjectId}&limit=${limit}&page=${page}`;
            if (id) {
                queryString += '&parent_id='+id;
            }
            const resFetchSections = await fetch(queryString, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchSections: TErrorResponse|{sections: TSection[]} = await resFetchSections.json();
            if (isErrorSections(dataFetchSections)) {
                throw new Error('Error sections');
            }

            const output:TItemOutput[] = [];
    
            for (let section of dataFetchSections.sections) {
                const doc: TDoc = {};
                const fileKeys: string[] = [];
    
                for (const [key, value] of Object.entries(section.doc)) {
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

                const translations = await getTranslationsSection(
                    {enabled: content.translations?.enabled, fileKeys, section},
                    {userId, projectId, contentId: content.id, sectionId: section.id}
                );

                output.push({
                    id: section.id,
                    doc,
                    ...translations,
                    items: await getItems(section.id, {subject: ref.subject, subjectId: ref.subjectId})
                });
            }
    
            return output;
        } else {
            let queryString = `${process.env.URL_MENU_SERVICE}/api/items?userId=${userId}&projectId=${projectId}&menuId=${menu.id}&limit=${limit}&page=${page}`;
            if (id) {
                queryString += '&parent_id='+id;
            }
            const resFetchItems = await fetch(queryString, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const dataFetchItems: TErrorResponse|{items: TItem[]} = await resFetchItems.json();
            if (isErrorItems(dataFetchItems)) {
                throw new Error('Error items');
            }
    
            const output:TItemOutput[] = [];
    
            for (let item of dataFetchItems.items) {
                const doc: TDoc = {};
                const fileKeys: string[] = [];
    
                for (const [key, value] of Object.entries(item.doc)) {
                    if (fieldsMenu[key].type === 'file_reference' && value) {
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
                    else if (fieldsMenu[key].type === 'list.file_reference' && value) {
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
                    {enabled: menu.translations?.enabled, fileKeys, item},
                    {userId, projectId, menuId: menu.id, itemId: item.id}
                );
    
                const items = !item.subjectId ? await getItems(item.id, {subject: item.subject, subjectId: item.subjectId}) :  await getItems(null, {subject: item.subject, subjectId: item.subjectId});
                output.push({
                    id: item.id,
                    ref: !!item.subject,
                    doc,
                    ...translations,
                    items
                });
            }
    
            return output;
        }
    }
}



type TPropsTranslation = {
    enabled: boolean;
    item: TItem;
    fileKeys: string[];
}
type TPropsPayloadTranslation = {
    userId: string;
    projectId: string; 
    menuId: string; 
    itemId: string; 
}
async function getTranslations({enabled, fileKeys, item}: TPropsTranslation, {userId, projectId, menuId, itemId}: TPropsPayloadTranslation) {
    try {
        const translations: any = {};

        if (!enabled) {
            return translations;
        }

        const resFetchTranslations = await fetch(`${process.env.URL_MENU_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&menuId=${menuId}&subjectId=${itemId}&subject=item`, {
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
            const resFetchTranslations = await fetch(`${process.env.URL_MENU_SERVICE}/api/translations?userId=${userId}&projectId=${projectId}&menuId=${menuId}&subject=file&key=${key}`, {
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
                        const index: number = item.doc[key].findIndex((v: TFile) => v.id === t.subjectId);
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






type TPropsTranslationSection = {
    enabled: boolean;
    section: TSection;
    fileKeys: string[];
}
type TPropsPayloadTranslationSection = {
    userId: string;
    projectId: string; 
    contentId: string; 
    sectionId: string; 
}
async function getTranslationsSection({enabled, fileKeys, section}: TPropsTranslationSection, {userId, projectId, contentId, sectionId}: TPropsPayloadTranslationSection) {
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