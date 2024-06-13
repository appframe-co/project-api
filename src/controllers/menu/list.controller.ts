import { produce } from "immer";

import { TErrorResponse, TMenuOutput, TMenu, TItemOutput, TSection, TItem } from "@/types/types";

function isErrorMenus(data: TErrorResponse | {menus: TMenu[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}
function isErrorSections(data: TErrorResponse | {sections: TSection[]}): data is TErrorResponse {
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
    
    let queryString = `${process.env.URL_MENU_SERVICE}/api/menus?userId=${userId}&projectId=${projectId}&limit=${limit}&page=${page}`;
    const resFetchMenus = await fetch(queryString, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const dataFetchMenus: TErrorResponse|{menus: TMenu[]} = await resFetchMenus.json();
    if (isErrorMenus(dataFetchMenus)) {
        throw new Error('Error menus');
    }

    const output: TMenuOutput[] = [];
    for (let menu of dataFetchMenus.menus) {
        const items: TItemOutput[] = [];

        for (let item of menu.items) {
            const nestedItems: TItemOutput[] = [];

            if (item.type === 'ref') {
                if (item.subject === 'structure') {
                    const resFetchSections = await fetch(`${process.env.URL_ENTRY_SERVICE}/api/sections?userId=${userId}&projectId=${projectId}&structureId=${item.subjectId}&limit=50&page=1&depth_level=${depthLevel}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const dataFetchSections: TErrorResponse|{sections: TSection[]} = await resFetchSections.json();
                    if (isErrorSections(dataFetchSections)) {
                        throw new Error('Error sections');
                    }

                    for (let section of dataFetchSections.sections) {
                       const s:TItemOutput = {
                            type: 'http',
                            title: section.doc.name,
                            url: item.url + '/' + section.doc.code,
                            items: []
                        };

                        if (depthLevel > 1) {
                            if (!section.sections) {
                                continue;
                            }

                            for (let section2 of section.sections) {
                                const s2:TItemOutput = {
                                    type: 'http',
                                    title: section2.doc.name,
                                    url: item.url + '/' + section.doc.code + '/' + section2.doc.code,
                                    items: []
                                };

                                if (depthLevel > 2) {
                                    if (!section2.sections) {
                                        continue;
                                    }
                                    for (let section3 of section2.sections) {
                                        s2.items.push({
                                            type: 'http',
                                            title: section3.doc.name,
                                            url: item.url + '/' + section.doc.code + '/' + section2.doc.code + '/' + section3.doc.code,
                                            items: []
                                        });
                                    }
                                }
    
                                s.items.push(s2);
                            }
                        }

                        nestedItems.push(s);
                    }
                }
            }

            items.push({
                type: item.type,
                title: item.title,
                url: item.url,
                items: nestedItems
            });
        }

        output.push({
            id: menu.id,
            handle: menu.handle,
            items
        });
    }

    return output;
}