import { Request, Response, NextFunction } from 'express';
import { RoutesInput, TErrorResponse, TProject } from '@/types/types'
import structure from './structure.route'

function isErrorProjects(data: TErrorResponse|{projects: TProject[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error;
}

export default ({ app }: RoutesInput) => {
    app.use(async function (req: Request, res: Response, next: NextFunction): Promise<void| Response> {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            if (!apiKey) {
                return res.status(401).json({message: 'Invalid API key'});
            }

            const resFetch = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/projects?token=${apiKey}`, {
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

            next();
        } catch(err) {
            next(err);
        }
    });

    app.use('/api/structures', structure);
};