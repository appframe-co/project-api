import { Request, Response, NextFunction } from 'express'
import { RoutesInput, TErrorResponse, TProject } from '@/types/types'

function isErrorProjects(data: TErrorResponse|{projects: TProject[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error;
}

const versions = ['2023-07'];

export default ({ app }: RoutesInput) => {
    app.use((req, res, next) => {
        if (!req.accepts('application/json')) {
            return res.status(406).json({ error: 'invalid_request'});
        }
        if (req.is('application/json') === false) {
            return res.status(400).json({ error: 'invalid_request'});
        }

        next();
    });

    app.use((req, res, next) => {
        const arUrl = req.originalUrl.split('/');
        const versionFromUrl = arUrl[1];

        const indexVersion = versions.indexOf(versionFromUrl);
        const version = (indexVersion === -1) ? versions[0]: versions[indexVersion];

        res.header('X-Powered-By', 'AppFrame');
        res.header('X-AppFrame-API-Version', version);

        next();
    });

    app.use(async function (req: Request, res: Response, next: NextFunction): Promise<void| Response> {
        try {
            const token = req.headers['x-appframe-project-access-token'] as string;
            if (!token) {
                return res.status(401).json({message: 'Invalid access token'});
            }

            const resFetch = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/projects?token=${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data: TErrorResponse|{projects: TProject[]} = await resFetch.json();
            if (isErrorProjects(data)) {
                throw new Error('Invalid projects');
            }

            const {trialFinishedAt, planFinishedAt} = data.projects[0];

            const trialFinishedAtTimestamp = new Date(trialFinishedAt).getTime();
            const planFinishedAtTimestamp = new Date(planFinishedAt).getTime();

            const now = Date.now();
            if (now > trialFinishedAtTimestamp) {
                if (now > planFinishedAtTimestamp) {
                    return res.json({error: 'plan_expired', description: `Plan expired. Please, upgrade your plan.`});
                }
            }

            const {userId, id} = data.projects[0];

            res.locals.userId = userId;
            res.locals.projectId = id;
            res.locals.languages = data.projects[0].languages;

            next();
        } catch(err) {
            next(err);
        }
    });

    for (const version of versions) {
        const entries = require('./'+version+'/entries.route');
        const sections = require('./'+version+'/sections.route');
        const items = require('./'+version+'/items.route');
        const project = require('./'+version+'/project.route');

        app.use(`/${version}/entries`, entries.default);
        app.use(`/${version}/sections`, sections.default);
        app.use(`/${version}/items`, items.default);
        app.use(`/${version}/project`, project.default);
    }
};