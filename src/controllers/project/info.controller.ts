import { TErrorResponse, TFile, TProject } from '@/types/types';

function isErrorProject(data: TErrorResponse | {project: TProject, files: TFile[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error; 
}

export async function Info({userId, projectId}: {userId:string, projectId:string}) {
    const resFetchProject = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const dataFetchProject: TErrorResponse|{project: TProject, files: TFile[]} = await resFetchProject.json();
    if (isErrorProject(dataFetchProject)) {
        throw new Error('Project Invalid');
    }

    const {project, files} = dataFetchProject;

    return {
        id: project.id,
        name: project.name,
        currencies: project.currencies,
        languages: project.languages,
        front: {
            title: project.front.title,
            logo: files[0]
        }
    };
}